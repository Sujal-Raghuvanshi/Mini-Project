const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const { AuditLogger } = require('../utils/auditLogger');
const { getRedisClient } = require('../config/redisClient');

const PLAN_LIMITS = {
    free:       { maxUsers: 5,  maxProjects: 3,  maxTasks: 10  },
    premium:    { maxUsers: 25, maxProjects: 20, maxTasks: 200 },
    enterprise: { maxUsers: -1, maxProjects: -1, maxTasks: -1  },
};

const PLAN_PRICES = {
    free:       { monthly: 0,   annual: 0    },
    premium:    { monthly: 29,  annual: 290  },
    enterprise: { monthly: 99,  annual: 990  },
};

/**
 * GET /api/billing/plans
 * Return available plans and current plan info
 */
router.get('/plans', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const tenant = await Tenant.findOne({ tenantId }).lean();

        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        res.json({
            tenant: tenantId,
            currentPlan: tenant.plan || 'free',
            plans: [
                {
                    id: 'free',
                    name: 'Free',
                    price: PLAN_PRICES.free,
                    limits: PLAN_LIMITS.free,
                    features: ['3 Projects', '5 Team Members', '10 Tasks', 'Community Support', 'Basic Analytics'],
                    color: '#9ca3af',
                },
                {
                    id: 'premium',
                    name: 'Premium',
                    price: PLAN_PRICES.premium,
                    limits: PLAN_LIMITS.premium,
                    features: ['20 Projects', '25 Team Members', '200 Tasks', 'Priority Support', 'Advanced Analytics', 'Webhook Integrations', 'Audit Logs'],
                    color: '#60a5fa',
                    popular: true,
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise',
                    price: PLAN_PRICES.enterprise,
                    limits: PLAN_LIMITS.enterprise,
                    features: ['Unlimited Projects', 'Unlimited Team Members', 'Unlimited Tasks', '24/7 Dedicated Support', 'Custom Analytics', 'All Integrations', 'SLA Guarantee', 'Custom Branding', 'SSO / SAML'],
                    color: '#c084fc',
                },
            ],
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/billing/requests
 * Get the latest pending upgrade request for the tenant
 */
router.get('/requests', async (req, res) => {
    try {
        const UpgradeRequest = require('../models/UpgradeRequest');
        const pending = await UpgradeRequest.findOne({ tenantId: req.tenantId, status: 'pending' }).lean();
        
        res.json({ tenant: req.tenantId, data: pending || null });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/billing/upgrade
 * Request an upgrade for the tenant plan (requires superadmin approval)
 * Body: { plan: 'free' | 'premium' | 'enterprise', billingCycle: 'monthly' | 'annual' }
 */
router.post('/upgrade', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { plan, billingCycle = 'monthly' } = req.body;

        if (!plan || !PLAN_LIMITS[plan]) {
            return res.status(400).json({
                error: `Invalid plan. Must be one of: ${Object.keys(PLAN_LIMITS).join(', ')}`,
            });
        }

        const tenant = await Tenant.findOne({ tenantId });
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        if (tenant.plan === plan) {
            return res.status(400).json({ error: `You are already on the ${plan} plan` });
        }

        const UpgradeRequest = require('../models/UpgradeRequest');
        
        // Ensure no pending requests exist
        const pending = await UpgradeRequest.findOne({ tenantId, status: 'pending' });
        if (pending) {
            return res.status(409).json({ error: 'You already have a pending upgrade request. Please wait for an administrator to approve it.' });
        }

        const request = await UpgradeRequest.create({
            tenantId,
            requestedPlan: plan,
            billingCycle,
            requestedBy: req.tenantContext?.userId || 'unknown'
        });

        await AuditLogger.log({
            action: 'UPGRADE_REQUEST_SUBMITTED',
            resource: 'Tenant',
            resourceId: tenantId,
            userId: req.tenantContext?.userId,
            req,
            details: { from: tenant.plan, to: plan, billingCycle },
        });

        res.status(201).json({
            tenant: tenantId,
            message: `Your request to upgrade to ${plan} has been submitted for approval by our team.`,
            requestedPlan: plan,
            effectiveImmediately: false,
            request
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
