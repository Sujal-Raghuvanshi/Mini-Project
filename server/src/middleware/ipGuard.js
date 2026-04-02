const Tenant = require('../models/Tenant');
const { getRedisClient } = require('../config/redisClient');

/**
 * IP Allowlisting Middleware
 * Enforces network-level restrictions per tenant.
 */
const ipGuard = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        if (!tenantId || tenantId === 'system') return next(); // No tenant context or Superadmin — skip

        const cacheKey = `ip_allowlist:${tenantId}`;
        let allowlist = [];

        // 1. Try Redis Cache
        try {
            const redis = getRedisClient();
            if (redis && redis.status === 'ready') {
                const cached = await redis.get(cacheKey);
                if (cached) allowlist = JSON.parse(cached);
                else {
                    // Cache miss — fetch from DB
                    const tenant = await Tenant.findOne({ tenantId }).lean();
                    allowlist = tenant?.ipAllowlist || [];
                    await redis.setex(cacheKey, 30, JSON.stringify(allowlist)); // 30s TTL
                }
            } else {
                // Redis offline — fallback to DB
                const tenant = await Tenant.findOne({ tenantId }).lean();
                allowlist = tenant?.ipAllowlist || [];
            }
        } catch (redisError) {
            // DB Fallback if Redis fails
            const tenant = await Tenant.findOne({ tenantId }).lean();
            allowlist = tenant?.ipAllowlist || [];
        }

        // 2. Allow all if list is empty
        if (allowlist.length === 0) return next();

        // 3. Get Client IP
        // Handle proxies (e.g. Heroku, AWS, Cloudflare)
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip)
                         .split(',')[0].trim();

        // Standardize IPv6 mapped IPv4 (::ffff:127.0.0.1)
        const cleanIp = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;

        // 4. Validate
        if (allowlist.includes(cleanIp) || allowlist.includes(clientIp)) {
            return next();
        }

        console.warn(`[IP Guard] Blocked unauthorized access to ${tenantId} from ${cleanIp}`);
        
        return res.status(403).json({
            error: 'IP not allowed',
            ip: cleanIp,
            tenant: tenantId,
            message: 'Your current network IP is not in the organization allowlist.'
        });

    } catch (error) {
        console.error('[IP Guard] Middleware Error:', error.message);
        next(); // Fail open on internal errors to prevent lockouts
    }
};

module.exports = { ipGuard };
