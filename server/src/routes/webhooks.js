const express = require('express');
const router = express.Router();
const Webhook = require('../models/Webhook');

// GET /api/webhooks - List all webhooks for current tenant
router.get('/webhooks', async (req, res) => {
    try {
        const webhooks = await Webhook.find({ tenant_id: req.tenantId }).lean();
        
        // Mask secrets for UI security
        const masked = webhooks.map(h => ({
            ...h,
            secret: '••••••••••••••••'
        }));

        res.json({ count: masked.length, data: masked });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/webhooks - Register new webhook
router.post('/webhooks', async (req, res) => {
    try {
        const { url, events, secret } = req.body;
        
        // Basic URL validation
        if (!url || !/^https?:\/\/.+/.test(url)) {
            return res.status(400).json({ error: 'Invalid URL. Must include http/https.' });
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'Events array is required.' });
        }

        if (!secret || secret.length < 16) {
            return res.status(400).json({ error: 'Secret is required and should be at least 16 chars.' });
        }

        const newWebhook = await Webhook.create({
            tenant_id: req.tenantId,
            url,
            events,
            secret,
            isActive: true,
            failureCount: 0
        });

        const masked = newWebhook.toObject();
        masked.secret = '••••••••••••••••';

        res.status(201).json({ message: 'Webhook registered', data: masked });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/webhooks/:id - Delete a webhook
router.delete('/webhooks/:id', async (req, res) => {
    try {
        const result = await Webhook.deleteOne({ _id: req.params.id, tenant_id: req.tenantId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Webhook not found or not owned by you.' });
        }
        res.json({ message: 'Webhook deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PATCH /api/webhooks/:id/toggle - Enable/disable a webhook
router.patch('/webhooks/:id/toggle', async (req, res) => {
    try {
        const hook = await Webhook.findOne({ _id: req.params.id, tenant_id: req.tenantId });
        if (!hook) return res.status(404).json({ error: 'Webhook not found' });

        hook.isActive = !hook.isActive;
        if (hook.isActive) hook.failureCount = 0; // Reset failures when manually re-enabling
        
        await hook.save();

        const masked = hook.toObject();
        masked.secret = '••••••••••••••••';

        res.json({ message: `Webhook ${hook.isActive ? 'enabled' : 'disabled'}`, data: masked });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
