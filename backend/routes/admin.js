const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ToolUsage = require('../models/ToolUsage');
const Subscription = require('../models/Subscription');
const { requireRole } = require('../middleware/auth');

// All routes require admin role
router.use(requireRole('admin'));

// GET /api/admin/users - list all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await User.countDocuments(query);
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/users/:id - get user details with usage stats
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsage = await ToolUsage.countDocuments({
      userId: user._id,
      timestamp: { $gte: today }
    });
    const totalUsage = await ToolUsage.countDocuments({ userId: user._id });
    const recentUsage = await ToolUsage.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('toolSlug toolName timestamp');
    res.json({
      user,
      stats: {
        todayUsage,
        totalUsage,
        recentUsage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/role - update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.role = role;
    await user.save();
    res.json({ success: true, user: { _id: user._id, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/users/:id/plan - update user plan
router.put('/users/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.plan = plan;
    await user.save();
    res.json({ success: true, user: { _id: user._id, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/subscriptions - list all subscriptions with user details
router.get('/subscriptions', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name email plan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscription.countDocuments(query);

    res.json({
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/stats - platform statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProUsers = await User.countDocuments({ plan: 'pro' });
    const totalAdminUsers = await User.countDocuments({ role: 'admin' });
    const totalToolUsage = await ToolUsage.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayToolUsage = await ToolUsage.countDocuments({ timestamp: { $gte: today } });
    const toolBreakdown = await ToolUsage.aggregate([
      { $group: { _id: '$toolSlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({
      totalUsers,
      totalProUsers,
      totalAdminUsers,
      totalToolUsage,
      todayToolUsage,
      toolBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;