const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    settings: {
        maxUsers: { type: Number, default: 5 },
        features: [String]
    },
    ipAllowlist: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Tenant', tenantSchema);
