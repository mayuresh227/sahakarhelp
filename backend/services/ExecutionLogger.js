const ToolExecutionLog = require('../models/ToolExecutionLog');

// ====================
// Sensitive Field Masking
// ====================
const SENSITIVE_FIELDS = [
  'gstNumber', 'gst_number', 'customerGST', 'customer_gst',
  'phone', 'mobile', 'email', 'password', 'secret', 'token',
  'apiKey', 'api_key', 'accessToken', 'access_token',
  'aadhaar', 'aadhar', 'pan', 'cardNumber', 'card_number',
  'accountNumber', 'account_number', 'ifsc', 'upi'
];

const MASK_VALUE = '***MASKED***';

/**
 * Recursively mask sensitive fields in an object
 * @param {object} data - Data to sanitize
 * @param {number} depth - Current recursion depth (prevent infinite loops)
 * @returns {object} Sanitized data
 */
function sanitizeInput(data, depth = 0) {
  if (depth > 10) return data;
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      const shouldMask = SENSITIVE_FIELDS.some(field =>
        lowerKey.includes(field.toLowerCase())
      );

      if (shouldMask) {
        sanitized[key] = MASK_VALUE;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeInput(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Get MongoDB connection status
 * @returns {boolean}
 */
function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// ====================
// Execution Logger Service
// ====================
class ExecutionLogger {
  constructor() {
    this._logId = Symbol('logId');
  }

  /**
   * Start logging a tool execution
   * @param {object} context - Execution context
   * @param {string} context.toolSlug - Tool identifier
   * @param {string|null} context.userId - User ID or null for guests
   * @param {object} context.input - Tool input data
   * @param {string} context.ipAddress - Client IP address
   * @param {string} context.userAgent - Client user agent
   * @param {string} [context.requestId] - Request ID for tracking
   * @returns {Promise<{logId: string, startTime: number}>}
   */
  async logStart({ toolSlug, userId, input, ipAddress, userAgent, requestId = null }) {
    const startTime = Date.now();

    if (!isDbConnected()) {
      console.warn(`[ExecutionLogger] DB not connected, skipping log${requestId ? ` [${requestId}]` : ''}`);
      return { logId: null, startTime };
    }

    try {
      const sanitizedInput = sanitizeInput(input);

      const logEntry = new ToolExecutionLog({
        toolSlug,
        userId: userId || null,
        input: sanitizedInput,
        status: 'processing',
        executionTimeMs: 0,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        requestId: requestId || null
      });

      const savedLog = await logEntry.save();
      
      if (requestId) {
        console.log(`[${requestId}] Execution logged: tool=${toolSlug}, logId=${savedLog._id}`);
      }
      
      return { logId: savedLog._id.toString(), startTime };
    } catch (err) {
      // Logging MUST NOT break tool execution
      console.error(`[ExecutionLogger] Failed to log start${requestId ? ` [${requestId}]` : ''}:`, err.message);
      return { logId: null, startTime };
    }
  }

  /**
   * Log successful tool execution
   * @param {string|null} logId - Log ID from logStart
   * @param {object} output - Tool output (optional)
   * @param {number} startTime - Start timestamp from logStart
   * @param {string} [requestId] - Request ID for tracking
   * @returns {Promise<void>}
   */
  async logSuccess(logId, output, startTime, requestId = null) {
    if (!logId) return;

    const executionTimeMs = Date.now() - startTime;

    try {
      await ToolExecutionLog.findByIdAndUpdate(logId, {
        status: 'completed',
        output: output ? sanitizeInput(output) : null,
        executionTimeMs,
        completedAt: new Date()
      });
      
      if (requestId) {
        console.log(`[${requestId}] Execution completed: logId=${logId}, time=${executionTimeMs}ms`);
      }
    } catch (err) {
      console.error(`[ExecutionLogger] Failed to log success${requestId ? ` [${requestId}]` : ''}:`, err.message);
    }
  }

  /**
   * Log failed tool execution
   * @param {string|null} logId - Log ID from logStart
   * @param {Error|string} error - Error object or message
   * @param {number} startTime - Start timestamp from logStart
   * @param {string} [requestId] - Request ID for tracking
   * @returns {Promise<void>}
   */
  async logError(logId, error, startTime, requestId = null) {
    if (!logId) return;

    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Error ? error.code : null;

    try {
      await ToolExecutionLog.findByIdAndUpdate(logId, {
        status: 'failed_execution',
        errorMessage: errorMessage.substring(0, 1000),
        errorCode: errorCode || null,
        executionTimeMs,
        completedAt: new Date()
      });
      
      if (requestId) {
        console.error(`[${requestId}] Execution failed: logId=${logId}, error=${errorMessage.substring(0, 200)}`);
      }
    } catch (err) {
      console.error(`[ExecutionLogger] Failed to log error${requestId ? ` [${requestId}]` : ''}:`, err.message);
    }
  }

  /**
   * Update job ID for async executions
   * @param {string} logId - Log ID from logStart
   * @param {string} jobId - Queue job ID
   * @param {string} [requestId] - Request ID for tracking
   * @returns {Promise<void>}
   */
  async logJobId(logId, jobId, requestId = null) {
    if (!logId) return;

    try {
      await ToolExecutionLog.findByIdAndUpdate(logId, {
        jobId
      });
      
      if (requestId) {
        console.log(`[${requestId}] Job queued: logId=${logId}, jobId=${jobId}`);
      }
    } catch (err) {
      console.error(`[ExecutionLogger] Failed to log jobId${requestId ? ` [${requestId}]` : ''}:`, err.message);
    }
  }
}

// Import mongoose for connection check
const mongoose = require('mongoose');

module.exports = new ExecutionLogger();