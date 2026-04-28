const ToolRegistry = require('./ToolRegistry');
const { addToolJob, toolQueue } = require('../queues/toolQueue');
const JobResult = require('../models/JobResult');
const ToolExecutionLog = require('../models/ToolExecutionLog');
const UsageService = require('./UsageService');

// ====================
// Contract Version Constant
// ====================
const CONTRACT_VERSION = 'v1';

// HTTP Status Codes for Tool API Errors
const HTTP_STATUS = {
  INVALID_TOOL_KEY: 400,
  VERSION_REQUIRED: 400,
  VALIDATION_FAILED: 400,
  TOOL_NOT_FOUND: 404,
  TOOL_INACTIVE: 400,
  TOOL_DEPRECATED: 410,
  INSUFFICIENT_CREDITS: 403,
  QUEUE_LIMIT_EXCEEDED: 429,
  ENGINE_NOT_FOUND: 500,
  EXECUTION_ERROR: 500
};

const TOOL_KEY_REGEX = /^[a-z0-9_-]+:v\d+$/;
const TOOL_KEY_PATTERN = 'slug:version (e.g., emi_calculator:v1)';

/**
 * ToolExecutor - Production-hardened version-aware tool execution router
 * Enforces strict tool API contract with version-aware routing
 */
class ToolExecutor {
  constructor() {
    this.engines = new Map();
  }

  /**
   * Register an engine instance
   * @param {string} engineType - Engine type identifier (calculator, pdf, image, document)
   * @param {object} engineInstance - Engine instance with execute(tool, input, context) method
   */
  registerEngine(engineType, engineInstance) {
    if (!engineType) {
      throw new Error('Engine type is required');
    }
    if (!engineInstance || typeof engineInstance.execute !== 'function') {
      throw new Error(`Engine ${engineType} must implement execute(tool, input, context) method`);
    }
    this.engines.set(engineType, engineInstance);
    return this;
  }

  /**
   * Get engine by type
   * @param {string} engineType - Engine type
   * @returns {object|undefined} Engine instance
   */
  getEngine(engineType) {
    return this.engines.get(engineType);
  }

  /**
   * Check if engine type is registered
   * @param {string} engineType - Engine type
   * @returns {boolean}
   */
  hasEngine(engineType) {
    return this.engines.has(engineType);
  }

  /**
   * Get list of registered engines
   * @returns {string[]}
   */
  getRegisteredEngines() {
    return Array.from(this.engines.keys());
  }
  
  /**
   * Acquire idempotency lock via atomic insert
   * @param {string} idempotencyKey - Unique idempotency key (userId or generated)
   * @param {string} requestId - Request ID
   * @param {string} toolSlug - Tool slug
   * @returns {{ acquired: boolean, existingResult: object|null, status: string|null }}
   */
  async acquireIdempotencyLock(idempotencyKey, requestId, toolSlug) {
    if (!idempotencyKey || !requestId) {
      return { acquired: false, existingResult: null, status: null };
    }
  
    try {
      // Use insertOne for atomic operation - fails if duplicate
      await JobResult.collection.insertOne({
        idempotencyKey,
        requestId,
        toolSlug,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { acquired: true, existingResult: null, status: null };
    } catch (err) {
      // Duplicate key error = already processing/completed
      if (err.code === 11000) {
        const existing = await JobResult.findOne({ idempotencyKey, requestId })
          .select('status result error')
          .lean();
  
        if (existing) {
          // If completed/failed_validation/failed_execution/timeout, return existing result
          const terminalStatuses = ['completed', 'failed_validation', 'failed_execution', 'timeout'];
          if (terminalStatuses.includes(existing.status)) {
            return {
              acquired: false,
              existingResult: existing.result || {
                success: existing.status === 'completed',
                data: existing.status === 'completed' ? existing.result?.data : null,
                meta: { requestId }
              },
              status: existing.status
            };
          }
  
          // If still processing, return standardized processing response
          return {
            acquired: false,
            existingResult: {
              success: true,
              data: null,
              meta: { status: 'processing', requestId, contractVersion: CONTRACT_VERSION }
            },
            status: 'processing'
          };
        }
      }
  
      // Other error - log and allow execution
      console.error(`[${requestId}] Idempotency lock error:`, err.message);
      return { acquired: false, existingResult: null, status: null };
    }
  }
  
  /**
   * Finalize JobResult - only if still processing (race-condition safe)
   * @param {string} idempotencyKey - Idempotency key
   * @param {string} requestId - Request ID
   * @param {string} finalStatus - 'completed' | 'failed_validation' | 'failed_execution' | 'timeout'
   * @param {object} result - Full standardized result
   * @returns {Promise<boolean>} - true if finalized, false if already finalized
   */
  async finalizeJobResult(idempotencyKey, requestId, finalStatus, result) {
    if (!idempotencyKey || !requestId) return false;
  
    const updateResult = await JobResult.collection.updateOne(
      { idempotencyKey, requestId, status: 'processing' },
      {
        $set: {
          status: finalStatus,
          result,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  
    return updateResult.modifiedCount > 0;
  }
  
  /**
   * Get cached result from JobResult (single source of truth)
   * @param {string} idempotencyKey - Idempotency key
   * @param {string} requestId - Request ID
   * @returns {Promise<object|null>}
   */
  async getCachedResult(idempotencyKey, requestId) {
    if (!idempotencyKey || !requestId) return null;
  
    try {
      const jobResult = await JobResult.findOne({ idempotencyKey, requestId })
        .select('status result')
        .lean();
  
      if (jobResult && ['completed', 'failed', 'timeout'].includes(jobResult.status)) {
        return jobResult.result;
      }
  
      return null;
    } catch (err) {
      console.error(`[${requestId}] Cache lookup failed:`, err.message);
      return null;
    }
  }

  /**
   * Validate toolKey format
   * @param {string} toolKey - Tool key to validate
   * @param {boolean} allowNoVersion - If true, allow keys without version (for metadata APIs)
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateToolKeyFormat(toolKey, allowNoVersion = false) {
    if (!toolKey || typeof toolKey !== 'string') {
      return { valid: false, error: 'toolKey must be a non-empty string' };
    }

    // Allow slug without version only for metadata lookups
    if (allowNoVersion && !toolKey.includes(':')) {
      if (!/^[a-z0-9_-]+$/.test(toolKey)) {
        return { valid: false, error: `Invalid tool slug format: "${toolKey}". Use lowercase letters, numbers, underscores, hyphens.` };
      }
      return { valid: true, error: null };
    }

    // Full toolKey format: slug:version
    if (!TOOL_KEY_REGEX.test(toolKey)) {
      return {
        valid: false,
        error: `Invalid toolKey format: "${toolKey}". Expected format: ${TOOL_KEY_PATTERN}`
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Parse toolKey into slug and version
   * @param {string} toolKey - Format: "slug:version"
   * @returns {{ slug: string, version: string|null, key: string|null }}
   */
  parseToolKey(toolKey) {
    return ToolRegistry.parseToolKey(toolKey);
  }

  /**
   * Check deprecation status with improved model
   * deprecated: true + status: "active" → allow + warning
   * deprecated: true + status: "deprecated" → allow + warning
   * deprecated: true + status: "sunset" OR sunsetDate passed → block with 410
   * @param {object} tool - Tool metadata
   * @returns {{ allowed: boolean, warning: object|null, expired: boolean }}
   */
  checkDeprecation(tool) {
    const sunsetDate = tool.sunsetDate || tool.config?.sunsetDate || null;
    const now = new Date();
    const isExpired = sunsetDate && new Date(sunsetDate) < now;

    if (isExpired) {
      return {
        allowed: false,
        warning: {
          deprecated: true,
          status: 'sunset',
          message: `This tool version expired on ${sunsetDate}`,
          sunsetDate
        },
        expired: true
      };
    }

    if (tool.deprecated) {
      const status = tool.config?.status || 'deprecated';
      return {
        allowed: true,
        warning: {
          deprecated: true,
          status,
          message: status === 'deprecated'
            ? 'This tool version is deprecated and will be removed'
            : 'This tool version is deprecated',
          sunsetDate
        },
        expired: false
      };
    }

    return { allowed: true, warning: null, expired: false };
  }

  /**
   * Build standard success response
   * @param {object} data - Response data
   * @param {object} tool - Tool metadata
   * @param {number} executionTimeMs - Execution time in ms
   * @param {object} [options] - Additional options
   * @returns {object}
   */
  buildSuccessResponse(data, tool, executionTimeMs, options = {}) {
    const response = {
      success: true,
      data,
      meta: {
        tool: tool.slug,
        version: tool.version,
        contractVersion: CONTRACT_VERSION,
        executionTimeMs
      }
    };

    // Add deprecation warning if applicable
    const deprecationWarning = this.checkDeprecation(tool);
    if (deprecationWarning) {
      response.meta.deprecation = deprecationWarning;
    }

    // Add requestId if provided
    if (options.requestId) {
      response.meta.requestId = options.requestId;
    }

    return response;
  }

  /**
   * Build standard error response
   * @param {string} code - Error code
   * @param {string} message - Error message
   * @param {object} [tool] - Tool metadata (optional)
   * @param {string} [requestId] - Request ID for tracking
   * @returns {object}
   */
  buildErrorResponse(code, message, tool = null, requestId = null) {
    const error = {
      success: false,
      error: code,
      message,
      meta: {
        contractVersion: CONTRACT_VERSION
      }
    };

    if (tool) {
      error.meta.tool = tool.slug;
      error.meta.version = tool.version;
    }

    if (requestId) {
      error.meta.requestId = requestId;
    }

    return error;
  }

  /**
   * Execute a tool by toolKey with given input
   * STRICT MODE: Version is REQUIRED for execution
   * @param {object} params - Execution parameters
   * @param {string} params.toolKey - Tool identifier with version (e.g., "emi_calculator:v1")
   * @param {object} params.input - Tool input data
   * @param {string} [params.userId] - User ID
   * @param {string} [params.requestId] - Request ID for tracking
   * @param {object} [params.options] - Additional options (idempotencyKey, etc.)
   * @returns {Promise<object>} Standard success response
   * @throws {Error} If tool not found, inactive, or engine error
   */
  async execute({ toolKey, input, userId = null, requestId = null, options = {} }) {
    const startTime = Date.now();
    const resolvedRequestId = requestId || `req-${Date.now()}`;

    // Step 1: Validate toolKey format (strict - version required)
    if (!toolKey) {
      throw Object.assign(new Error('toolKey is required'), {
        code: 'INVALID_TOOL_KEY',
        status: 400,
        requestId: resolvedRequestId
      });
    }

    const formatCheck = this.validateToolKeyFormat(toolKey, false);
    if (!formatCheck.valid) {
      const err = new Error(formatCheck.error);
      err.code = 'INVALID_TOOL_KEY';
      err.status = 400;
      err.requestId = resolvedRequestId;
      throw err;
    }

    const { slug, version } = this.parseToolKey(toolKey);

    // Step 2: Version is STRICTLY required - no fallback for execution
    if (!version) {
      const err = new Error(`Version is required for tool execution. Use format: ${TOOL_KEY_PATTERN}`);
      err.code = 'VERSION_REQUIRED';
      err.status = 400;
      err.meta = { tool: slug };
      err.requestId = resolvedRequestId;
      throw err;
    }

    // Step 3: Resolve tool (exact version required)
    const tool = ToolRegistry.getTool(slug, version);

    if (!tool) {
      const err = new Error(`Tool not found: ${toolKey}`);
      err.code = 'TOOL_NOT_FOUND';
      err.status = 404;
      err.meta = { tool: slug, version };
      err.requestId = resolvedRequestId;
      throw err;
    }

    // Step 4: Check tool is active
    if (!tool.active) {
      const err = new Error(`Tool is not active: ${tool.slug}:${tool.version}`);
      err.code = 'TOOL_INACTIVE';
      err.status = 400;
      err.meta = { tool: tool.slug, version: tool.version };
      err.requestId = resolvedRequestId;
      throw err;
    }

    // Step 5: Check deprecation status (improved model)
    const deprecationResult = this.checkDeprecation(tool);
    if (!deprecationResult.allowed) {
      const err = new Error(deprecationResult.warning.message);
      err.code = 'TOOL_DEPRECATED';
      err.status = HTTP_STATUS.TOOL_DEPRECATED; // 410
      err.meta = {
        tool: tool.slug,
        version: tool.version,
        sunsetDate: deprecationResult.warning.sunsetDate
      };
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    // Step 6: Atomic idempotency lock - prevents race conditions
    // idempotencyKey is passed as options.idempotencyKey or derived from userId
    const idempotencyKey = options.idempotencyKey || userId;
    if (idempotencyKey && resolvedRequestId) {
      const lockResult = await this.acquireIdempotencyLock(
        idempotencyKey,
        resolvedRequestId,
        tool.slug
      );
    
      if (!lockResult.acquired) {
        // Return existing result (completed/failed) or processing status
        return lockResult.existingResult;
      }
    }
    
    // Step 7: Reserve credits before execution (consistent billing)
    const reservationResult = await UsageService.reserveCredits(userId, tool.slug, null, { requestId: resolvedRequestId });
    if (!reservationResult.success) {
      const err = new Error('Insufficient credits');
      err.code = 'INSUFFICIENT_CREDITS';
      err.status = HTTP_STATUS.INSUFFICIENT_CREDITS; // 403
      err.remainingCredits = reservationResult.remainingCredits;
      err.requestId = resolvedRequestId;
      throw err;
    }
    const reservationId = reservationResult.reservationId;
    
    // Step 8: Get the appropriate engine
    const engine = this.engines.get(tool.type);
    if (!engine) {
      const err = new Error(`Engine type not found: ${tool.type}`);
      err.code = 'ENGINE_NOT_FOUND';
      err.status = 500;
      err.requestId = resolvedRequestId;
      throw err;
    }

    // Step 8: Execute via engine with full context including requestId
    const context = {
      userId,
      requestId: resolvedRequestId,
      toolKey,
      contractVersion: CONTRACT_VERSION
    };

    try {
      // Engines MUST return raw data - we wrap it here
      const rawResult = await Promise.resolve(
        engine.execute(tool, input, context)
      );
    
      // Step 9: Finalize reservation on success
      if (reservationId) {
        await UsageService.finalizeReservation(reservationId);
      }
    
      const executionTimeMs = Date.now() - startTime;
      
      // ALWAYS wrap in standard response format
      const fullResponse = this.buildSuccessResponse(rawResult, tool, executionTimeMs, {
        requestId: resolvedRequestId,
        deprecationWarning: deprecationResult.warning
      });
      
      // Step 10: Finalize JobResult (race-condition safe - only if still processing)
      const idempotencyKey = options.idempotencyKey || userId;
      await this.finalizeJobResult(idempotencyKey, resolvedRequestId, 'completed', fullResponse);
      
      return fullResponse;

    } catch (err) {
      const executionTimeMs = Date.now() - startTime;
    
      // Determine failure type
      let failureStatus = 'failed_execution';
      if (err.code === 'VALIDATION_FAILED' || err.message.includes('validation')) {
        failureStatus = 'failed_validation';
      }
    
      // Build error response
      const errorResponse = this.buildErrorResponse(err.code || 'EXECUTION_ERROR', err.message, tool, resolvedRequestId);
      errorResponse.meta.executionTimeMs = executionTimeMs;
    
      // Finalize JobResult with failure status (race-condition safe)
      const idempotencyKey = options.idempotencyKey || userId;
      await this.finalizeJobResult(idempotencyKey, resolvedRequestId, failureStatus, errorResponse);
      
      // Release reservation on failure (refund credits)
      if (reservationId) {
        await UsageService.releaseReservation(reservationId, userId, tool.slug, null);
      }
      
      // Wrap engine errors with context
      const wrappedError = new Error(`Tool execution failed: ${err.message}`);
      wrappedError.code = err.code || 'EXECUTION_ERROR';
      wrappedError.status = err.status || 500;
      wrappedError.originalError = err;
      wrappedError.meta = {
        tool: tool.slug,
        version: tool.version,
        executionTimeMs,
        contractVersion: CONTRACT_VERSION
      };
      wrappedError.requestId = resolvedRequestId;
      throw wrappedError;
    }
  }

  /**
   * Execute tool synchronously (for engines that don't return promises)
   * STRICT MODE: Version is REQUIRED
   */
  executeSync({ toolKey, input, context = {} }) {
    const startTime = Date.now();
    const resolvedRequestId = context.requestId || `req-${Date.now()}`;

    if (!toolKey) {
      throw Object.assign(new Error('toolKey is required'), {
        code: 'INVALID_TOOL_KEY',
        status: 400,
        requestId: resolvedRequestId
      });
    }

    const formatCheck = this.validateToolKeyFormat(toolKey, false);
    if (!formatCheck.valid) {
      const err = new Error(formatCheck.error);
      err.code = 'INVALID_TOOL_KEY';
      err.status = 400;
      err.requestId = resolvedRequestId;
      throw err;
    }

    const { slug, version } = this.parseToolKey(toolKey);

    if (!version) {
      const err = new Error(`Version is required. Use format: ${TOOL_KEY_PATTERN}`);
      err.code = 'VERSION_REQUIRED';
      err.status = 400;
      err.meta = { tool: slug };
      err.requestId = resolvedRequestId;
      throw err;
    }

    const tool = ToolRegistry.getTool(slug, version);

    if (!tool) {
      const err = new Error(`Tool not found: ${toolKey}`);
      err.code = 'TOOL_NOT_FOUND';
      err.status = 404;
      err.requestId = resolvedRequestId;
      throw err;
    }

    if (!tool.active) {
      const err = new Error(`Tool is not active: ${tool.slug}:${tool.version}`);
      err.code = 'TOOL_INACTIVE';
      err.status = 400;
      err.requestId = resolvedRequestId;
      throw err;
    }

    const deprecationResult = this.checkDeprecation(tool);
    if (!deprecationResult.allowed) {
      const err = new Error(deprecationResult.warning.message);
      err.code = 'TOOL_DEPRECATED';
      err.status = HTTP_STATUS.TOOL_DEPRECATED; // 410
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    const engine = this.engines.get(tool.type);
    if (!engine) {
      const err = new Error(`Engine type not found: ${tool.type}`);
      err.code = 'ENGINE_NOT_FOUND';
      err.status = 500;
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    const fullContext = {
      ...context,
      requestId: resolvedRequestId,
      toolKey,
      contractVersion: CONTRACT_VERSION
    };
    
    // Engines return raw data - we wrap it
    const rawResult = engine.execute(tool, input, fullContext);
    const executionTimeMs = Date.now() - startTime;
    
    return this.buildSuccessResponse(rawResult, tool, executionTimeMs, {
      requestId: resolvedRequestId,
      deprecationWarning: deprecationResult.warning
    });
  }

  /**
   * Execute a tool asynchronously (queued for heavy tools)
   * STRICT MODE: Version is REQUIRED
   * @param {object} params - Execution parameters
   * @param {string} params.toolKey - Tool identifier with version
   * @param {object} params.input - Tool input data
   * @param {string} [params.userId] - User ID
   * @param {string} [params.requestId] - Request ID for tracking
   * @param {object} [params.options] - Additional options (idempotencyKey, etc.)
   */
  async executeAsync({ toolKey, input, userId = null, requestId = null, options = {} }) {
    const resolvedRequestId = requestId || `req-${Date.now()}`;

    if (!toolKey) {
      throw Object.assign(new Error('toolKey is required'), {
        code: 'INVALID_TOOL_KEY',
        status: 400,
        requestId: resolvedRequestId
      });
    }

    const formatCheck = this.validateToolKeyFormat(toolKey, false);
    if (!formatCheck.valid) {
      const err = new Error(formatCheck.error);
      err.code = 'INVALID_TOOL_KEY';
      err.status = 400;
      err.requestId = resolvedRequestId;
      throw err;
    }

    const { slug, version } = this.parseToolKey(toolKey);

    if (!version) {
      const err = new Error(`Version is required. Use format: ${TOOL_KEY_PATTERN}`);
      err.code = 'VERSION_REQUIRED';
      err.status = 400;
      err.meta = { tool: slug };
      err.requestId = resolvedRequestId;
      throw err;
    }

    const tool = ToolRegistry.getTool(slug, version);

    if (!tool) {
      const err = new Error(`Tool not found: ${toolKey}`);
      err.code = 'TOOL_NOT_FOUND';
      err.status = 404;
      err.requestId = resolvedRequestId;
      throw err;
    }

    if (!tool.active) {
      const err = new Error(`Tool is not active: ${tool.slug}:${tool.version}`);
      err.code = 'TOOL_INACTIVE';
      err.status = 400;
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    // Check deprecation status
    const deprecationResult = this.checkDeprecation(tool);
    if (!deprecationResult.allowed) {
      const err = new Error(deprecationResult.warning.message);
      err.code = 'TOOL_DEPRECATED';
      err.status = HTTP_STATUS.TOOL_DEPRECATED; // 410
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    // Check usage credits
    const usageCheck = await UsageService.checkUsage(userId, tool.slug, null, { requestId: resolvedRequestId });
    if (!usageCheck.allowed) {
      const err = new Error('Insufficient credits');
      err.code = 'INSUFFICIENT_CREDITS';
      err.status = HTTP_STATUS.INSUFFICIENT_CREDITS; // 403
      err.remainingCredits = usageCheck.remainingCredits;
      err.requestId = resolvedRequestId;
      throw err;
    }
    
    const asyncToolTypes = ['pdf', 'image'];
    const shouldQueue = asyncToolTypes.includes(tool.type);
    
    if (shouldQueue) {
      const userActiveJobs = await toolQueue.getJobs(['waiting', 'active']);
      const userJobCount = userActiveJobs.filter(job => job.data.userId === userId).length;
    
      if (userJobCount >= 10) {
        const err = new Error('Job queue limit exceeded. Please wait for existing jobs to complete.');
        err.code = 'QUEUE_LIMIT_EXCEEDED';
        err.status = HTTP_STATUS.QUEUE_LIMIT_EXCEEDED; // 429
        err.requestId = resolvedRequestId;
        throw err;
      }

      // Add to queue with FULL context including requestId and idempotencyKey
      const idempotencyKey = options.idempotencyKey || userId;
      const jobData = {
        toolKey,
        tool: { slug: tool.slug, type: tool.type, version: tool.version },
        input,
        userId,
        requestId: resolvedRequestId, // Propagated to worker
        idempotencyKey, // For JobResult compound index
        contractVersion: CONTRACT_VERSION,
        queuedAt: new Date().toISOString()
      };

      const job = await addToolJob(jobData);

      return {
        success: true,
        data: {
          jobId: job.id,
          status: 'queued',
          tool: tool.slug,
          version: tool.version,
          message: 'Job queued for processing'
        },
        meta: {
          tool: tool.slug,
          version: tool.version,
          contractVersion: CONTRACT_VERSION,
          executionTimeMs: 0,
          requestId: resolvedRequestId
        }
      };
    }

    // Execute synchronously
    return this.execute({ toolKey, input, userId, requestId: resolvedRequestId, options });
  }

  /**
   * Get tool metadata with relaxed version check (for metadata APIs only)
   * This is the ONLY place where version fallback is allowed
   * @param {string} toolKey - Tool key (version optional)
   * @returns {Promise<object|null>}
   */
  async getToolMetadata(toolKey) {
    const formatCheck = this.validateToolKeyFormat(toolKey, true); // Allow no version
    if (!formatCheck.valid) {
      return null;
    }

    const { slug, version } = this.parseToolKey(toolKey);

    const tool = version
      ? ToolRegistry.getTool(slug, version)
      : ToolRegistry.getLatestVersion(slug);

    if (!tool) {
      return null;
    }

    const deprecationWarning = this.checkDeprecation(tool);

    return {
      slug: tool.slug,
      version: tool.version,
      name: tool.name,
      description: tool.description,
      type: tool.type,
      categories: tool.categories,
      config: tool.config,
      active: tool.active,
      deprecated: tool.deprecated || false,
      sunsetDate: tool.sunsetDate || null,
      deprecationWarning
    };
  }
}

// Export singleton
const toolExecutor = new ToolExecutor();
module.exports = toolExecutor;
module.exports.CONTRACT_VERSION = CONTRACT_VERSION;