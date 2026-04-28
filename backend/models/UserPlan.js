const mongoose = require('mongoose');

const userPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  planName: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  creditsRemaining: {
    type: Number,
    default: 0,
    min: 0,
  },
  monthlyLimit: {
    type: Number,
    default: 0,
  },
  resetDate: {
    type: Date,
    default: () => {
      // Default to next month
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    },
  },
  lastResetAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure credits don't go negative
userPlanSchema.pre('save', function (next) {
  if (this.creditsRemaining < 0) {
    this.creditsRemaining = 0;
  }
  this.updatedAt = new Date();
  next();
});

// Static method to get or create user plan
userPlanSchema.statics.getOrCreate = async function (userId, planName = 'free') {
  let plan = await this.findOne({ userId });
  if (!plan) {
    const now = new Date();
    plan = new this({
      userId,
      planName,
      creditsRemaining: getDefaultCredits(planName),
      monthlyLimit: getDefaultCredits(planName),
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    });
    await plan.save();
  }
  return plan;
};

// Static method to reset credits for a user
userPlanSchema.statics.resetCredits = async function (userId) {
  const plan = await this.findOne({ userId });
  if (!plan) return null;

  const now = new Date();
  const newLimit = getDefaultCredits(plan.planName);

  plan.creditsRemaining = newLimit;
  plan.monthlyLimit = newLimit;
  plan.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  plan.lastResetAt = now;
  plan.updatedAt = now;

  await plan.save();
  return plan;
};

// Helper function to get default credits by plan
function getDefaultCredits(planName) {
  switch (planName) {
    case 'free':
      return 10; // 10 free credits per month
    case 'pro':
      return 100; // 100 credits per month
    case 'enterprise':
      return 1000; // 1000 credits per month
    default:
      return 10;
  }
}

const UserPlan = mongoose.model('UserPlan', userPlanSchema);

module.exports = UserPlan;