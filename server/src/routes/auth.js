const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getRedisClient } = require('../config/redisClient');
const { TenantResolver } = require('../middleware/tenantResolver');
const { TenantContext } = require('../utils/tenantContext');
// Using dynamic require inside context boundary to ensure proper tenant wiring for models,
// but the utils must be loaded at the top.
const modelProvider = require('../utils/modelProvider');

const router = express.Router();

const generateRefreshToken = () => crypto.randomBytes(40).toString('hex');

// Login and get tokens
router.post('/token', async (req, res) => {
    try {
        const { tenantId, userId, password } = req.body;
        if (!tenantId || !userId || !password) {
            return res.status(400).json({ error: 'tenantId, userId and password required' });
        }

        let user;
        // Verify user exists within tenant boundary
        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            user = await UserModel.findOne({ username: userId });
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // CRITICAL FIX 1: bcrypt comparison instead of plaintext
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = TenantResolver.createToken({
            tenantId,
            userId,
            username: user.username,
            role: user.role
        }, true);
        
        const refreshToken = generateRefreshToken();

        // Save refresh token to Redis with 7-day TTL
        const redis = getRedisClient();
        await redis.setex(`refresh:${refreshToken}`, 7 * 24 * 60 * 60, JSON.stringify({
            tenantId,
            userId: user.username,
            role: user.role
        }));

        res.json({
            token,
            refreshToken,
            expiresIn: '15m',
            encrypted: true,
            user: { username: user.username, role: user.role, tenantId }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token rotation
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

        const redis = getRedisClient();
        const storedData = await redis.get(`refresh:${refreshToken}`);
        
        if (!storedData) {
            return res.status(403).json({ error: 'Invalid or expired refresh token' });
        }

        const { tenantId, userId, role } = JSON.parse(storedData);
        
        // Invalidate old token
        await redis.del(`refresh:${refreshToken}`);

        // Rotate
        const token = TenantResolver.createToken({ tenantId, userId, username: userId, role }, true);
        const newRefreshToken = generateRefreshToken();
        await redis.setex(`refresh:${newRefreshToken}`, 7 * 24 * 60 * 60, JSON.stringify({ tenantId, userId, role }));

        res.json({ token, refreshToken: newRefreshToken, expiresIn: '15m' });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register a new tenant and admin user
router.post('/register', async (req, res) => {
    try {
        const { organizationName, tenantId, adminUsername, userId, password } = req.body;
        
        // Handle frontend vs backend names
        const finalAdminUsername = adminUsername || userId;
        const finalOrgName = organizationName || tenantId;

        if (!finalOrgName || !tenantId || !finalAdminUsername || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate tenantId (DNS-safe string usually)
        if (!/^[a-z0-9-]+$/.test(tenantId)) {
            return res.status(400).json({ error: 'Tenant ID must be lowercase, numbers or hyphens only' });
        }

        // Check if tenant already exists
        const Tenant = require('../models/Tenant');
        const existingTenant = await Tenant.findOne({ tenantId });
        if (existingTenant) {
            return res.status(409).json({ error: 'Tenant ID already taken' });
        }

        // Step 1: Create Tenant master record
        const newTenant = await Tenant.create({
            tenantId,
            name: finalOrgName,
            status: 'active',
            plan: 'free'
        });

        // Step 2: Create Admin User in the tenant's namespace
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            await UserModel.create({
                username: finalAdminUsername,
                password: hashedPassword,
                role: 'admin',
                tenant_id: tenantId // Included via baseTenantModel
            });
        });

        res.status(201).json({ 
            success: true, 
            message: 'Workspace initialized successfully',
            tenantId 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const redis = getRedisClient();
            await redis.del(`refresh:${refreshToken}`);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
