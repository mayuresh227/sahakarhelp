/**
 * Dynamically loads the Razorpay checkout script.
 * @returns {Promise<void>}
 */
export function loadRazorpay() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
            if (window.Razorpay) {
                resolve();
            } else {
                reject(new Error('Razorpay SDK failed to load'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.body.appendChild(script);
    });
}

/**
 * Format amount to display in INR with currency symbol.
 * @param {number} amount - Amount in paise (Razorpay format)
 * @returns {string}
 */
export function formatAmount(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100);
}