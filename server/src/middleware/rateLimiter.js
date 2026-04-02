const { getRedisClient } = require('../config/redisClient');
const { TenantContext } = require('../utils/tenantContext');

const RATE_LIMIT_TIERS = {
    free: { windowMs: 60 * 1000, max: 20 },
    premium: { windowMs: 60 * 1000, max: 100 },
    enterprise: { windowMs: 60 * 1000, max: 1000 },
    default: { windowMs: 60 * 1000, max: 50 },
};

async function getTenantTier(tenantId) {
    const redis = getRedisClient();
    const cacheKey = `tier_cache:${tenantId}`;

    // 1. Try Redis cache for performance
    try {
        if (redis && redis.status === 'ready') {
            const cachedTier = await redis.get(cacheKey);
            if (cachedTier) return cachedTier;
        }
    } catch (e) { /* Redis failover to DB */ }

    // 2. Try MongoDB Tenant model (Master Record)
    try {
        const Tenant = require('../models/Tenant');
        const tenant = await Tenant.findOne({ tenantId });
        if (tenant && tenant.plan) {
            // Set Redis cache for 10 minutes
            if (redis && redis.status === 'ready') {
                await redis.setex(cacheKey, 600, tenant.plan);
            }
            return tenant.plan;
        }
    } catch (e) { /* DB failure — fallback to .env */ }

    // 3. Fallback to Environment Variable or Default
    return process.env[`TENANT_${tenantId.toUpperCase()}_TIER`] || 'free';
}

// In-Memory Fallback Map
const fallbackLimiters = new Map();

class TenantRateLimiter {
    static async middleware(req, res, next) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId) return next();

        const tier = await getTenantTier(tenantId);
        const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.default;
        const now = Date.now();

        try {
            const redis = getRedisClient();
            if (!redis || redis.status !== 'ready') {
                throw new Error('Redis not ready');
            }

            const key = `ratelimit:${tenantId}`;
            const windowStart = now - config.windowMs;

            const multi = redis.multi();
            multi.zremrangebyscore(key, 0, windowStart);
            multi.zadd(key, now, `${now}-${Math.random()}`);
            multi.zcard(key);
            multi.expire(key, Math.ceil(config.windowMs / 1000));

            const results = await multi.exec();
            const requestCount = results[2][1];

            res.setHeader('X-RateLimit-Limit', config.max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - requestCount));
            res.setHeader('X-RateLimit-Reset', new Date(now + config.windowMs).toISOString());
            res.setHeader('X-RateLimit-Tier', tier);

            if (requestCount > config.max) {
                const retryAfter = Math.ceil(config.windowMs / 1000);
                res.setHeader('Retry-After', retryAfter);
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: `Too many requests. Limit: ${config.max} requests per ${config.windowMs / 1000}s`,
                    tenant: tenantId,
                    tier,
                    retryAfter,
                });
            }

            next();
        } catch (error) {
            console.warn(`[WARNING] Rate Limiter fallback mode active for tenant: ${tenantId}. Redis is unreachable.`);
            
            // In-Memory Fallback Logic (Fail-Closed)
            let fallback = fallbackLimiters.get(tenantId);
            if (!fallback || fallback.expireAt < now) {
                fallback = { count: 0, expireAt: now + config.windowMs };
            }

            fallback.count++;
            fallbackLimiters.set(tenantId, fallback);

            res.setHeader('X-RateLimit-Limit', config.max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - fallback.count));

            if (fallback.count > config.max) {
                const retryAfter = Math.ceil((fallback.expireAt - now) / 1000);
                res.setHeader('Retry-After', retryAfter);
                return res.status(503).json({
                    error: 'Service Unavailable',
                    message: 'Rate limit fallback overwhelmed. Please try again later.',
                    retryAfter
                });
            }

            next();
        }
    }

    static async getStatus(tenantId) {
        const tier = await getTenantTier(tenantId);
        const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.default;

        try {
            const redis = getRedisClient();
            if (!redis || redis.status !== 'ready') throw new Error();
            const key = `ratelimit:${tenantId}`;
            const now = Date.now();
            const windowStart = now - config.windowMs;
            const count = await redis.zcount(key, windowStart, now);

            return { tenant: tenantId, tier, limit: config.max, current: count, remaining: Math.max(0, config.max - count), windowMs: config.windowMs, active: true };
        } catch (error) {
            // Read from fallback
            const fallback = fallbackLimiters.get(tenantId);
            const count = fallback && fallback.expireAt > Date.now() ? fallback.count : 0;
            return { tenant: tenantId, tier, limit: config.max, current: count, remaining: Math.max(0, config.max - count), windowMs: config.windowMs, active: true, fallbackMode: true };
        }
    }

    static async reset(tenantId) {
        fallbackLimiters.delete(tenantId);
        try {
            const redis = getRedisClient();
            await redis.del(`ratelimit:${tenantId}`);
        } catch (error) { /* Ignore */ }
        return { success: true, message: `Rate limit reset for tenant: ${tenantId}` };
    }
}

module.exports = { TenantRateLimiter, RATE_LIMIT_TIERS };
