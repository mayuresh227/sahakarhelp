const express = require('express');
const mongoose = require('mongoose');
const ToolMetadata = require('../models/ToolMetadata');

const router = express.Router();
const QUERY_TIMEOUT_MS = 5000;

const fallbackTools = [
  {
    slug: 'calculator',
    name: 'Calculator',
    categories: ['calculator-tools'],
    engineType: 'calculator',
    config: {
      inputs: [
        { name: 'expression', type: 'text', label: 'Expression', required: true }
      ],
      outputs: [
        { name: 'result', label: 'Result', format: 'number' }
      ]
    },
    active: true,
    requiresAuth: false,
    requiredPlan: 'free',
    requiredRole: 'user',
    dailyLimitFree: 5
  },
  {
    slug: 'pdf-compressor',
    name: 'PDF Compressor',
    categories: ['pdf-tools'],
    engineType: 'pdf',
    config: {
      inputs: [
        { name: 'file', type: 'file', label: 'PDF File', required: true },
        {
          name: 'compressionLevel',
          type: 'select',
          label: 'Compression Level',
          options: ['low', 'medium', 'high'],
          default: 'medium'
        }
      ],
      outputs: [
        { name: 'result', label: 'Compressed PDF', format: 'pdf' }
      ]
    },
    active: true,
    requiresAuth: false,
    requiredPlan: 'free',
    requiredRole: 'user',
    dailyLimitFree: 3
  }
];

const isDbConnected = () => mongoose.connection.readyState === 1;

const withTimeout = async (promise, timeoutMs = QUERY_TIMEOUT_MS) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Database query timeout')), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeTool = (tool) => {
  const value = typeof tool.toObject === 'function' ? tool.toObject() : tool;

  return {
    slug: value.slug,
    name: value.name,
    description: value.description,
    categories: value.categories || [],
    engineType: value.engineType,
    config: value.config || { inputs: [], outputs: [] },
    active: value.active !== false,
    requiresAuth: Boolean(value.requiresAuth),
    requiredPlan: value.requiredPlan || 'free',
    requiredRole: value.requiredRole || 'user',
    dailyLimitFree: value.dailyLimitFree || null
  };
};

const getFallbackTool = (slug) => fallbackTools.find(tool => tool.slug === slug) || null;

const getActiveTools = async () => {
  if (!isDbConnected()) {
    console.warn('MongoDB is not connected; returning fallback tools');
    return fallbackTools;
  }

  const query = ToolMetadata.find({ active: true })
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);

  const tools = await withTimeout(query.exec());
  return tools.length > 0 ? tools.map(normalizeTool) : fallbackTools;
};

const getToolBySlug = async (slug) => {
  if (!isDbConnected()) {
    return getFallbackTool(slug);
  }

  const query = ToolMetadata.findOne({ slug, active: true })
    .lean()
    .maxTimeMS(QUERY_TIMEOUT_MS);

  const tool = await withTimeout(query.exec());
  return tool ? normalizeTool(tool) : getFallbackTool(slug);
};

const loadToolRegistry = () => {
  try {
    return { registry: require('../initToolRegistry'), error: null };
  } catch (error) {
    console.error('Failed to load tool registry:', error);
    return { registry: null, error };
  }
};

router.get('/', async (req, res) => {
  try {
    const tools = await getActiveTools();
    res.json(tools);
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    res.json(fallbackTools);
  }
});

router.get('/:slug/config', async (req, res) => {
  try {
    const tool = await getToolBySlug(req.params.slug);
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    res.json({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      categories: tool.categories,
      engineType: tool.engineType,
      inputs: tool.config.inputs || [],
      outputs: tool.config.outputs || []
    });
  } catch (error) {
    console.error('Failed to fetch tool config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:slug', async (req, res) => {
  const { registry, error } = loadToolRegistry();

  if (!registry) {
    return res.status(503).json({
      error: 'Tool engine unavailable',
      message: error.message
    });
  }

  try {
    const result = await registry.executeTool(req.params.slug, req.body);
    res.json(result);
  } catch (executionError) {
    console.error('Tool execution failed:', executionError);
    res.status(500).json({
      error: 'Tool execution failed',
      message: executionError.message
    });
  }
});

module.exports = router;
