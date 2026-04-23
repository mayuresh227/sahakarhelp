const mongoose = require('mongoose');

const toolMetadataSchema = new mongoose.Schema({
    slug: { type: String, unique: true },
    name: { type: String, required: true },
    categories: { type: [String], required: true },
    engineType: {
        type: String,
        enum: ['calculator', 'document', 'pdf', 'image', 'conversion'],
        required: true
    },
    config: { type: Object },
    requiresAuth: { type: Boolean, default: false },
    requiredPlan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    requiredRole: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    dailyLimitFree: {
        type: Number,
        default: 5 // number of times a free user can use this tool per day
    },
    active: { type: Boolean, default: true }
});

module.exports = mongoose.model('ToolMetadata', toolMetadataSchema);