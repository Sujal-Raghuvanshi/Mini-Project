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

app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

app.use(express.json());

// Database health check middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/health') || req.path === '/metrics') {
        return next();
    }
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
            error: 'Database Connection Error',
            message: 'The server cannot connect to MongoDB.' 
        });
    }
    next();
});

// Metrics middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const tenantId = req.tenantId || 'none';
        MetricsCollector.recordHttpRequest(req.method, req.path, res.statusCode.toString(), tenantId, duration);
    });
    next();
});

// Public health routes
app.use('/', healthCheckRouter);

// --- NEW PUBLIC ROUTES (Before Isolation/Auth Middleware) ---
app.use('/auth', require('./routes/auth'));
app.use('/tenants', require('./routes/tenants'));
app.use('/api', require('./routes/webhooks'));

// --- ADMIN ROUTES (superadminGuard handles its own JWT + role check) ---
app.use('/admin', require('./routes/admin'));

// Apply tenant isolation middleware to all /api routes
app.use('/api', TenantResolver.fromJWT);
app.use('/api', require('./middleware/ipGuard').ipGuard); // NEW: IP Allowlisting
app.use('/api', enforceTenantIsolation);
app.use('/api', TenantRateLimiter.middleware);
app.use('/api', auditMiddleware);

// API Routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Isolation verification route
app.get('/api/:tenantId/verify', TenantResolver.fromJWT, enforceRouteIsolation, (req, res) => {
    res.json({ success: true, tenantId: req.tenantId });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(`[ERROR] Tenant: ${req.tenantId || 'none'}`, err);
    MetricsCollector.recordError(err.name || 'UnknownError', req.tenantId);
    res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/multi_tenant', {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✓ MongoDB connected');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        console.warn('⚠ Attempting to start local in-memory MongoDB...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongoServer = await MongoMemoryServer.create();
            const mongoUri = mongoServer.getUri();
            
            await mongoose.connect(mongoUri, { dbName: 'multi_tenant' });
            console.log(`✓ Local In-Memory MongoDB connected at ${mongoUri}`);
            process.env.MONGODB_URI_BASE = mongoUri.replace(/\/$/, '');
        } catch (memError) {
            console.error('✗ Failed to start in-memory MongoDB:', memError.message);
        }
    }
};

const initRedis = async () => {
    try {
        const client = createRedisClient();
        await client.ping();
        const host = client.options?.host || '127.0.0.1';
        const port = client.options?.port || 6379;
        console.log(`✓ Redis client initialized (${host}:${port})`);
    } catch (error) {
        console.warn('⚠ Redis connection failed (rate limiting fallback mode active):', error.message);
    }
};

const gracefulShutdown = async () => {
    console.log('\nShutting down gracefully...');
    backupScheduler.stopAll();
    await closeRedisClient();
    await mongoose.connection.close();
    console.log('✓ All connections closed');
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const startServer = async () => {
    await connectDB();
    await initRedis();
    
    // Seed demo tenants for testing
    const seedDemoTenants = async () => {
        if (mongoose.connection.readyState !== 1) return;
        const bcrypt = require('bcryptjs');
        const Tenant = require('./models/Tenant');
        const demoTenants = [
            { id: 'tenant-a', name: 'Acme Corp (Demo)' },
            { id: 'tenant-b', name: 'Global Tech (Demo)' },
            { id: 'tenant-c', name: 'Skyline Inc (Demo)' },
        ];

        // Seed master Tenant records
        for (const t of demoTenants) {
            await Tenant.findOneAndUpdate(
                { tenantId: t.id },
                { $setOnInsert: { name: t.name, status: 'active', plan: 'free' } },
                { upsert: true }
            );

            await TenantContext.run(t.id, async () => {
                const Model = await require('./utils/modelProvider').getModel('User');
                await Model.deleteOne({ username: 'admin', tenant_id: t.id });
                const hashedPwd = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
                await Model.create({ username: 'admin', password: hashedPwd, role: 'admin', tenant_id: t.id });
                console.log(`✓ Seeded demo admin for ${t.id}`);
            });
        }

        // Seed system tenant and superadmin
        await Tenant.findOneAndUpdate(
            { tenantId: 'system' },
            { 
              $setOnInsert: { name: 'System Administration', status: 'active' },
              $set: { plan: 'enterprise' } // FORCE to enterprise regardless of previous state
            },
            { upsert: true }
        );

        await TenantContext.run('system', async () => {
            const Model = await require('./utils/modelProvider').getModel('User');
            await Model.deleteOne({ username: 'superadmin', tenant_id: 'system' });
            const hashedPwd = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD || 'super123', 12);
            await Model.create({ username: 'superadmin', password: hashedPwd, role: 'superadmin', tenant_id: 'system' });
            console.log(`✓ Seeded superadmin user (tenant: system)`);
        });
    };
    await seedDemoTenants().catch(err => console.error('Seeding failed:', err.message));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✓ Multi-tenant server running on port ${PORT}`);
    });
};

if (require.main === module) {
    startServer().catch(error => { console.error('Failed to start server:', error); process.exit(1); });
}

module.exports = app;
