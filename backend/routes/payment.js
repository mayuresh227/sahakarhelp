const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Initialize Razorpay instance (only if credentials exist)
let razorpay;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log('✅ Razorpay initialized');
    } else {
        console.warn('⚠️ Razorpay credentials missing. Payment features disabled.');
        razorpay = null;
    }
} catch (err) {
    console.error('❌ Razorpay initialization failed:', err.message);
    razorpay = null;
}

// Define plan details (in paise, 1 INR = 100 paise)
const PLANS = {
    pro_monthly: {
        name: 'Pro Monthly',
        amount: 29900, // ₹299
        currency: 'INR',
        interval: 'monthly',
        description: 'Unlimited tools, priority support, no ads'
    },
    pro_yearly: {
        name: 'Pro Yearly',
        amount: 299900, // ₹2999 (discounted)
        currency: 'INR',
        interval: 'yearly',
        description: 'Unlimited tools, priority support, no ads - save 16%'
    }
};

// POST /api/payment/create-subscription - create a Razorpay subscription
router.post('/create-subscription', requireAuth, async (req, res) => {
    try {
        const { planId } = req.body; // 'pro_monthly' or 'pro_yearly'
        const plan = PLANS[planId];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid plan ID' });
        }

        if (!razorpay) {
            return res.status(503).json({ error: 'Payment service temporarily unavailable' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a Razorpay subscription
        const subscriptionOptions = {
            plan_id: process.env.RAZORPAY_PLAN_ID, // You need to create a plan in Razorpay dashboard
            total_count: plan.interval === 'monthly' ? 12 : 1, // for monthly, 12 months; yearly, 1
            customer_notify: 1,
            quantity: 1,
            notes: {
                userId: user._id.toString(),
                plan: 'pro'
            }
        };

        // If you don't have a plan_id, you can create an order instead (one-time payment)
        // We'll use orders for simplicity
        const orderOptions = {
            amount: plan.amount,
            currency: plan.currency,
            receipt: `receipt_${user._id}_${Date.now()}`,
            notes: {
                userId: user._id.toString(),
                planId,
                interval: plan.interval
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        // Save subscription record as pending
        const subscription = new Subscription({
            userId: user._id,
            razorpaySubscriptionId: order.id,
            plan: 'pro',
            status: 'pending',
            amount: plan.amount,
            currency: plan.currency,
            interval: plan.interval,
            metadata: {
                orderId: order.id,
                planId
            }
        });
        await subscription.save();

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            subscriptionId: subscription._id
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/payment/verify - verify payment signature after frontend success
router.post('/verify', requireAuth, async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(503).json({ error: 'Payment service configuration missing' });
        }
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user.id;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Find subscription by order ID
        const subscription = await Subscription.findOne({ razorpaySubscriptionId: razorpay_order_id });
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        // Update subscription status
        subscription.status = 'active';
        subscription.lastPaymentDate = new Date();
        subscription.currentPeriodStart = new Date();
        const periodEnd = new Date();
        if (subscription.interval === 'monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        subscription.currentPeriodEnd = periodEnd;
        subscription.nextPaymentDate = periodEnd;
        await subscription.save();

        // Update user plan to pro
        await User.findByIdAndUpdate(userId, { plan: 'pro' });

        res.json({
            success: true,
            message: 'Payment verified and subscription activated',
            subscription: {
                id: subscription._id,
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd
            }
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/payment/webhook - Razorpay webhook handler (no auth)
router.post('/webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET missing, cannot verify webhook');
            return res.status(503).json({ error: 'Webhook service unavailable' });
        }
        const signature = req.headers['x-razorpay-signature'];

        // Verify webhook signature
        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.warn('Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`Received webhook event: ${event}`);

        // Handle different events
        if (event === 'subscription.charged') {
            const subscriptionId = payload.subscription.entity.id;
            const paymentId = payload.payment.entity.id;
            const userId = payload.subscription.entity.notes?.userId;

            if (userId) {
                // Update subscription
                await Subscription.findOneAndUpdate(
                    { razorpaySubscriptionId: subscriptionId },
                    {
                        status: 'active',
                        lastPaymentDate: new Date(),
                        nextPaymentDate: new Date(payload.subscription.entity.current_end)
                    }
                );
                // Update user plan if not already pro
                await User.findByIdAndUpdate(userId, { plan: 'pro' });
            }
        } else if (event === 'subscription.cancelled') {
            const subscriptionId = payload.subscription.entity.id;
            await Subscription.findOneAndUpdate(
                { razorpaySubscriptionId: subscriptionId },
                { status: 'cancelled', cancelledAt: new Date() }
            );
            // Optionally downgrade user after period end
        } else if (event === 'subscription.halted') {
            const subscriptionId = payload.subscription.entity.id;
            await Subscription.findOneAndUpdate(
                { razorpaySubscriptionId: subscriptionId },
                { status: 'halted' }
            );
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/payment/subscription - get current user's subscription details
router.get('/subscription', requireAuth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .select('-metadata -__v');

        if (!subscription) {
            return res.json({ subscription: null });
        }

        res.json({ subscription });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/payment/cancel-subscription - cancel subscription
router.post('/cancel-subscription', requireAuth, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ userId: req.user.id, status: 'active' });
        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel via Razorpay API
        if (!razorpay) {
            return res.status(503).json({ error: 'Payment service temporarily unavailable' });
        }
        await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);

        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancelAtPeriodEnd = true;
        await subscription.save();

        // Note: user plan remains pro until period end
        res.json({
            success: true,
            message: 'Subscription cancelled, will expire at period end',
            cancelledAt: subscription.cancelledAt,
            currentPeriodEnd: subscription.currentPeriodEnd
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;