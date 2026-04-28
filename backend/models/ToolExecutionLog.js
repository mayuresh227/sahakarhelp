const mongoose = require('mongoose');

const toolExecutionLogSchema = new mongoose.Schema({
  toolSlug: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.Mixed, // String or ObjectId, nullable for guests
    default: null,
    index: true
  },
  requestId: {
    type: String,
    default: null,
    index: true,
    unique: true // Enforce idempotency - one execution per requestId
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    required: true,
    index: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  executionTimeMs: {
    type: Number,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

// Index for analytics queries
toolExecutionLogSchema.index({ createdAt: -1 });
toolExecutionLogSchema.index({ toolSlug: 1, status: 1 });
toolExecutionLogSchema.index({ userId: 1, createdAt: -1 });
// Unique index on requestId already defined above

const ToolExecutionLog = mongoose.model('ToolExecutionLog', toolExecutionLogSchema);

module.exports = ToolExecutionLog;