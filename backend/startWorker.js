/**
 * Worker startup script for Railway deployment
 * Run with: NODE_ENV=production node startWorker.js
 * 
 * This starts the BullMQ worker that processes queued tool executions.
 * The worker connects to Redis and processes jobs from the queue.
 * 
 * IMPORTANT: Do NOT use dotenv - rely on Railway environment variables
 */

// Remove any dotenv loading - Railway provides env vars directly
// require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { worker } = require('./workers/toolWorker');

// Validate required environment
if (!process.env.NODE_ENV) {
  console.error('[Worker] FATAL: NODE_ENV is not defined');
  process.exit(1);
}

console.log('========================================');
console.log('[Worker] Starting Tool Execution Worker');
console.log('[Worker] =======================================');
console.log(`[Worker] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Worker] Redis URL: ${process.env.REDIS_URL ? 'configured' : 'NOT SET'}`);
console.log('========================================');

// Worker will auto-connect to Redis when started
// The BullMQ worker handles connection lifecycle
console.log('[Worker] Initializing worker...');
console.log('[Worker] Worker is ready and waiting for jobs');
console.log('[Worker] =======================================');

module.exports = { worker };