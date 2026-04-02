const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { superadminGuard } = require('../middleware/superadminGuard');
const { TenantContext } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const modelProvider = require('../utils/modelProvider');
const { getRedisClient } = require('../config/redisClient');

// All routes in this file are protected by superadminGuard
router.use(superadminGuard);

// ---------------------------------------------------------------------------
// GET /admin/tenants
// Returns all tenants with user/project counts for each
// ---------------------------------------------------------------------------
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await Tenant.find({}).lean();

        const enriched = await Promise.all(tenants.map(async (tenant) => {
            let userCount = 0;
            let projectCount = 0;

            try {
                await TenantContext.run(tenant.tenantId, async () => {
                    const UserModel = await modelProvider.getModel('User');
                    const ProjectModel = await modelProvider.getModel('Project');
                    userCount = await UserModel.countDocuments({ tenant_id: tenant.tenantId });
                    projectCount = await ProjectModel.countDocuments({ tenant_id: tenant.tenantId });
                });
            } catch (err) {
                // If a tenant context has no docs, swallow and return 0
            }

            return {
                tenantId: tenant.tenantId,
                name: tenant.name,
                tier: tenant.plan || 'free',
                status: tenant.status,
                userCount,
                projectCount,
                onboardedAt: tenant.createdAt,
            };
        }));

        res.json({ count: enriched.length, data: enriched });
    } catch (error) {
        console.error('[ADMIN] GET /tenants error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// GET /admin/tenants/:tenantId/stats
// Returns user/project/task/auditLog counts for one tenant
// ---------------------------------------------------------------------------
router.get('/tenants/:tenantId/stats', async (req, res) => {
    try {
        const { tenantId } = req.params;

        let userCount = 0, projectCount = 0, taskCount = 0, auditLogCount = 0;

        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            const ProjectModel = await modelProvider.getModel('Project');
            const TaskModel = await modelProvider.getModel('Task');
            const AuditLog = require('../models/AuditLog');

            userCount = await UserModel.countDocuments({ tenant_id: tenantId });
            projectCount = await ProjectModel.countDocuments({ tenant_id: tenantId });
            taskCount = await TaskModel.countDocuments({ tenant_id: tenantId });
            auditLogCount = await AuditLog.countDocuments({ tenant_id: tenantId });
        });

        res.json({ tenantId, userCount, projectCount, taskCount, auditLogCount });
    } catch (error) {
        console.error('[ADMIN] GET /tenants/:tenantId/stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ---------------------------------------------------------------------------
// PATCH /admin/tenants/:tenantId/tier
// Body: { tier: 'free' | 'premium' | 'enterprise' }
// Updates tenant plan tier in MongoDB
// ---------------------------------------------------------------------------
router.patch('/tenants/:tenantId/tier', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { tier } = req.body;

        const validTiers = ['free', 'premium', 'enterprise'];
        if (!tier || !validTiers.includes(tier)) {
            return res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
        }

        const tenant = await Tenant.findOneAndUpdate(
            { tenantId },
            { $set: { plan: tier } },
            { new: true }
        );

        if (!tenant) {
            return res.status(404).json({ error: `Tenant not found: ${tenantId}` });
        }

        // Bust the Redis tier cache so new tier takes effect immediately
        try {
            const redis = getRedisClient();
            if (redis && redis.status === 'ready') {
                await redis.del(`tier_cache:${tenantId}`);
            }
        } catch (_) { /* Redis unavailable — cache will expire naturally */ }

        res.json({
            message: `Tenant ${tenantId} tier updated to ${tier}`,
            tenant: {
                tenantId: tenant.tenantId,
                name: tenant.name,
                tier: tenant.plan,
            }
        });
    } catch (error) {
        console.error('[ADMIN] PATCH /tenants/:tenantId/tier error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
