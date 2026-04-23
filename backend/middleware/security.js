const rateLimit = require('express-rate-limit');

// In‑memory store for IP blocking (use Redis in production)
const failedAttempts = new Map();
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

/**
 * Middleware to block IPs with too many failed authentication attempts.
 * This is a simple in‑memory implementation; for production, use Redis.
 */
const bruteForceProtection = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();

  // Clean up old entries
  for (const [key, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > BLOCK_DURATION) {
      failedAttempts.delete(key);
    }
  }

  const record = failedAttempts.get(ip);
  if (record && record.count >= MAX_FAILED_ATTEMPTS) {
    const timeLeft = Math.ceil((BLOCK_DURATION - (now - record.lastAttempt)) / 1000);
    return res.status(429).json({
      error: 'Too many failed attempts',
      message: `IP blocked for ${timeLeft} seconds. Please try again later.`,
    });
  }

  // Attach a function to increment failed attempts
  req.recordFailedAttempt = () => {
    const existing = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    existing.count += 1;
    existing.lastAttempt = now;
    failedAttempts.set(ip, existing);
  };

  // Attach a function to reset attempts (on successful auth)
  req.resetFailedAttempts = () => {
    failedAttempts.delete(ip);
  };

  next();
};

/**
 * Strict rate limiter for authentication endpoints (login, signup, password reset).
 * Limits: 5 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication requests',
    message: 'Please wait before trying again.',
  },
  skipSuccessfulRequests: true, // don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global IP blocking based on custom rules (e.g., known malicious IPs).
 * This is a static list; in production you might fetch from a threat intelligence API.
 */
const maliciousIPs = new Set([
  // Example malicious IPs (replace with actual list)
  '123.456.789.0',
  '192.168.1.100',
]);

const ipBlocklist = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (maliciousIPs.has(ip)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address is blocked.',
    });
  }
  next();
};

/**
 * Request logging middleware (detailed).
 * Logs method, path, IP, user agent, and response time.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip,
      userAgent,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
    };
    // In production, send to a logging service (Winston, Morgan, etc.)
    console.log(`[${log.timestamp}] ${log.method} ${log.path} ${log.status} ${log.duration} IP:${log.ip}`);
  });

  next();
};

module.exports = {
  bruteForceProtection,
  authLimiter,
  ipBlocklist,
  requestLogger,
};