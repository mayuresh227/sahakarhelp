const Analytics = require('../models/Analytics');

/**
 * Analytics logging middleware
 * Tracks API requests, errors, and custom events
 */
const analyticsMiddleware = (options = {}) => {
    const {
        trackRequests = true,
        trackErrors = true,
        trackResponseTime = true,
        excludePaths = []
    } = options;

    return async (req, res, next) => {
        const startTime = Date.now();
        const originalEnd = res.end;
        const originalJson = res.json;

        // Skip excluded paths
        if (excludePaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Capture response data
        let responseBody;
        res.json = function(body) {
            responseBody = body;
            return originalJson.call(this, body);
        };

        res.end = async function(chunk, encoding) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            const statusCode = res.statusCode;

            // Don't block the response
            process.nextTick(async () => {
                try {
                    // Track request if enabled
                    if (trackRequests) {
                        const analyticsData = {
                            userId: req.user?.id || null,
                            action: 'api_call',
                            metadata: {
                                method: req.method,
                                path: req.path,
                                query: req.query,
                                params: req.params,
                                statusCode,
                                responseTime
                            },
                            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                            userAgent: req.headers['user-agent'],
                            responseTime: trackResponseTime ? responseTime : 0,
                            statusCode
                        };

                        // Check if this is a tool execution
                        if (req.path.startsWith('/api/tools/') && req.method === 'POST') {
                            const slug = req.params.slug || req.path.split('/').pop();
                            analyticsData.toolSlug = slug;
                            analyticsData.action = 'used_tool';
                        }

                        await Analytics.create(analyticsData);
                    }

                    // Track errors if enabled and status >= 400
                    if (trackErrors && statusCode >= 400) {
                        const errorData = {
                            userId: req.user?.id || null,
                            action: 'error',
                            metadata: {
                                method: req.method,
                                path: req.path,
                                statusCode,
                                error: responseBody?.error || 'Unknown error',
                                responseTime
                            },
                            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                            userAgent: req.headers['user-agent'],
                            responseTime: trackResponseTime ? responseTime : 0,
                            statusCode,
                            errorMessage: responseBody?.error || responseBody?.message || 'Unknown error'
                        };

                        await Analytics.create(errorData);
                    }
                } catch (error) {
                    console.error('Analytics logging error:', error.message);
                    // Don't throw to avoid breaking the response
                }
            });

            return originalEnd.call(this, chunk, encoding);
        };

        next();
    };
};

/**
 * Helper function to log custom events
 */
const logEvent = async (eventData) => {
    try {
        const analytics = new Analytics({
            ...eventData,
            createdAt: new Date()
        });
        await analytics.save();
        return analytics;
    } catch (error) {
        console.error('Failed to log analytics event:', error.message);
        return null;
    }
};

/**
 * Track tool usage (alternative to middleware for explicit logging)
 */
const trackToolUsage = async (userId, toolSlug, metadata = {}) => {
    return logEvent({
        userId,
        toolSlug,
        action: 'used_tool',
        metadata
    });
};

/**
 * Track user login
 */
const trackLogin = async (userId, metadata = {}) => {
    return logEvent({
        userId,
        action: 'login',
        metadata
    });
};

/**
 * Track error
 */
const trackError = async (userId, errorMessage, metadata = {}) => {
    return logEvent({
        userId,
        action: 'error',
        errorMessage,
        metadata
    });
};

module.exports = {
    analyticsMiddleware,
    logEvent,
    trackToolUsage,
    trackLogin,
    trackError
};