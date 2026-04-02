const mongoose = require('mongoose');
const { createTenantSchema } = require('./baseTenantModel');

const userSchema = createTenantSchema({
    username: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'viewer', 'superadmin'],
        default: 'user'
    },
    password: { type: String, required: true }
});

// Compound unique index: username + tenant_id
userSchema.index({ username: 1, tenant_id: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
