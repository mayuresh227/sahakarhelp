import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    provider: {
        type: String,
        enum: ['google', 'credentials'],
        required: true
    },
    passwordHash: { type: String }, // only for credentials provider
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    plan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastResetAt: {
        type: Date,
        default: Date.now
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model('User', userSchema);