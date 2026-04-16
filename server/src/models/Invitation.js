const mongoose = require('mongoose');
const { createTenantSchema } = require('./baseTenantModel');

const invitationSchema = createTenantSchema({
    username: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'viewer'],
        default: 'user'
    },
    inviteToken: {
        type: String,
        required: true,
    },
    tempPassword: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'revoked'],
        default: 'pending'
    },
    invitedBy: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    acceptedAt: {
        type: Date
    }
});

// Avoid multiple pending invites for the same user in a tenant
invitationSchema.index({ username: 1, tenant_id: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
