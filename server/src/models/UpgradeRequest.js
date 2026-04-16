const mongoose = require('mongoose');

const upgradeRequestSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    requestedPlan: {
        type: String,
        required: true,
    },
    billingCycle: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('UpgradeRequest', upgradeRequestSchema);
