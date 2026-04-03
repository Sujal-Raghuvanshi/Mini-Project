const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { TenantContext } = require('../utils/tenantContext');
const Tenant = require('../models/Tenant');
const { TenantResolver } = require('../middleware/tenantResolver');
const { getRedisClient } = require('../config/redisClient');
const modelProvider = require('../utils/modelProvider');

const router = express.Router();

router.post('/register', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { tenantId, tenantName, adminEmail, adminPassword } = req.body;

        if (!tenantId || !tenantName || !adminEmail || !adminPassword) {
            throw new Error('Missing required fields');
        }

        const existingTenant = await Tenant.findOne({ tenantId }).session(session);
        if (existingTenant) {
            throw new Error('Tenant ID already exists');
        }

        await Tenant.create([{ 
            tenantId: tenantId,
            name: tenantName, 
            plan: 'free' 
        }], { session });

        // CRITICAL FIX 2: Hash password with bcrypt before saving
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            
            const existingUser = await UserModel.findOne({ username: adminEmail }).session(session);
            if (existingUser) throw new Error('Admin Email already in use');

            await UserModel.create([{
                username: adminEmail,
                password: hashedPassword, // Store hashed, never plaintext
                role: 'admin',
                tenant_id: tenantId
            }], { session });
        });

        await session.commitTransaction();
        session.endSession();

        // Output JWT Token immediately
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
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
