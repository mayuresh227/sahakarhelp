/**
 * Request ID Middleware
 * - Uses x-request-id header if present, otherwise generates crypto.randomUUID()
 * - Sets x-device-id header for idempotencyKey generation
 * - Attaches to req.requestId and req.idempotencyKey
 * 
 * IdempotencyKey priority:
 * 1. req.user?.id (logged-in user)
 * 2. x-device-id header (recommended for frontend)
 * 3. req.clientIp (fallback for guests)
 */
const { randomUUID } = require('crypto');

const requestIdMiddleware = (req, res, next) => {
  // Request ID for tracking
  req.requestId = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.requestId);

  // IdempotencyKey for duplicate prevention
  // Priority: userId > x-device-id header > clientIp
  if (req.user?.id) {
    req.idempotencyKey = String(req.user.id);
  } else if (req.headers['x-device-id']) {
    req.idempotencyKey = req.headers['x-device-id'];
  } else {
    req.idempotencyKey = req.clientIp || 'anonymous';
  }

  next();
};

module.exports = { requestIdMiddleware };