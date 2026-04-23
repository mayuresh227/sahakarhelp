const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ToolUsage = require('../models/ToolUsage');
const { requireAuth } = require('../middleware/auth');

// GET /api/user/profile - get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Calculate today's usage count from ToolUsage
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayUsageCount = await ToolUsage.countDocuments({
      userId: req.user.id,
      timestamp: { $gte: startOfDay }
    });
    const response = {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      plan: user.plan,
      usageCount: user.usageCount,
      lastResetAt: user.lastResetAt,
      createdAt: user.createdAt,
      todayUsageCount,
      dailyLimit: user.plan === 'free' ? 5 : null // default free limit
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/tool-usage - get tool usage history for the user
router.get('/tool-usage', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const usage = await ToolUsage.find({ userId: req.user.id })
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('toolSlug toolName inputData outputData executionTime success userPlanAtTime userRoleAtTime timestamp');
    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/stats - get usage statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await ToolUsage.countDocuments({
      userId: req.user.id,
      timestamp: { $gte: startOfDay }
    });
    const totalCount = await ToolUsage.countDocuments({ userId: req.user.id });
    const toolBreakdown = await ToolUsage.aggregate([
      { $match: { userId: req.user.id } },
      { $group: { _id: '$toolSlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({
      todayCount,
      totalCount,
      toolBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;