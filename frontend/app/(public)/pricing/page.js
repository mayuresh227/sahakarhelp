"use client";

import { useState, useEffect } from 'react';
import { loadRazorpay } from '@/utils/razorpay';
import Navbar from '@/components/Navbar';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'INR',
        interval: 'month',
        description: 'Basic access with limited usage',
        features: [
            'Up to 5 tool uses per day',
            'Basic tool access',
            'Community support',
            'Standard processing speed',
            'Ads supported'
        ],
        cta: 'Current Plan',
        highlighted: false
    },
    {
        id: 'pro_monthly',
        name: 'Pro Monthly',
        price: 299,
        currency: 'INR',
        interval: 'month',
        description: 'Unlimited tools & priority support',
        features: [
            'Unlimited tool usage',
            'Priority support',
            'No advertisements',
            'Advanced tool features',
            'Early access to new tools',
            'Export capabilities'
        ],
        cta: 'Upgrade Now',
        highlighted: true
    },
    {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 2999,
        currency: 'INR',
        interval: 'year',
        description: 'Best value - save 16%',
        features: [
            'Everything in Pro Monthly',
            'Save 16% compared to monthly',
            'Billed annually',
            'Free onboarding assistance',
            'Dedicated account manager'
        ],
        cta: 'Upgrade Now',
        highlighted: false
    }
];

export default function PricingPage() {
    const session = null;
    const status = 'unauthenticated';
    const [loading, setLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState('free');

    useEffect(() => {
        if (session?.user?.plan) {
            setCurrentPlan(session.user.plan);
        }
    }, [session]);

    const handleUpgrade = async (planId) => {
        if (planId === 'free') return;
        
        // Payment temporarily disabled
        alert('Payment features are temporarily disabled. Please check back later.');
        return;
        
        // Original code commented out for easy re-enablement
        /*
        if (!session) {
            alert('Please sign in to upgrade');
            return;
        }

        setLoading(true);
        try {
            // Load Razorpay script
            await loadRazorpay();

            // Create subscription on backend
            const res = await fetch('/api/payment/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({ planId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create subscription');

            const { orderId, amount, currency, key } = data;

            // Open Razorpay checkout
            const options = {
                key,
                amount,
                currency,
                order_id: orderId,
                name: 'SahakarHelp Pro',
                description: `Upgrade to ${planId}`,
                image: '/logo.png',
                handler: async function (response) {
                    // Verify payment on backend
                    const verifyRes = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.accessToken}`
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyRes.ok) {
                        alert('Payment successful! Your account has been upgraded to Pro.');
                        window.location.reload();
                    } else {
                        alert('Payment verification failed: ' + verifyData.error);
                    }
                },
                prefill: {
                    name: session.user.name || '',
                    email: session.user.email || '',
                },
                theme: {
                    color: '#3b82f6'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
        */
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Upgrade to unlock unlimited tools, priority support, and advanced features.
                        Cancel anytime.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl border ${plan.highlighted ? 'border-blue-500 shadow-xl' : 'border-gray-200 shadow-lg'} bg-white p-8 flex flex-col`}
                        >
                            {plan.highlighted && (
                                <div className="inline-block bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full mb-4 self-start">
                                    Most Popular
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                            <p className="text-gray-600 mb-6">{plan.description}</p>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
                                <span className="text-gray-500">/{plan.interval}</span>
                                {plan.price === 0 && <span className="text-gray-500 ml-2">forever</span>}
                            </div>
                            <ul className="space-y-3 mb-8 flex-grow">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={loading || (currentPlan === 'pro' && plan.id.includes('pro'))}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${plan.id === 'free' || (currentPlan === 'pro' && plan.id.includes('pro'))
                                        ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                                        : plan.highlighted
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-gray-800 hover:bg-gray-900 text-white'
                                    }`}
                            >
                                {currentPlan === 'pro' && plan.id.includes('pro')
                                    ? 'Current Plan'
                                    : plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-16 max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Can I switch plans later?</h3>
                            <p className="text-gray-600">Yes, you can upgrade or downgrade at any time. Downgrading will take effect at the end of your billing cycle.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Is there a free trial?</h3>
                            <p className="text-gray-600">We offer a 7-day free trial for Pro plans. No credit card required.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">What payment methods do you accept?</h3>
                            <p className="text-gray-600">We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay.</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">Can I cancel my subscription?</h3>
                            <p className="text-gray-600">Yes, you can cancel anytime from your dashboard. After cancellation, you'll retain Pro access until the end of your billing period.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}