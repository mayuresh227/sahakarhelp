const express = require('express');
const router = express.Router();
const ToolRegistry = require('../initToolRegistry');
const ToolMetadata = require('../models/ToolMetadata');
const ToolUsage = require('../models/ToolUsage');
const User = require('../models/User');
const { trackToolUsage, trackError } = require('../middleware/analytics');

// Get all active tools
router.get('/', async (req, res) => {
  try {
    const tools = await ToolMetadata.find({ active: true });
    res.json(tools);
  } catch (error) {
    console.error("Tool error:", error);
    try {
      if (typeof trackError === "function") {
        await trackError(req.user?.id || null, error.message, {});
      }
    } catch (err) {
      console.error("trackError failed:", err);
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get tool configuration
router.get('/:slug/config', async (req, res) => {
  try {
    const tool = ToolRegistry.getTool(req.params.slug);
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    
    res.json({
      name: tool.name,
      categories: tool.categories,
      inputs: tool.config.inputs,
      outputs: tool.config.outputs
    });
  } catch (error) {
    console.error("Tool error:", error);
    try {
      if (typeof trackError === "function") {
        await trackError(req.user?.id || null, error.message, {
          toolSlug: req.params.slug,
          toolName: 'unknown',
          statusCode: 500
        });
      }
    } catch (err) {
      console.error("trackError failed:", err);
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Execute tool with access control
router.post('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    // Fetch tool metadata
    const toolMeta = await ToolMetadata.findOne({ slug });
    if (!toolMeta || !toolMeta.active) {
      return res.status(404).json({ error: 'Tool not found or inactive' });
    }

    // Check authentication if required
    if (toolMeta.requiresAuth && (!req.isAuthenticated || !req.user)) {
      return res.status(401).json({ error: 'Authentication required for this tool' });
    }

    // If authenticated, check role and plan
    if (req.isAuthenticated && req.user) {
      // Role check
      if (req.user.role !== toolMeta.requiredRole && toolMeta.requiredRole !== 'user') {
        return res.status(403).json({ error: 'Insufficient role permissions' });
      }
      // Plan check
      if (req.user.plan !== toolMeta.requiredPlan && toolMeta.requiredPlan === 'pro') {
        return res.status(403).json({
          error: 'Upgrade required',
          message: 'This tool requires a Pro plan. Please upgrade to access.',
          upgradeUrl: '/dashboard/upgrade'
        });
      }
      // Daily limit check for free users
      if (req.user.plan === 'free' && toolMeta.dailyLimitFree) {
        // Count today's usage for this tool by this user
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayUsageCount = await ToolUsage.countDocuments({
          userId: req.user.id,
          toolSlug: slug,
          timestamp: { $gte: startOfDay }
        });
        if (todayUsageCount >= toolMeta.dailyLimitFree) {
          return res.status(429).json({
            error: 'Daily limit exceeded',
            message: `You have reached your daily limit of ${toolMeta.dailyLimitFree} uses for this tool. Upgrade to Pro for unlimited access.`,
            upgradeUrl: '/dashboard/upgrade'
          });
        }
      }
    }

    // Execute tool with timing
    const startTime = Date.now();
    const result = await ToolRegistry.executeTool(slug, req.body);
    const executionTime = Date.now() - startTime;
    
    // Record usage (if authenticated)
    if (req.isAuthenticated && req.user) {
      // Increment user's usage count and reset if day changed
      const user = await User.findById(req.user.id);
      if (user) {
        const now = new Date();
        const lastReset = new Date(user.lastResetAt);
        const isNewDay = now.getDate() !== lastReset.getDate() ||
                         now.getMonth() !== lastReset.getMonth() ||
                         now.getFullYear() !== lastReset.getFullYear();
        if (isNewDay) {
          user.usageCount = 0;
          user.lastResetAt = now;
        }
        user.usageCount += 1;
        await user.save();
      }

      // Create ToolUsage record
      const toolUsage = new ToolUsage({
        userId: req.user.id,
        toolSlug: slug,
        toolName: toolMeta.name,
        inputData: req.body,
        outputData: result,
        executionTime,
        userPlanAtTime: req.user.plan,
        userRoleAtTime: req.user.role,
        timestamp: new Date()
      });
      await toolUsage.save();
    }

    // Track analytics for all tool usage (authenticated and unauthenticated)
    if (typeof trackToolUsage === 'function') {
      // Call without await, catch any errors
      trackToolUsage(req.user?.id || null, slug, {
        executionTime,
        toolName: toolMeta.name,
        success: true,
        userPlan: req.user?.plan || 'anonymous',
        userRole: req.user?.role || 'anonymous'
      }).catch(trackErr => {
        console.error('Failed to track tool usage:', trackErr.message);
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Tool error:", error);
    try {
      if (typeof trackError === "function") {
        await trackError(req.user?.id || null, error.message, {
          toolSlug: slug,
          toolName: toolMeta?.name || 'unknown',
          statusCode: 500
        });
      }
    } catch (err) {
      console.error("trackError failed:", err);
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;