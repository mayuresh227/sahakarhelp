const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const ToolExecutor = require('../services/ToolExecutor');
const ExecutionLogger = require('../services/ExecutionLogger');
const JobResult = require('../models/JobResult');
const UsageService = require('../services/UsageService');

// Redis connection config
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};

const QUEUE_NAME = 'tool-execution';

/**
 * Update job result in database
 * @param {string} jobId - Job ID
 * @param {object} data - Update data
 * @param {string} [requestId] - Request ID for logging
 */
async function updateJobResult(jobId, data, requestId = null) {
  try {
    await JobResult.findOneAndUpdate(
      { jobId },
      { ...data, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error(`[Worker${requestId ? ` [${requestId}]` : ''}] Failed to update JobResult for ${jobId}:`, err.message);
  }
}

/**
 * Process a tool execution job
 * BullMQ handles timeout via job options - no Promise.race needed
 * @param {object} job - BullMQ job
 * @returns {Promise<object>} Execution result
 */
async function processJob(job) {
  const { toolKey, tool, input, userId, requestId, idempotencyKey, contractVersion } = job.data;
  const jobId = job.id;

  // requestId is REQUIRED and logged everywhere
  const logPrefix = requestId ? `[${requestId}]` : `[Worker:${jobId}]`;

  console.log(`${logPrefix} Processing job: jobId=${jobId}, toolKey=${toolKey}, contractVersion=${contractVersion || 'v1'}`);

  // Update status to processing with idempotencyKey for compound index
  await updateJobResult(jobId, { status: 'processing', toolKey, requestId, idempotencyKey }, requestId);

  // Log start via ExecutionLogger with requestId
  const logContext = {
    toolSlug: tool?.slug || toolKey?.split(':')[0],
    userId: userId || null,
    input,
    ipAddress: null,
    userAgent: null,
    requestId // Propagated for tracking
  };

  let logResult;
  try {
    logResult = await ExecutionLogger.logStart(logContext);
  } catch (err) {
    console.warn(`${logPrefix} Failed to log start for ${jobId}:`, err.message);
  }

  const startTime = Date.now();

  // Execute without Promise.race - BullMQ handles timeout via job options
  // If job times out, BullMQ will throw with timeout error
  let result;
  try {
    result = await ToolExecutor.execute({
      toolKey,
      input,
      userId,
      requestId,
      options: { idempotencyKey }
    });

    const executionTime = Date.now() - startTime;

    // Log success with requestId
    if (logResult?.logId) {
      try {
        await ExecutionLogger.logSuccess(logResult.logId, result, executionTime, requestId);
      } catch (err) {
        console.warn(`${logPrefix} Failed to log success for ${jobId}:`, err.message);
      }
    }

    // Update job result with FULL standardized response
    await updateJobResult(jobId, {
      status: 'completed',
      result: {
        success: true,
        data: result.data,
        meta: result.meta
      },
      executionTimeMs: executionTime,
      requestId
    }, requestId);

    console.log(`${logPrefix} Job completed: jobId=${jobId}, time=${executionTime}ms`);

    return result;
  } catch (err) {
    const executionTime = Date.now() - startTime;
    // BullMQ timeout error messages contain "timeout" or "Timed out"
    const isTimeout = err.message.includes('Timed out') || 
                      err.message.includes('timeout') ||
                      err.message.includes('Exceeded timeout');

    // Log error with requestId
    if (logResult?.logId) {
      try {
        await ExecutionLogger.logError(logResult.logId, err, executionTime, requestId);
      } catch (logErr) {
        console.warn(`${logPrefix} Failed to log error for ${jobId}:`, logErr.message);
      }
    }

    // Update job result with error
    // Classify failure type based on error code
    let failureStatus = 'failed_execution';
    if (isTimeout) {
      failureStatus = 'timeout';
    } else if (err.code === 'VALIDATION_FAILED' || err.message.includes('validation')) {
      failureStatus = 'failed_validation';
    }
    
    await updateJobResult(jobId, {
      status: failureStatus,
      error: {
        message: err.message,
        code: err.code,
        stack: err.stack
      },
      executionTimeMs: executionTime,
      requestId
    }, requestId);

    // On timeout or execution failure: refund credits (validation failures don't charge)
    // failed_validation means credits were never consumed
    if (isTimeout || failureStatus === 'failed_execution') {
      try {
        await UsageService.refundCredits(userId, tool?.slug || toolKey?.split(':')[0], null, { requestId });
        console.log(`${logPrefix} Credits refunded for ${failureStatus} job`);
      } catch (refundErr) {
        console.error(`${logPrefix} Failed to refund credits:`, refundErr.message);
      }
    }

    console.error(`${logPrefix} Job ${isTimeout ? 'timed out' : 'failed'}: jobId=${jobId}, error=${err.message}`);
    // Re-throw to let BullMQ handle retry/failure
    throw err;
  }
}

// Create the worker
const worker = new Worker(QUEUE_NAME, processJob, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Worker event handlers with requestId logging
worker.on('completed', (job, result) => {
  const requestId = job.data.requestId;
  const logPrefix = requestId ? `[${requestId}]` : `[Worker:${job.id}]`;
  console.log(`${logPrefix} Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  const requestId = job?.data?.requestId;
  const logPrefix = requestId ? `[${requestId}]` : `[Worker:${job?.id}]`;
  console.error(`${logPrefix} Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);

  // Refund credits on permanent failure (after all retries exhausted)
  if (job?.data?.userId && requestId) {
    try {
      const result = await UsageService.refundCredits(
        job.data.userId,
        job.data.tool?.slug || job.data.toolKey?.split(':')[0],
        null,
        { requestId }
      );
      console.log(`${logPrefix} Credit refund result:`, result);
    } catch (refundErr) {
      console.error(`${logPrefix} Failed to refund credits:`, refundErr.message);
    }
  }
});

worker.on('error', (err) => {
  console.error(`[Worker] Unexpected error:`, err.message);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[Worker] Shutting down gracefully...');
  await worker.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { worker, processJob };