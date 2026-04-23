const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * POST /api/analytics/log
 * Log a custom analytics event from frontend
 * Body: { action, toolSlug?, metadata? }
 */
router.post('/log', async (req, res) => {
  try {
    const { action, toolSlug, metadata = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const analytics = new Analytics({
      userId: req.user?.id || null,
      toolSlug,
      action,
      metadata,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      createdAt: new Date()
    });

    await analytics.save();
    res.json({ success: true, id: analytics._id });
  } catch (error) {
    console.error('Analytics log error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/summary
 * Get analytics summary for dashboard (admin only)
 */
router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    // Get date range (default: last 30 days)
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Total users (distinct userIds)
    const totalUsers = await Analytics.distinct('userId', {
      createdAt: { $gte: start, $lte: end },
      userId: { $ne: null }
    });

    // Total tool usage
    const totalToolUsage = await Analytics.countDocuments({
      action: 'used_tool',
      createdAt: { $gte: start, $lte: end }
    });

    // Most used tools
    const mostUsedTools = await Analytics.aggregate([
      {
        $match: {
          action: 'used_tool',
          createdAt: { $gte: start, $lte: end },
          toolSlug: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$toolSlug',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Daily usage stats
    const dailyUsage = await Analytics.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          toolUsage: {
            $sum: {
              $cond: [{ $eq: ['$action', 'used_tool'] }, 1, 0]
            }
          },
          logins: {
            $sum: {
              $cond: [{ $eq: ['$action', 'login'] }, 1, 0]
            }
          },
          errors: {
            $sum: {
              $cond: [{ $eq: ['$action', 'error'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          count: 1,
          toolUsage: 1,
          logins: 1,
          errors: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // User activity stats
    const userActivity = await Analytics.aggregate([
      {
        $match: {
          userId: { $ne: null },
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalActions: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $group: {
          _id: null,
          activeUsers: { $sum: 1 },
          avgActionsPerUser: { $avg: '$totalActions' }
        }
      }
    ]);

    res.json({
      summary: {
        totalUsers: totalUsers.length,
        totalToolUsage,
        totalLogins: await Analytics.countDocuments({
          action: 'login',
          createdAt: { $gte: start, $lte: end }
        }),
        totalErrors: await Analytics.countDocuments({
          action: 'error',
          createdAt: { $gte: start, $lte: end }
        }),
        timeRange: { start, end }
      },
      mostUsedTools,
      dailyUsage,
      userActivity: userActivity[0] || { activeUsers: 0, avgActionsPerUser: 0 }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/usage
 * Get usage statistics for charts
 */
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const hourlyData = await Analytics.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } },
      { $limit: 100 }
    ]);

    const toolBreakdown = await Analytics.aggregate([
      {
        $match: {
          action: 'used_tool',
          createdAt: { $gte: startDate },
          toolSlug: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$toolSlug',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      hourlyData,
      toolBreakdown,
      period
    });
  } catch (error) {
    console.error('Analytics usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;