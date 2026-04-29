const { Queue } = require('bullmq');
const mongoose = require('mongoose');

// Redis connection config
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
};

// Queue name
const QUEUE_NAME = 'tool-execution';

// Create the queue
const toolQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    timeout: 30000, // 30 second timeout per job
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600,
    },
  },
});

/**
 * Add a tool execution job to the queue
 * @param {object} jobData - Job data
 * @param {string} jobData.toolKey - Tool key (slug:version)
 * @param {object} jobData.tool - Tool metadata
 * @param {object} jobData.input - Tool input data
 * @param {string|null} jobData.userId - User ID
 * @param {string} jobData.requestId - Request ID for tracking (REQUIRED)
 * @param {string} [jobData.contractVersion] - Contract version
 * @param {string} [jobData.queuedAt] - ISO timestamp
 * @returns {Promise<object>} Job instance with id
 */
async function addToolJob({ toolKey, tool, input, userId, requestId, contractVersion, queuedAt }) {
  if (!requestId) {
    throw new Error('requestId is required for queued jobs');
  }

  const jobId = `tool-${toolKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const job = await toolQueue.add(
    'execute-tool',
    {
      toolKey,
      tool,
      input,
      userId,
      requestId,
      contractVersion: contractVersion || 'v1',
      queuedAt: queuedAt || new Date().toISOString()
    },
    { jobId }
  );

  console.log(`[${requestId}] Job added to queue: jobId=${job.id}, toolKey=${toolKey}`);

  return job;
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<object|null>} Job status
 */
async function getJobStatus(jobId) {
  const job = await toolQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress;

  return {
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
    requestId: job.data.requestId // Include requestId in response
  };
}

/**
 * Get queue stats
 * @returns {Promise<object>} Queue statistics
 */
async function getQueueStats() {
  const counts = await toolQueue.getJobCounts();
  return { waiting: counts.waiting, active: counts.active, completed: counts.completed, failed: counts.failed };
}

/**
 * Get jobs by requestId
 * @param {string} requestId - Request ID to search for
 * @returns {Promise<object[]>} Matching jobs
 */
async function getJobsByRequestId(requestId) {
  const [waiting, active, completed, failed] = await Promise.all([
    toolQueue.getWaiting(),
    toolQueue.getActive(),
    toolQueue.getCompleted(),
    toolQueue.getFailed(),
  ]);

  const allJobs = [...waiting, ...active, ...completed, ...failed];
  return allJobs.filter(job => job.data.requestId === requestId);
}

module.exports = {
  toolQueue,
  addToolJob,
  getJobStatus,
  getQueueStats,
  getJobsByRequestId
};