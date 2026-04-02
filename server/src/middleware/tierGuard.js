const { TenantContext } = require('../utils/tenantContext');
const { getRedisClient } = require('../config/redisClient');
const Tenant = require('../models/Tenant');
const modelProvider = require('../utils/modelProvider');

const TIER_LIMITS = {
    free:       { maxProjects: 3,  maxUsers: 5,  maxTasks: 10 },
    premium:    { maxProjects: 20, maxUsers: 25, maxTasks: 200 },
    enterprise: { maxProjects: -1, maxUsers: -1, maxTasks: -1 },
};

const UPGRADE_MESSAGES = {
    projects: {
        free:    'Upgrade to Premium for up to 20 projects',
        premium: 'Upgrade to Enterprise for unlimited projects',
    },
    users: {
        free:    'Upgrade to Premium for up to 25 users',
        premium: 'Upgrade to Enterprise for unlimited users',
    },
    tasks: {
        free:    'Upgrade to Premium for up to 200 tasks',
        premium: 'Upgrade to Enterprise for unlimited tasks',
    },
};

const MODEL_MAP = {
    projects: 'Project',
    users:    'User',
    tasks:    'Task',
};

/**
 * Get tenant tier — checks Redis cache first (60s TTL), then MongoDB.
 */
async function getTenantTier(tenantId) {
    // Superadmin ('system') always has unlimited enterprise access
    if (tenantId === 'system') return 'enterprise';

    const cacheKey = `tier_cache:${tenantId}`;
    try {
        const redis = getRedisClient();
        if (redis && redis.status === 'ready') {
            const cached = await redis.get(cacheKey);
            if (cached) return cached;
        }
    } catch (_) { /* Redis unavailable — fall through to DB */ }

    const tenant = await Tenant.findOne({ tenantId }).lean();
    const tier = tenant?.plan || 'free';

    try {
        const redis = getRedisClient();
        if (redis && redis.status === 'ready') {
            await redis.setex(cacheKey, 60, tier);
        }
    } catch (_) { /* ignore */ }

    return tier;
}

/**
 * Middleware factory: checkLimit('projects' | 'users' | 'tasks')
 */
const checkLimit = (resourceType) => async (req, res, next) => {
    try {
        const tenantId = TenantContext.getTenantId();
        const tier = await getTenantTier(tenantId);
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
        const maxAllowed = limits[`max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`];

        // Enterprise / unlimited — always allow
        if (maxAllowed === -1) return next();

        const modelName = MODEL_MAP[resourceType];
        if (!modelName) return next(); // Unknown resource — don't block

        let currentCount = 0;
        await TenantContext.run(tenantId, async () => {
            const Model = await modelProvider.getModel(modelName);
            currentCount = await Model.countDocuments({ tenant_id: tenantId });
        });

        if (currentCount >= maxAllowed) {
            const upgradeMessage =
                UPGRADE_MESSAGES[resourceType]?.[tier] ||
                'Contact your administrator to upgrade your plan';

            return res.status(403).json({
                error: 'Tier limit reached',
                resource: resourceType,
                current: currentCount,
                limit: maxAllowed,
                tier,
                upgradeMessage,
            });
        }

        next();
    } catch (error) {
        console.error('[tierGuard] Error checking limit:', error.message);
        // Fail open on unexpected errors to avoid blocking legitimate requests
        next();
    }
};

module.exports = { checkLimit, TIER_LIMITS };
