import mongoose from 'mongoose';

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
        type: Number,
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

// Prevent model recompilation in development
export default mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);