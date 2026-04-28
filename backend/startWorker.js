/**
 * Worker startup script
 * Run with: node startWorker.js
 * 
 * This starts the BullMQ worker that processes queued tool executions.
 * The worker will automatically connect to Redis and start processing jobs.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { worker } = require('./workers/toolWorker');

console.log('[Startup] Starting Tool Execution Worker...');
console.log(`[Startup] Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
console.log('[Startup] Worker is ready and waiting for jobs');

module.exports = { worker };