const mongoose = require('mongoose');

const jobResultSchema = new mongoose.Schema({
  jobId: {
    type: String,
    default: null,
    index: true,
  },
  toolSlug: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    default: null,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  // Single field for idempotency: userId or ipAddress
  idempotencyKey: {
    type: String,
    required: true,
  },
  requestId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed_validation', 'failed_execution', 'timeout'],
    default: 'processing',
    index: true,
  },
  // Full standardized response: { success, data, meta, error?, message? }
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  error: {
    message: { type: String, default: null },
    code: { type: String, default: null },
    stack: { type: String, default: null },
  },
  progress: {
    type: Number,
    default: 0,
  },
  attemptsMade: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  timeoutAt: {
    type: Date,
    default: null,
  }
});

// Single unique compound index for idempotency
jobResultSchema.index({ idempotencyKey: 1, requestId: 1 }, { unique: true });

// Update updatedAt on save
jobResultSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.status === 'completed' || this.status === 'failed_validation' ||
      this.status === 'failed_execution' || this.status === 'timeout') {
    this.completedAt = new Date();
  }
  next();
});

// Index for querying by user and status
jobResultSchema.index({ userId: 1, status: 1 });
jobResultSchema.index({ toolSlug: 1, status: 1 });
jobResultSchema.index({ createdAt: -1 });

const JobResult = mongoose.model('JobResult', jobResultSchema);

module.exports = JobResult;
