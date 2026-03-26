const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { TenantResolver, enforceTenantIsolation, enforceRouteIsolation } = require('./middleware/tenantResolver');
const { TenantRateLimiter } = require('./middleware/rateLimiter');
const { auditMiddleware } = require('./middleware/auditMiddleware');
const { TenantContext } = require('./utils/tenantContext');
const { MetricsCollector } = require('./utils/metricsCollector');
const { AuditLogger } = require('./utils/auditLogger');
const { createRedisClient, closeRedisClient } = require('./config/redisClient');
const { backupScheduler } = require('./services/backupScheduler');
const User = require('./models/User');
const Project = require('./models/Project');
const { TenantAwareService } = require('./services/tenantAwareService');
const healthCheckRouter = require('./routes/healthCheck');

dotenv.config();

const app = express();

// CORS configuration for frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

app.use(express.json());

// Metrics middleware - track all requests
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const tenantId = req.tenantId || 'none';

        MetricsCollector.recordHttpRequest(
            req.method,
            req.path,
            res.statusCode.toString(),
            tenantId,
            duration
        );
    });

    next();
});

// Health check and metrics routes (no tenant required)
app.use('/', healthCheckRouter);

// Public routes (no tenant context)
app.post('/auth/register', async (req, res) => {
    try {
        const { tenantId, userId, password } = req.body;

        if (!tenantId || !userId || !password) {
            return res.status(400).json({ error: 'tenantId, userId and password required' });
        }

        // We run this in the context of the new tenant to ensure the user is created in the right DB
        await TenantContext.run(tenantId, async () => {
            const Model = await require('./utils/modelProvider').getModel('User');

            // Check if user already exists
            const existingUser = await Model.findOne({ username: userId });
            if (existingUser) {
                return res.status(409).json({ error: 'User/Organization already exists. Please log in.' });
            }

            // Create the user (this will trigger umask/isolation checks via hooks)
            await Model.create({
                username: userId,
                password, // In a real app, hash this!
                role: 'admin',
                tenant_id: tenantId // Though hooks usually handle this, we set it explicitly here since it's the root user
            });
        });

        res.status(201).json({ message: 'Registration successful', tenantId, userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate JWT token endpoint (Auth Login)
app.post('/auth/token', async (req, res) => {
    try {
        const { tenantId, userId, password } = req.body;

        if (!tenantId || !userId || !password) {
            return res.status(400).json({ error: 'tenantId, userId and password required' });
        }

        // Verify user exists in the tenant's database
        let user;
        await TenantContext.run(tenantId, async () => {
            const Model = await require('./utils/modelProvider').getModel('User');
            user = await Model.findOne({ username: userId });
        });

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create encrypted JWT token
        const token = TenantResolver.createToken({
            tenantId,
            userId,
            username: user.username,
            role: user.role
        }, true);

        res.json({
            token,
            expiresIn: process.env.JWT_EXPIRY || '24h',
            encrypted: true,
            user: {
                username: user.username,
                role: user.role,
                tenantId: user.tenant_id
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Apply tenant isolation middleware to all /api routes
app.use('/api', TenantResolver.fromJWT);  // JWT with encryption support
app.use('/api', enforceTenantIsolation);
app.use('/api', TenantRateLimiter.middleware);  // Rate limiting
app.use('/api', auditMiddleware);  // Audit logging

// API Routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Specific test route to verify route isolation
app.get('/api/:tenantId/verify', TenantResolver.fromJWT, enforceRouteIsolation, (req, res) => {
    res.json({ success: true, tenantId: req.tenantId });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(`[ERROR] Tenant: ${req.tenantId || 'none'}`, err);

    // Record error in metrics
    MetricsCollector.recordError(err.name || 'UnknownError', req.tenantId);

    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/multi_tenant');
        console.log('✓ MongoDB connected');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        console.warn('⚠ Server will continue without MongoDB — most API routes will fail until DB is reachable.');
        console.warn('  → Fix: Whitelist your IP in MongoDB Atlas: https://cloud.mongodb.com → Network Access');
        // Do NOT exit — keep server alive so client can still load
    }
};

// Initialize Redis connection (ioredis auto-connects — no manual .connect() needed)
const initRedis = async () => {
    try {
        const client = createRedisClient();
        // ioredis connects lazily; ping to verify connectivity
        await client.ping();
        const host = client.options?.host || '127.0.0.1';
        const port = client.options?.port || 6379;
        console.log(`✓ Redis client initialized (${host}:${port})`);
    } catch (error) {
        console.warn('⚠ Redis connection failed (rate limiting will be disabled):', error.message);
    }
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\nShutting down gracefully...');

    // Stop backup scheduler
    backupScheduler.stopAll();

    // Close Redis connection
    await closeRedisClient();

    // Close MongoDB connection
    await mongoose.connection.close();

    console.log('✓ All connections closed');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
    await connectDB();
    await initRedis();

    // Seed demo tenants for testing
    const seedDemoTenants = async () => {
        const demoTenants = ['tenant-a', 'tenant-b'];
        for (const tenantId of demoTenants) {
            await TenantContext.run(tenantId, async () => {
                const Model = await require('./utils/modelProvider').getModel('User');
                const adminExists = await Model.findOne({ username: 'admin' });
                if (!adminExists) {
                    await Model.create({
                        username: 'admin',
                        password: process.env.ADMIN_PASSWORD || 'admin123',
                        role: 'admin',
                        tenant_id: tenantId
                    });
                    console.log(`✓ Seeded demo admin for ${tenantId}`);
                }
            });
        }
    };
    await seedDemoTenants().catch(err => console.error('Seeding failed:', err.message));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log('\n========================================');
        console.log(`Multi-tenant server running on port ${PORT}`);
        console.log('========================================');
        console.log('Security & Isolation layers:');
        console.log('  ✓ JWT token encryption (AES-256-GCM)');
        console.log('  ✓ Redis-based rate limiting');
        console.log('  ✓ Comprehensive audit logging');
        console.log('  ✓ Prometheus metrics collection');
        console.log('  ✓ Express middleware isolation');
        console.log('  ✓ MongoDB tenant_id indexes');
        console.log('  ✓ AsyncLocalStorage context');
        console.log('  ✓ Application logic enforcement');
        console.log('========================================');
        console.log('Available endpoints:');
        console.log('  GET  /health - Basic health check');
        console.log('  GET  /health/detailed - Detailed health');
        console.log('  GET  /metrics - Prometheus metrics');
        console.log('  POST /auth/token - Generate JWT token');
        console.log('  GET  /api/users - List users (tenant-scoped)');
        console.log('  GET  /api/projects - List projects (tenant-scoped)');
        console.log('  GET  /api/audit-logs - Query audit logs');
        console.log('  GET  /api/rate-limit/status - Rate limit status');
        console.log('========================================\n');
    });
};

if (require.main === module) {
    startServer().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = app;

