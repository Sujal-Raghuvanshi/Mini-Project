const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { TenantAwareService } = require('../services/tenantAwareService');
const { AuditLogger } = require('../utils/auditLogger');
const { TenantRateLimiter } = require('../middleware/rateLimiter');
const { checkLimit } = require('../middleware/tierGuard');

// Initialize services
const userService = new TenantAwareService(User);
const projectService = new TenantAwareService(Project);
const taskService = new TenantAwareService(Task);

// Users API
router.get('/users', async (req, res) => {
    try {
        const users = await userService.findAll();
        res.json({ tenant: req.tenantId, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users', checkLimit('users'), async (req, res) => {
    try {
        const user = await userService.create(req.body);

        // Log creation in audit trail
        await AuditLogger.log({
            action: 'CREATE',
            resource: 'User',
            resourceId: user._id.toString(),
            userId: req.tenantContext?.userId,
            req,
        });

        res.status(201).json({ tenant: req.tenantId, data: user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Projects API
router.get('/projects', async (req, res) => {
    try {
        const projects = await projectService.findAll();
        res.json({ tenant: req.tenantId, count: projects.length, data: projects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/projects', checkLimit('projects'), async (req, res) => {
    try {
        const project = await projectService.create(req.body);

        // Log creation in audit trail
        await AuditLogger.log({
            action: 'CREATE',
            resource: 'Project',
            resourceId: project._id.toString(),
            userId: req.tenantContext?.userId,
            req,
        });

        res.status(201).json({ tenant: req.tenantId, data: project });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const project = await projectService.update(req.params.id, req.body);

        // Log update
        await AuditLogger.log({
            action: 'UPDATE',
            resource: 'Project',
            resourceId: project._id.toString(),
            userId: req.tenantContext?.userId,
            req,
        });

        res.json({ tenant: req.tenantId, data: project });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        await projectService.delete(req.params.id);

        // Log deletion
        await AuditLogger.log({
            action: 'DELETE',
            resource: 'Project',
            resourceId: req.params.id,
            userId: req.tenantContext?.userId,
            req,
        });

        res.json({ tenant: req.tenantId, message: 'Project deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Tasks API
router.get('/tasks', async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = projectId ? { project_id: projectId } : {};
        const tasks = await taskService.findAll(query);
        res.json({ tenant: req.tenantId, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/tasks', checkLimit('tasks'), async (req, res) => {
    try {
        const task = await taskService.create(req.body);

        // Log creation
        await AuditLogger.log({
            action: 'CREATE',
            resource: 'Task',
            resourceId: task._id.toString(),
            userId: req.tenantContext?.userId,
            req,
        });

        res.status(201).json({ tenant: req.tenantId, data: task });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/tasks/:id', async (req, res) => {
    try {
        const task = await taskService.update(req.params.id, req.body);

        // Log update
        await AuditLogger.log({
            action: 'UPDATE',
            resource: 'Task',
            resourceId: task._id.toString(),
            userId: req.tenantContext?.userId,
            req,
        });

        res.json({ tenant: req.tenantId, data: task });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/tasks/:id', async (req, res) => {
    try {
        await taskService.delete(req.params.id);

        // Log deletion
        await AuditLogger.log({
            action: 'DELETE',
            resource: 'Task',
            resourceId: req.params.id,
            userId: req.tenantContext?.userId,
            req,
        });

        res.json({ tenant: req.tenantId, message: 'Task deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Audit logs API
router.get('/audit-logs', async (req, res) => {
    try {
        const { action, resource, startDate, endDate, limit = 100, skip = 0 } = req.query;

        const result = await AuditLogger.query({
            action,
            resource,
            startDate,
            endDate,
            limit: parseInt(limit),
            skip: parseInt(skip),
        });

        res.json({ tenant: req.tenantId, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/audit-logs/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const stats = await AuditLogger.getStats({ startDate, endDate });

        res.json({ tenant: req.tenantId, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rate limit status API
router.get('/rate-limit/status', async (req, res) => {
    try {
        const status = await TenantRateLimiter.getStatus(req.tenantId);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test isolation breach attempt (should fail)
router.get('/admin/all-data', async (req, res) => {
    try {
        // This will fail because no tenant context allows bypass
        const allUsers = await User.find({}).setQuery({ _overrideTenantCheck: true });
        res.json({ data: allUsers });
    } catch (error) {
        res.status(403).json({
            error: 'Isolation enforced',
            message: 'Cross-tenant access blocked'
        });
    }
});

// Tenant Settings / Management
router.delete('/tenant', async (req, res) => {
    try {
        const tenantId = req.tenantId;

        // Clean up all data for this tenant
        await Project.deleteMany({ tenant_id: tenantId });
        await Task.deleteMany({ tenant_id: tenantId });
        await User.deleteMany({ tenant_id: tenantId });
        // Optional: Keep audit logs or delete them? Usually good to keep for a while, 
        // but for "Delete My Data" compliance, we delete.
        const AuditLog = require('../models/AuditLog');
        await AuditLog.deleteMany({ tenant_id: tenantId });

        res.json({ message: `Organization ${tenantId} and all associated data deleted successfully.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
