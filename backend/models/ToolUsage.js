const mongoose = require('mongoose');

const toolUsageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    toolSlug: {
        type: String,
        required: true,
        index: true
    },
    toolName: {
        type: String,
        required: true
    },
    inputData: {
        type: Object,
        default: {}
    },
    outputData: {
        type: Object,
        default: {}
    },
    executionTime: {
        type: Number, // milliseconds
        default: 0
    },
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: {
        type: String
    },
    userPlanAtTime: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    userRoleAtTime: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound index for user and tool for quick lookups
toolUsageSchema.index({ userId: 1, toolSlug: 1 });
// Index for daily usage aggregation
toolUsageSchema.index({ userId: 1, timestamp: 1 });

module.exports = mongoose.model('ToolUsage', toolUsageSchema);