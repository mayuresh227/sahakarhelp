const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Mock tools data
const mockTools = [
  {
    slug: 'calculator',
    name: 'Calculator',
    description: 'Basic arithmetic calculator',
    categories: ['math', 'utilities'],
    engineType: 'calculator',
    config: {
      inputs: [
        { name: 'expression', type: 'text', label: 'Expression', required: true }
      ]
    }
  },
  {
    slug: 'pdf-merge',
    name: 'PDF Merger',
    description: 'Merge multiple PDF files into one',
    categories: ['pdf-tools', 'document'],
    engineType: 'pdf',
    config: {
      inputs: [
        { name: 'files', type: 'file', label: 'PDF Files', required: true, multiple: true }
      ]
    }
  },
  {
    slug: 'resume-generator',
    name: 'Resume Generator',
    description: 'Generate professional resumes',
    categories: ['document', 'productivity'],
    engineType: 'document',
    config: {
      inputs: [
        { name: 'name', type: 'text', label: 'Full Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'experience', type: 'textarea', label: 'Work Experience', required: true }
      ]
    }
  }
];

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Get all tools
app.get('/api/tools', (req, res) => {
  res.json(mockTools);
});

// Get tool config
app.get('/api/tools/:slug/config', (req, res) => {
  const tool = mockTools.find(t => t.slug === req.params.slug);
  if (tool) {
    res.json(tool.config);
  } else {
    res.status(404).json({ error: 'Tool not found' });
  }
});

// Execute tool
app.post('/api/tools/:slug', (req, res) => {
  const { slug } = req.params;
  const inputs = req.body;
  
  // Mock execution results
  let result;
  switch (slug) {
    case 'calculator':
      try {
        // Simple eval for demo (in real app use safe eval)
        const expression = inputs.expression || '';
        const calculation = eval(expression.replace(/[^0-9+\-*/().]/g, ''));
        result = { 
          success: true, 
          result: calculation,
          message: `Calculation: ${expression} = ${calculation}`
        };
      } catch (error) {
        result = { success: false, error: 'Invalid expression' };
      }
      break;
    case 'pdf-merge':
      result = { 
        success: true, 
        message: 'PDF files merged successfully',
        downloadUrl: '/api/download/sample.pdf'
      };
      break;
    case 'resume-generator':
      result = { 
        success: true, 
        message: `Resume generated for ${inputs.name}`,
        downloadUrl: '/api/download/resume.pdf'
      };
      break;
    default:
      result = { success: false, error: 'Tool not implemented' };
  }
  
  res.json(result);
});

// Mock download endpoint
app.get('/api/download/:filename', (req, res) => {
  res.json({ message: `File ${req.params.filename} would be downloaded here` });
});

app.listen(PORT, () => {
  console.log(`Test backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Tools API: http://localhost:${PORT}/api/tools`);
});