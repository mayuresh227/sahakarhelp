const express = require('express');
const router = express.Router();
const ToolRegistry = require('../initToolRegistry');
const ToolMetadata = require('../models/ToolMetadata');
const ToolUsage = require('../models/ToolUsage');
const User = require('../models/User');
const { trackToolUsage, trackError } = require('../middleware/analytics');
const mongoose = require('mongoose');

// Helper to check if MongoDB is connected
const isDbConnected = () => mongoose.connection.readyState === 1; // 1 = connected

// Helper to run query with timeout
const queryWithTimeout = (queryPromise, timeoutMs = 5000) => {
    return Promise.race([
        queryPromise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
        )
    ]);
};

// Safe version of ToolMetadata.find with fallback
const getActiveToolsSafe = async () => {
    if (!isDbConnected()) {
        console.warn('DB not connected, returning empty tools list');
        return [];
    }
    try {
        return await queryWithTimeout(ToolMetadata.find({ active: true }));
    } catch (err) {
        console.warn('Failed to fetch tools from DB:', err.message);
        return [];
    }
};

// Safe version of ToolMetadata.findOne with fallback
const findToolMetaSafe = async (slug) => {
    if (!isDbConnected()) {
        console.warn('DB not connected, returning null tool metadata');
        return null;
    }
    try {
        return await queryWithTimeout(ToolMetadata.findOne({ slug }));
    } catch (err) {
        console.warn('Failed to fetch tool metadata:', err.message);
        return null;
    }
};

// Safe version of ToolUsage.countDocuments
const countToolUsageSafe = async (query) => {
    if (!isDbConnected()) return 0;
    try {
        return await queryWithTimeout(ToolUsage.countDocuments(query));
    } catch (err) {
        console.warn('Failed to count tool usage:', err.message);
        return 0;
    }
};

// Safe version of User.findById
const findUserSafe = async (userId) => {
    if (!isDbConnected()) return null;
    try {
        return await queryWithTimeout(User.findById(userId));
    } catch (err) {
        console.warn('Failed to find user:', err.message);
        return null;
    }
};

// Safe version of toolUsage.save (skip if DB down)
const saveToolUsageSafe = async (toolUsageData) => {
    if (!isDbConnected()) {
        console.warn('DB not connected, skipping tool usage save');
        return null;
    }
    try {
        const toolUsage = new ToolUsage(toolUsageData);
        return await queryWithTimeout(toolUsage.save());
    } catch (err) {
        console.warn('Failed to save tool usage:', err.message);
        return null;
    }
};

// Safe version of user.save
const saveUserSafe = async (user) => {
    if (!isDbConnected()) return;
    try {
        await queryWithTimeout(user.save());
    } catch (err) {
        console.warn('Failed to save user:', err.message);
    }
};

// Get all active tools
router.get('/', async (req, res) => {
  try {
    const tools = await getActiveToolsSafe();
    res.json(tools);
  } catch (error) {
    console.error("Tool error:", error);
    // Even if tracking fails, we still respond
    if (typeof trackError === "function") {
      trackError(req.user?.id || null, error.message, {}).catch(err => {
        console.error("trackError failed:", err);
      });
    }
    // Return empty array instead of 500 to keep service available
    res.json([]);
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
    if (typeof trackError === "function") {
      trackError(req.user?.id || null, error.message, {
        toolSlug: req.params.slug,
        toolName: 'unknown',
        statusCode: 500
      }).catch(err => {
        console.error("trackError failed:", err);
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Execute tool with access control
router.post('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    
    // Fetch tool metadata with safe fallback
    const toolMeta = await findToolMetaSafe(slug);
    if (!toolMeta || !toolMeta.active) {
      // If DB is down, we can still execute if tool exists in registry
      const registryTool = ToolRegistry.getTool(slug);
      if (!registryTool) {
        return res.status(404).json({ error: 'Tool not found or inactive' });
      }
      // Create a mock tool metadata for validation
      const mockToolMeta = {
        requiresAuth: false,
        requiredRole: 'user',
        requiredPlan: null,
        dailyLimitFree: null,
        name: registryTool.name
      };
      // Use mock for checks
      return await executeToolWithMockMeta(slug, req, res, mockToolMeta);
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
        const todayUsageCount = await countToolUsageSafe({
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
    
    // Record usage (if authenticated) - safe version
    if (req.isAuthenticated && req.user) {
      // Increment user's usage count and reset if day changed
      const user = await findUserSafe(req.user.id);
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
        await saveUserSafe(user);
      }

      // Create ToolUsage record (safe)
      await saveToolUsageSafe({
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
    if (typeof trackError === "function") {
      trackError(req.user?.id || null, error.message, {
        toolSlug: slug,
        toolName: toolMeta?.name || 'unknown',
        statusCode: 500
      }).catch(err => {
        console.error("trackError failed:", err);
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Helper for executing tool when DB is down
async function executeToolWithMockMeta(slug, req, res, mockToolMeta) {
  try {
    // Skip auth checks since DB is down and we can't verify
    // Just execute the tool
    const startTime = Date.now();
    const result = await ToolRegistry.executeTool(slug, req.body);
    const executionTime = Date.now() - startTime;
    
    // Track analytics if possible (skip DB)
    if (typeof trackToolUsage === 'function') {
      trackToolUsage(req.user?.id || null, slug, {
        executionTime,
        toolName: mockToolMeta.name,
        success: true,
        userPlan: req.user?.plan || 'anonymous',
        userRole: req.user?.role || 'anonymous'
      }).catch(trackErr => {
        console.error('Failed to track tool usage:', trackErr.message);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Tool execution error:", error);
    if (typeof trackError === "function") {
      trackError(req.user?.id || null, error.message, {
        toolSlug: slug,
        toolName: mockToolMeta.name,
        statusCode: 500
      }).catch(err => {
        console.error("trackError failed:", err);
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = router;