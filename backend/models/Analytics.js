const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    toolSlug: {
        type: String,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: ['used_tool', 'login', 'error', 'page_view', 'api_call', 'signup'],
        index: true
    },
    metadata: {
        type: Object,
        default: {}
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    responseTime: {
        type: Number, // milliseconds
        default: 0
    },
    statusCode: {
        type: Number
    },
    errorMessage: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// Compound indexes for common queries
analyticsSchema.index({ userId: 1, action: 1 });
analyticsSchema.index({ toolSlug: 1, action: 1 });
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);