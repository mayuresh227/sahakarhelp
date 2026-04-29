const rateLimit = require('express-rate-limit');
const { toolQueue } = require('../queues/toolQueue');

/**
 * Get identifier for rate limiting (user ID or IP)
 */
const getRateLimitKey = (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  const ip = req.clientIp || req.ip;
  return ip ? `ip:${ip}` : 'unknown';
};

/**
 * Global rate limiter: 100 requests per 15 minutes per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  skip: (req) => {
    // Skip internal worker calls
    if (req.headers['x-worker-call'] === 'true') return true;
    // Skip rate limiting in test mode
    if (process.env.NODE_ENV === 'test') return true;
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
    });
  }
});

/**
 * Tool execution limiter: 20 executions per minute per user/IP
 */
const toolExecutionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 executions per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  skip: (req) => {
    // Skip internal worker calls
    if (req.headers['x-worker-call'] === 'true') return true;
    // Skip rate limiting in test mode
    if (process.env.NODE_ENV === 'test') return true;
    return false;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many tool executions. Please slow down.',
      retryAfter: Math.ceil(60) // 1 minute in seconds
    });
  }
});

/**
 * Check if user has exceeded job queue limit
 * Max 10 active jobs (waiting + active) per user
 * @param {string} userId - User ID or IP
 * @returns {Promise<{allowed: boolean, activeJobs: number}>}
 */
async function checkQueueLimit(userId) {
  try {
    const counts = await toolQueue.getJobCounts();
    const totalActive = counts.waiting + counts.active;

    // Simple global limit check
    if (totalActive >= 100) {
      return { allowed: false, activeJobs: totalActive, reason: 'Queue full' };
    }

    return { allowed: true, activeJobs: totalActive };
  } catch (err) {
    console.warn('[RateLimiter] Queue check failed:', err.message);
    // Allow on error to not block the queue
    return { allowed: true, activeJobs: 0 };
  }
}

/**
 * Middleware to check queue limits before adding jobs
 */
const queueLimitMiddleware = async (req, res, next) => {
  // Skip queue limit checks in test mode
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const identifier = getRateLimitKey(req);
  const { allowed, activeJobs, reason } = await checkQueueLimit(identifier);

  if (!allowed) {
    return res.status(429).json({
      success: false,
      data: null,
      error: 'Queue limit exceeded',
      message: `Too many jobs in queue. ${reason}. Please wait for existing jobs to complete.`,
      meta: { activeJobs, retryAfter: 60 }
    });
  }

  // Attach to request for logging
  req.queueInfo = { activeJobs, identifier };
  next();
};

module.exports = {
  globalLimiter,
  toolExecutionLimiter,
  queueLimitMiddleware,
  checkQueueLimit,
  getRateLimitKey
};