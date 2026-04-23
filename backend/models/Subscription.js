const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    razorpaySubscriptionId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayCustomerId: {
        type: String,
        index: true
    },
    plan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'halted', 'cancelled', 'expired', 'failed'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    interval: {
        type: String,
        enum: ['monthly', 'yearly', 'one_time'],
        default: 'monthly'
    },
    currentPeriodStart: {
        type: Date
    },
    currentPeriodEnd: {
        type: Date
    },
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false
    },
    cancelledAt: {
        type: Date
    },
    paymentMethod: {
        type: String
    },
    lastPaymentDate: {
        type: Date
    },
    nextPaymentDate: {
        type: Date
    },
    trialEnd: {
        type: Date
    },
    metadata: {
        type: Object,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

subscriptionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);