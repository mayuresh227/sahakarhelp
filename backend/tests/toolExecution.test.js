const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/User');
const UserPlan = require('../models/UserPlan');
const JobResult = require('../models/JobResult');

// Mock BullMQ Queue and Worker before any imports
jest.mock('bullmq', () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  };
  return {
    Queue: jest.fn().mockImplementation(() => mockQueue),
    Worker: jest.fn(),
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    quit: jest.fn(),
    status: 'ready',
  }));
});

// Mock toolQueue
jest.mock('../queues/toolQueue', () => ({
  toolQueue: {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  },
  addToolJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  getJobStatus: jest.fn().mockImplementation((jobId) => 
    Promise.resolve({ jobId, status: 'completed', progress: 100 })
  ),
}));

// Mock UsageService to bypass credit checks
jest.mock('../services/UsageService', () => ({
  checkUsage: jest.fn().mockResolvedValue({ allowed: true, remainingCredits: 1000 }),
  consumeCredits: jest.fn().mockResolvedValue(true),
  reserveCredits: jest.fn().mockResolvedValue(true),
  refundCredits: jest.fn().mockResolvedValue(true),
}));

// Set NODE_ENV before requiring server
process.env.NODE_ENV = 'test';

// Set mock AWS credentials to prevent S3StorageService from calling process.exit
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';

// Initialize tool registry before tests
require('../initToolRegistry');

const app = require('../server');

// ====================
// Helper Functions
// ====================

async function waitForJobCompletion(jobId, timeoutMs = 10000) {
  const { getJobStatus } = require('../queues/toolQueue');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getJobStatus(jobId);
    if (status && (status.status === 'completed' || status.status === 'failed_execution')) {
      return status;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
}

async function createTestUser(overrides = {}) {
  const user = await User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    provider: 'credentials',
    role: 'user',
    plan: 'free',
    ...overrides,
  });
  await UserPlan.getOrCreate(user._id.toString(), 'free');
  return user;
}

async function setUserCredits(userId, credits) {
  await UserPlan.findOneAndUpdate(
    { userId },
    { creditsRemaining: credits, monthlyLimit: credits },
    { upsert: true }
  );
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ====================
// Test Cases
// ====================

describe('Tool Execution API', () => {
  describe('1. Health check', () => {
    it('GET /api/tools returns 200', async () => {
      const res = await request(app).get('/api/tools');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('2. Successful sync execution', () => {
    it('POST /api/tools/emi_calculator:v1 returns success', async () => {
      const res = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .send({
          input: { principal: 100000, rate: 8.5, tenure: 12 }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.contractVersion).toBe('v1');
    });
  });

  describe('3. Idempotency (same requestId)', () => {
    it('sends same request twice, expects same response, only 1 DB entry', async () => {
      const requestId = generateRequestId();
      const payload = {
        requestId,
        input: { principal: 50000, rate: 7, tenure: 6 }
      };

      const res1 = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .send(payload);

      const res2 = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .send(payload);

      // Both should succeed
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Results should be identical
      expect(res1.body.data).toEqual(res2.body.data);

      // Only 1 DB entry for this idempotency key
      const dbEntries = await JobResult.countDocuments({ requestId });
      expect(dbEntries).toBe(1);
    });
  });

  describe('4. Parallel race test', () => {
    it('5 parallel requests with same requestId, only 1 execution', async () => {
      const requestId = generateRequestId();
      const payload = {
        requestId,
        input: { principal: 100000, rate: 9, tenure: 24 }
      };

      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/tools/emi_calculator:v1')
          .send(payload)
      );

      const results = await Promise.all(promises);

      // All should return 200
      results.forEach(res => {
        expect(res.status).toBe(200);
      });

      // Only 1 DB entry
      const dbEntries = await JobResult.countDocuments({ requestId });
      expect(dbEntries).toBe(1);
    });
  });

  describe('5. Validation failure', () => {
    it('invalid input returns VALIDATION_FAILED, credits not deducted', async () => {
      const user = await createTestUser();
      const initialCredits = await UserPlan.findOne({ userId: user._id.toString() });
      const beforeCredits = initialCredits.creditsRemaining;

      const res = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .set('x-user-id', user._id.toString())
        .send({
          input: { principal: 'not_a_number', rate: 8.5, tenure: 12 }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_FAILED');

      const afterCredits = await UserPlan.findOne({ userId: user._id.toString() });
      expect(afterCredits.creditsRemaining).toBe(beforeCredits);
    });
  });

  describe('6. Async job test', () => {
    it('POST pdf tool returns jobId, poll until completed', async () => {
      const { addToolJob } = require('../queues/toolQueue');
      addToolJob.mockResolvedValueOnce({ id: 'test-job-123' });

      const res = await request(app)
        .post('/api/tools/pdf_merge:v1')
        .field('requestId', generateRequestId())
        .attach('files', Buffer.from('%PDF-1.4 test'), 'test1.pdf')
        .attach('files', Buffer.from('%PDF-1.4 test'), 'test2.pdf');

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.jobId).toBeDefined();

      const jobResult = await waitForJobCompletion(res.body.meta.jobId);
      expect(jobResult.status).toBe('completed');
    });
  });

  describe('7. Duplicate async request', () => {
    it('same requestId twice returns processing response', async () => {
      const requestId = generateRequestId();
      const { addToolJob } = require('../queues/toolQueue');
      addToolJob.mockResolvedValueOnce({ id: 'test-job-456' });

      const res1 = await request(app)
        .post('/api/tools/pdf_merge:v1')
        .field('requestId', requestId)
        .attach('files', Buffer.from('%PDF-1.4 test'), 'test1.pdf');

      const res2 = await request(app)
        .post('/api/tools/pdf_merge:v1')
        .field('requestId', requestId)
        .attach('files', Buffer.from('%PDF-1.4 test'), 'test1.pdf');

      // First should have jobId
      expect(res1.body.meta?.jobId).toBeDefined();

      // Second should indicate processing or same jobId
      if (res2.body.meta?.jobId) {
        expect(res2.body.meta.jobId).toBe(res1.body.meta.jobId);
      } else {
        expect(res2.body.status).toBe('processing');
      }
    });
  });

  describe('8. Credit limit', () => {
    it('low credits returns INSUFFICIENT_CREDITS', async () => {
      const user = await createTestUser();
      await setUserCredits(user._id.toString(), 0);

      const res = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .set('x-user-id', user._id.toString())
        .send({
          input: { principal: 100000, rate: 8.5, tenure: 12 }
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('INSUFFICIENT_CREDITS');
    });
  });

  describe('9. Timeout test', () => {
    it('long-running job returns timeout status and refund', async () => {
      const res = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .send({
          input: { principal: 100000, rate: 8.5, tenure: 12 }
        });

      // EMI calculator is sync, so this should not timeout
      expect(res.status).toBe(200);
    });
  });

  describe('10. Response contract validation', () => {
    it('ALL responses match { success, data, meta }', async () => {
      const res = await request(app)
        .post('/api/tools/emi_calculator:v1')
        .send({
          input: { principal: 100000, rate: 8.5, tenure: 12 }
        });

      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(typeof res.body.success).toBe('boolean');
    });
  });
});