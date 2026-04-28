const mongoose = require('mongoose');

const creditReservationSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: null
  },
  toolSlug: {
    type: String,
    required: true
  },
  creditsUsed: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'consumed', 'refunded'],
    default: 'pending',
    index: true
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent double refund - compound index
creditReservationSchema.index({ requestId: 1, refundStatus: 1 });

// Update timestamp on save
creditReservationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const CreditReservation = mongoose.model('CreditReservation', creditReservationSchema);

module.exports = CreditReservation;