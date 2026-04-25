const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const ToolMetadata = require('../models/ToolMetadata');

const router = express.Router();
const QUERY_TIMEOUT_MS = 5000;

// ====================
// Multer Configuration
// ====================
const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // maximum number of files
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
  },
};

const upload = multer(multerConfig);

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
  },
  {
    slug: 'pdf-merge',
    name: 'PDF Merge',
    categories: ['pdf-tools'],
    engineType: 'pdf',
    config: {
      inputs: [
        { name: 'files', type: 'file', label: 'PDF Files', required: true, multiple: true, accept: '.pdf' }
      ],
      outputs: [
        { name: 'result', label: 'Merged PDF', format: 'pdf' }
      ]
    },
    active: true,
    requiresAuth: false,
    requiredPlan: 'free',
    requiredRole: 'user',
    dailyLimitFree: 5
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
  console.log('Loading tool registry...');
  try {
    const registry = require('../initToolRegistry');
    console.log('Tool registry loaded successfully');
    return { registry, error: null };
  } catch (error) {
    console.error('Failed to load tool registry:', error);
    // Instead of silently skipping, re-throw to fail fast
    throw new Error(`Tool registry failed to load: ${error.message}`);
  }
};

// ====================
// File Upload Validation & Normalization
// ====================
const validateUploadedFiles = (req, res, next) => {
  // req.files may be an array (from upload.array) or an object (from upload.single)
  let files = req.files;
  if (!files) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload at least one file.'
    });
  }

  // Normalize to array
  if (!Array.isArray(files)) {
    files = [files];
  }

  // Check file count
  if (files.length === 0) {
    return res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload at least one file.'
    });
  }

  // Validate each file
  for (const file of files) {
    if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
      return res.status(400).json({
        error: 'Invalid file data',
        message: 'File buffer is missing or corrupted.'
      });
    }
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF files are allowed.'
      });
    }
  }

  // Attach normalized array to request for downstream processing
  req.normalizedFiles = files;
  next();
};

// ====================
// Routes
// ====================
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

// POST route with file upload support
router.post('/:slug', async (req, res) => {
  let registry;
  try {
    const loaded = loadToolRegistry();
    registry = loaded.registry;
  } catch (loadError) {
    console.error('Tool registry load failed:', loadError);
    return res.status(503).json({
      error: 'Tool engine unavailable',
      message: loadError.message
    });
  }

  // Determine if tool expects file inputs
  const tool = await getToolBySlug(req.params.slug);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  const fileInputs = tool.config.inputs.filter(input => input.type === 'file');
  const hasFileInput = fileInputs.length > 0;

  // If tool expects files, we need to parse multipart/form-data
  if (hasFileInput) {
    // Determine field name (assume first file input)
    const fieldName = fileInputs[0].name;
    const isMultiple = fileInputs[0].multiple === true;

    // Create appropriate multer middleware
    const uploadMiddleware = isMultiple
      ? upload.array(fieldName)
      : upload.single(fieldName);

    // Execute upload middleware manually
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          error: 'File upload failed',
          message: err.message
        });
      }

      // Validate uploaded files
      let files = req.files || (req.file ? [req.file] : []);
      if (files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: `Please upload at least one file for field '${fieldName}'.`
        });
      }

      // Normalize to array
      if (!Array.isArray(files)) {
        files = [files];
      }

      // Validate each file
      for (const file of files) {
        if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
          return res.status(400).json({
            error: 'Invalid file data',
            message: 'File buffer is missing or corrupted.'
          });
        }
        if (file.mimetype !== 'application/pdf') {
          return res.status(400).json({
            error: 'Invalid file type',
            message: 'Only PDF files are allowed.'
          });
        }
      }

      // Build inputs object
      const inputs = { ...req.body };
      inputs[fieldName] = files;

      // If there's an 'options' field that is a JSON string, parse it
      if (inputs.options && typeof inputs.options === 'string') {
        try {
          const options = JSON.parse(inputs.options);
          Object.assign(inputs, options);
          delete inputs.options;
        } catch (e) {
          // ignore parse error, keep as string
        }
      }

      try {
        const result = await registry.executeTool(req.params.slug, inputs);
        res.json(result);
      } catch (executionError) {
        console.error('Tool execution failed:', executionError);
        res.status(500).json({
          error: 'Tool execution failed',
          message: executionError.message
        });
      }
    });
  } else {
    // No file inputs, proceed with JSON body
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
  }
});

module.exports = router;