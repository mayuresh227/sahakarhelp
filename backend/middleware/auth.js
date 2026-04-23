const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware that verifies NextAuth JWT token from Authorization header or cookies
const authMiddleware = async (req, res, next) => {
    try {
        let token = null;

        // 1. Check Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // 2. Check cookies (for HTTP‑only cookies)
        if (!token && req.cookies) {
            // NextAuth default cookie names
            token = req.cookies['next-auth.session-token'] ||
                    req.cookies['__Secure-next-auth.session-token'];
        }

        if (!token) {
            // No token provided – treat as unauthenticated
            req.user = null;
            req.isAuthenticated = false;
            return next();
        }

        const secret = process.env.NEXTAUTH_SECRET || 'your-secret-key'; // must match frontend secret
        
        // Verify JWT (includes expiry check)
        const decoded = jwt.verify(token, secret);
        
        // Find user in database
        const user = await User.findById(decoded.id);
        if (!user) {
            req.user = null;
            req.isAuthenticated = false;
            return next();
        }

        // Attach user info to request
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            plan: user.plan,
            usageCount: user.usageCount,
            lastResetAt: user.lastResetAt
        };
        req.isAuthenticated = true;
        next();
    } catch (error) {
        // Token invalid, expired, or verification failed
        console.error('Auth middleware error:', error.message);
        req.user = null;
        req.isAuthenticated = false;
        next();
    }
};

// Middleware to require authentication for specific routes
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Role-based access control middleware
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.isAuthenticated || !req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

// Plan-based access control middleware
const requirePlan = (plan) => {
    return (req, res, next) => {
        if (!req.isAuthenticated || !req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.plan !== plan) {
            return res.status(403).json({
                error: 'Upgrade required',
                message: `This feature requires a ${plan} plan. Please upgrade.`
            });
        }
        next();
    };
};

module.exports = { authMiddleware, requireAuth, requireRole, requirePlan };