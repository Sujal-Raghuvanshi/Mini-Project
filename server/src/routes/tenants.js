const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { TenantContext } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const { TenantResolver } = require('../middleware/tenantResolver');
const { getRedisClient } = require('../config/redisClient');
const modelProvider = require('../utils/modelProvider');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { tenantId, tenantName, adminEmail, adminPassword } = req.body;

        if (!tenantId || !tenantName || !adminEmail || !adminPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for duplicate tenant
        const existingTenant = await Tenant.findOne({ tenantId });
        if (existingTenant) {
            return res.status(400).json({ error: 'Tenant ID already exists' });
        }

        // Create the tenant record
        await Tenant.create({ 
            tenantId,
            name: tenantName, 
            plan: 'free' 
        });

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Create the admin user in tenant context
        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            
            const existingUser = await UserModel.findOne({ username: adminEmail });
            if (existingUser) throw new Error('Admin Email already in use');

            await UserModel.create({
                username: adminEmail,
                password: hashedPassword,
                role: 'admin',
                tenant_id: tenantId
            });
        });

        // Issue JWT token immediately
        const token = TenantResolver.createToken({
            tenantId,
            userId: adminEmail,
            username: adminEmail,
            role: 'admin'
        }, true);
        
        const refreshToken = crypto.randomBytes(40).toString('hex');
        // Optional Redis refresh token storage
        try {
            const redis = getRedisClient();
            if (redis && redis.status === 'ready') {
                await redis.setex(`refresh:${refreshToken}`, 7 * 24 * 60 * 60, JSON.stringify({
                    tenantId,
                    userId: adminEmail,
                    role: 'admin'
                }));
            }
        } catch (e) {
            console.warn('[TENANT] Failed to cache refresh token:', e.message);
        }

        res.status(201).json({ 
            message: 'Tenant and Admin created successfully',
            tenantId,
            token,
            refreshToken,
            expiresIn: '15m'
        });

    } catch (error) {
        console.error('[TENANT] Registration failed:', error.message);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
