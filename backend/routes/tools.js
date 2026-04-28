const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const ToolMetadata = require('../models/ToolMetadata');
const ToolRegistry = require('../services/ToolRegistry');
const ToolExecutor = require('../services/ToolExecutor');
const executionLogger = require('../services/ExecutionLogger');
const { validateToolInput } = require('../validators');
const { toolExecutionLimiter, queueLimitMiddleware } = require('../middleware/rateLimiter');

const router = express.Router();
const QUERY_TIMEOUT_MS = 5000;

// HTTP Status Codes for Tool API Errors
const HTTP_STATUS = {
  VALIDATION_FAILED: 400,
  TOOL_NOT_FOUND: 404,
  TOOL_DEPRECATED: 410,
  INSUFFICIENT_CREDITS: 403,
  QUEUE_LIMIT_EXCEEDED: 429
};

// ====================
// Request Metadata Middleware
// ====================
const attachRequestMetadata = (req, res, next) => {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || null;
  req.clientUserAgent = req.headers['user-agent'] || null;
  next();
};

router.use(attachRequestMetadata);

// Apply tool execution rate limiter to POST routes
router.post('/', toolExecutionLimiter);

// ====================
// Multer Configuration
// ====================
const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
  },
};

const upload = multer(multerConfig);

// ====================
// Helper Functions
// ====================
const isDbConnected = () => mongoose.connection.readyState === 1;

const withTimeout = async (promise, timeoutMs = QUERY_TIMEOUT_MS) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Parse toolKey and resolve to tool
 * @param {string} toolKey - Format: "slug:version" or "slug" (defaults to latest)
 * @returns {{ tool: object|null, error: object|null }}
 */
const resolveTool = (toolKey) => {
  try {
    const { slug, version } = ToolRegistry.parseToolKey(toolKey);
    
    const tool = version
      ? ToolRegistry.getTool(slug, version)
      : ToolRegistry.getLatestVersion(slug);

    if (!tool) {
      return {
        tool: null,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool not found: ${toolKey}`,
          status: 404
        }
      };
    }

    return { tool, error: null };
  } catch (err) {
    return {
      tool: null,
      error: {
        code: 'INVALID_TOOL_KEY',
        message: err.message,
        status: 400
      }
    };
  }
};

/**
 * Build standard error response
 */
const errorResponse = (res, code, message, status = 500, meta = {}) => {
  return res.status(status).json({
    success: false,
    error: code,
    message,
    meta
  });
};

// ====================
// Routes
// ====================

// GET /api/tools - List all tools (latest version only)
router.get('/', async (req, res) => {
  try {
    const tools = ToolRegistry.listTools({ latestOnly: true, active: true });
    res.json({
      success: true,
      data: tools,
      meta: { count: tools.length }
    });
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch tools'
    });
  }
});

// GET /api/tools/:toolKey - Get specific tool version info
router.get('/:toolKey', async (req, res) => {
  const { toolKey } = req.params;
  
  const { tool, error } = resolveTool(toolKey);
  
  if (error) {
    return errorResponse(res, error.code, error.message, error.status);
  }

  res.json({
    success: true,
    data: {
      slug: tool.slug,
      version: tool.version,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      categories: tool.categories,
      config: tool.config,
      active: tool.active
    },
    meta: {
      tool: tool.slug,
      version: tool.version
    }
  });
});

// GET /api/tools/:toolKey/versions - List all versions of a tool
router.get('/:toolKey/versions', async (req, res) => {
  const { toolKey } = req.params;
  
  try {
    const { slug } = ToolRegistry.parseToolKey(toolKey);
    const versions = ToolRegistry.getVersions(slug);
    const latestVersion = ToolRegistry.getLatestVersion(slug)?.version;

    res.json({
      success: true,
      data: {
        slug,
        versions,
        latestVersion
      }
    });
  } catch (err) {
    return errorResponse(res, 'INVALID_TOOL_KEY', err.message, 400);
  }
});

// POST /api/tools/:toolKey - Execute tool with version-aware routing
router.post('/:toolKey', toolExecutionLimiter, queueLimitMiddleware, async (req, res) => {
  const { toolKey } = req.params;
  const requestId = req.requestId; // From global requestId middleware
  const userId = req.user?.id || null;

  // Step 1: Resolve tool with strict version check
  const { tool, error } = resolveTool(toolKey);
  
  if (error) {
    return errorResponse(res, error.code, error.message, error.status);
  }

  // Step 2: Check if tool is active
  if (!tool.active) {
    return errorResponse(res, 'TOOL_INACTIVE', `Tool is not active: ${toolKey}`, 400, {
      tool: tool.slug,
      version: tool.version
    });
  }

  // Step 3: Determine if tool expects file inputs
  const fileInputs = tool.config.inputs?.filter(input => input.type === 'file') || [];
  const hasFileInput = fileInputs.length > 0;

  if (hasFileInput) {
    // Handle file upload
    const fieldName = fileInputs[0].name;
    const isMultiple = fileInputs[0].multiple === true;
    const uploadMiddleware = isMultiple
      ? upload.array(fieldName)
      : upload.single(fieldName);

    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return errorResponse(res, 'FILE_UPLOAD_FAILED', err.message, 400);
      }

      let files = req.files || (req.file ? [req.file] : []);
      if (files.length === 0) {
        return errorResponse(res, 'NO_FILES_UPLOADED', `Please upload at least one file for field '${fieldName}'`, 400);
      }

      // Validate each file
      for (const file of files) {
        if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
          return errorResponse(res, 'INVALID_FILE_DATA', 'File buffer is missing or corrupted', 400);
        }
        if (file.mimetype !== 'application/pdf') {
          return errorResponse(res, 'INVALID_FILE_TYPE', 'Only PDF files are allowed', 400);
        }
      }

      // Build inputs object
      const inputs = { ...req.body };
      inputs[fieldName] = files;

      // Parse options JSON if present
      if (inputs.options && typeof inputs.options === 'string') {
        try {
          const options = JSON.parse(inputs.options);
          Object.assign(inputs, options);
          delete inputs.options;
        } catch (e) {
          // ignore parse error
        }
      }

      // Validate inputs
      const validation = validateToolInput(tool.slug, inputs);
      if (!validation.success) {
        return res.status(HTTP_STATUS.VALIDATION_FAILED).json({
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'Input validation failed',
          details: validation.details,
          meta: {
            tool: tool.slug,
            version: tool.version,
            requestId: req.requestId,
            contractVersion: 'v1'
          }
        });
      }

      // Start execution logging
      const { logId, startTime } = await executionLogger.logStart({
        toolSlug: tool.slug,
        userId,
        input: validation.data,
        ipAddress: req.clientIp,
        userAgent: req.clientUserAgent
      });

      try {
        // Execute with new API: { toolKey, input, userId, requestId, options }
        // Use req.idempotencyKey from middleware (userId > x-device-id > clientIp)
        const result = await ToolExecutor.execute({
          toolKey,
          input: validation.data,
          userId,
          requestId,
          options: { idempotencyKey: req.idempotencyKey }
        });

        await executionLogger.logSuccess(logId, result, startTime);
        
        // If result contains a buffer, send as file
        if (result.data?.buffer) {
          const outputBuffer = result.data.buffer;
          const fileName = result.data.fileName || `${tool.slug}.pdf`;
          const contentType = result.data.contentType || 'application/pdf';

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.setHeader('Content-Length', outputBuffer.length);
          return res.end(outputBuffer);
        }

        res.json(result);
      } catch (executionError) {
        await executionLogger.logError(logId, executionError, startTime);

        if (executionError.code === 'INSUFFICIENT_CREDITS') {
          return res.status(HTTP_STATUS.INSUFFICIENT_CREDITS).json({
            success: false,
            error: 'INSUFFICIENT_CREDITS',
            message: executionError.message,
            remainingCredits: executionError.remainingCredits || 0,
            meta: {
              tool: tool.slug,
              version: tool.version,
              requestId: req.requestId,
              contractVersion: 'v1'
            }
          });
        }
        
        if (executionError.code === 'TOOL_NOT_FOUND') {
          return errorResponse(res, 'TOOL_NOT_FOUND', executionError.message, HTTP_STATUS.TOOL_NOT_FOUND, {
            tool: tool.slug,
            version: tool.version,
            requestId: req.requestId
          });
        }
        
        if (executionError.code === 'TOOL_DEPRECATED') {
          return errorResponse(res, 'TOOL_DEPRECATED', executionError.message, HTTP_STATUS.TOOL_DEPRECATED, {
            tool: tool.slug,
            version: tool.version,
            requestId: req.requestId
          });
        }
        
        return errorResponse(res, executionError.code || 'EXECUTION_ERROR', executionError.message, executionError.status || 500, {
          tool: tool.slug,
          version: tool.version,
          requestId: req.requestId
        });
      }
    });
  } else {
    // Handle JSON body (no file inputs)
    const validation = validateToolInput(tool.slug, req.body);
    if (!validation.success) {
      return res.status(HTTP_STATUS.VALIDATION_FAILED).json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Input validation failed',
        details: validation.details,
        meta: {
          tool: tool.slug,
          version: tool.version,
          requestId: req.requestId,
          contractVersion: 'v1'
        }
      });
    }

    // Start execution logging
    const { logId, startTime } = await executionLogger.logStart({
      toolSlug: tool.slug,
      userId,
      input: validation.data,
      ipAddress: req.clientIp,
      userAgent: req.clientUserAgent
    });

    try {
      // Execute with new API: { toolKey, input, userId, requestId, options }
      // Use req.idempotencyKey from middleware (userId > x-device-id > clientIp)
      const result = await ToolExecutor.execute({
        toolKey,
        input: validation.data,
        userId,
        requestId,
        options: { idempotencyKey: req.idempotencyKey }
      });

      await executionLogger.logSuccess(logId, result, startTime);
      res.json(result);
    } catch (executionError) {
      await executionLogger.logError(logId, executionError, startTime);

      if (executionError.code === 'INSUFFICIENT_CREDITS') {
        return res.status(HTTP_STATUS.INSUFFICIENT_CREDITS).json({
          success: false,
          error: 'INSUFFICIENT_CREDITS',
          message: executionError.message,
          remainingCredits: executionError.remainingCredits || 0,
          meta: {
            tool: tool.slug,
            version: tool.version,
            requestId: req.requestId,
            contractVersion: 'v1'
          }
        });
      }
      
      if (executionError.code === 'TOOL_NOT_FOUND') {
        return errorResponse(res, 'TOOL_NOT_FOUND', executionError.message, HTTP_STATUS.TOOL_NOT_FOUND, {
          tool: tool.slug,
          version: tool.version,
          requestId: req.requestId
        });
      }
      
      if (executionError.code === 'TOOL_DEPRECATED') {
        return errorResponse(res, 'TOOL_DEPRECATED', executionError.message, HTTP_STATUS.TOOL_DEPRECATED, {
          tool: tool.slug,
          version: tool.version,
          requestId: req.requestId
        });
      }
      
      return errorResponse(res, executionError.code || 'EXECUTION_ERROR', executionError.message, executionError.status || 500, {
        tool: tool.slug,
        version: tool.version,
        requestId: req.requestId
      });
    }
  }
});

module.exports = router;