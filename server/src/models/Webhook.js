const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
    tenant_id: {
        type: String,
        required: true,
        index: true
    },
    url: {
        type: String,
        required: true,
        validate: {
            validator: (v) => /^https?:\/\/.+/.test(v),
            message: props => `${props.value} is not a valid URL!`
        }
    },
    events: {
        type: [String],
        default: [],
        enum: [
            'project.created', 'project.updated', 'project.deleted',
            'user.created', 'task.created', 'task.completed',
            'tier.upgraded', 'tier.downgraded'
        ]
    },
    secret: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    failureCount: {
        type: Number,
        default: 0
    },
    lastTriggeredAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Webhook', webhookSchema);
