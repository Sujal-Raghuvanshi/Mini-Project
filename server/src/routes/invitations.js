const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const { TenantContext } = require('../utils/tenantContext');
const modelProvider = require('../utils/modelProvider');
const { AuditLogger } = require('../utils/auditLogger');
const { checkLimit } = require('../middleware/tierGuard');

/**
 * GET /api/invitations
 * List all pending invitations for this tenant
 */
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let invitations = [];

        await TenantContext.run(tenantId, async () => {
            const InvitationModel = await modelProvider.getModel('Invitation');
            invitations = await InvitationModel.find({ tenant_id: tenantId })
                .sort({ createdAt: -1 })
                .lean();
        });

        res.json({ tenant: tenantId, count: invitations.length, data: invitations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/invitations
 * Invite a new team member (creates a pending invitation + a user account)
 * Body: { username, role }
 */
router.post('/', checkLimit('users'), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { username, role = 'user' } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'username is required' });
        }

        const validRoles = ['admin', 'user', 'viewer'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
        }

        // Check if user already exists in this tenant
        let existingUser = null;
        await TenantContext.run(tenantId, async () => {
            const UserModel = await modelProvider.getModel('User');
            existingUser = await UserModel.findOne({ username, tenant_id: tenantId });
        });

        if (existingUser) {
            return res.status(409).json({ error: 'A user with this username already exists in your organization' });
        }

        // Generate a secure invitation token & temporary password
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const tempPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        let invitation = null;

        await TenantContext.run(tenantId, async () => {
            const InvitationModel = await modelProvider.getModel('Invitation');
            const UserModel = await modelProvider.getModel('User');

            // Check for existing pending invite
            const existingInvite = await InvitationModel.findOne({
                username,
                tenant_id: tenantId,
                status: 'pending',
            });
            if (existingInvite) {
                throw new Error('An invitation for this username is already pending');
            }

            // Create the user account (they can log in immediately with temp password)
            await UserModel.create({
                username,
                password: hashedPassword,
                role,
                tenant_id: tenantId,
            });

            // Create invitation record
            invitation = await InvitationModel.create({
                username,
                role,
                inviteToken,
                tempPassword, // stored in plain for display to admin (once)
                status: 'pending',
                invitedBy: req.tenantContext?.userId || 'admin',
                tenant_id: tenantId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });
        });

        await AuditLogger.log({
            action: 'INVITE',
            resource: 'User',
            resourceId: username,
            userId: req.tenantContext?.userId,
            req,
        });

        res.status(201).json({
            tenant: tenantId,
            message: `Invitation created for ${username}`,
            invitation: {
                id: invitation._id,
                username: invitation.username,
                role: invitation.role,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
                invitedBy: invitation.invitedBy,
                // Return temp password once so admin can share with the invitee
                tempPassword,
                loginInstructions: `Share these credentials with ${username}: Tenant ID = "${tenantId}", Username = "${username}", Temporary Password = "${tempPassword}"`,
            },
        });
    } catch (error) {
        res.status(error.message.includes('already') ? 409 : 400).json({ error: error.message });
    }
});

/**
 * PATCH /api/invitations/:id/accept
 * Mark invitation as accepted (called after user logs in successfully)
 */
router.patch('/:id/accept', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let invitation = null;

        await TenantContext.run(tenantId, async () => {
            const InvitationModel = await modelProvider.getModel('Invitation');
            invitation = await InvitationModel.findOneAndUpdate(
                { _id: req.params.id, tenant_id: tenantId, status: 'pending' },
                { $set: { status: 'accepted', acceptedAt: new Date() } },
                { new: true }
            );
        });

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found or already accepted' });
        }

        res.json({ tenant: tenantId, message: 'Invitation accepted', data: invitation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/invitations/:id
 * Revoke an invitation and remove the user account
 */
router.delete('/:id', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        let invitation = null;

        await TenantContext.run(tenantId, async () => {
            const InvitationModel = await modelProvider.getModel('Invitation');
            const UserModel = await modelProvider.getModel('User');

            invitation = await InvitationModel.findOneAndDelete({
                _id: req.params.id,
                tenant_id: tenantId,
            });

            if (invitation) {
                // Also remove the user account if invitation is being revoked (pending only)
                if (invitation.status === 'pending') {
                    await UserModel.deleteOne({ username: invitation.username, tenant_id: tenantId });
                }
            }
        });

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        await AuditLogger.log({
            action: 'REVOKE_INVITE',
            resource: 'User',
            resourceId: invitation.username,
            userId: req.tenantContext?.userId,
            req,
        });

        res.json({ tenant: tenantId, message: `Invitation for ${invitation.username} revoked` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
