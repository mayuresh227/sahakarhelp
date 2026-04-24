// Auth temporarily disabled - all requests are allowed
const authMiddleware = async (req, res, next) => {
    // Set dummy user data for compatibility
    req.user = {
        id: 'temporary-user-id',
        email: 'guest@example.com',
        name: 'Guest User',
        role: 'user',
        plan: 'free',
        usageCount: 0
    };
    req.isAuthenticated = false; // Mark as not authenticated but with guest access
    next();
};

// Middleware to require authentication for specific routes - temporarily disabled
const requireAuth = (req, res, next) => {
    // Allow all requests during temporary disable
    // Create a temporary user object for routes that expect req.user
    if (!req.user) {
        req.user = {
            id: 'temporary-user-id',
            email: 'guest@example.com',
            name: 'Guest User',
            role: 'user',
            plan: 'free',
            usageCount: 0
        };
    }
    next();
};

// Role-based access control middleware - temporarily disabled
const requireRole = (role) => {
    return (req, res, next) => {
        // Allow all roles during temporary disable
        // Ensure req.user exists
        if (!req.user) {
            req.user = {
                id: 'temporary-user-id',
                email: 'guest@example.com',
                name: 'Guest User',
                role: role, // Grant requested role for compatibility
                plan: 'free',
                usageCount: 0
            };
        }
        next();
    };
};

// Plan-based access control middleware - temporarily disabled
const requirePlan = (plan) => {
    return (req, res, next) => {
        // Allow all plans during temporary disable
        // Ensure req.user exists
        if (!req.user) {
            req.user = {
                id: 'temporary-user-id',
                email: 'guest@example.com',
                name: 'Guest User',
                role: 'user',
                plan: plan, // Grant requested plan for compatibility
                usageCount: 0
            };
        }
        next();
    };
};

module.exports = { authMiddleware, requireAuth, requireRole, requirePlan };