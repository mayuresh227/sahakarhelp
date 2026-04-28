const ToolRegistry = require('./services/ToolRegistry');
const ToolExecutor = require('./services/ToolExecutor');
const ToolMetadata = require('./models/ToolMetadata');

// ====================
// Load Engines
// ====================
console.log('Loading engines...');

console.log('Loading CalculatorEngine...');
const CalculatorEngine = require('./engines/CalculatorEngine');
console.log('CalculatorEngine loaded');

console.log('Loading PDFEngine...');
const PDFEngine = require('./engines/PDFEngine');
console.log('PDFEngine loaded');

console.log('Loading DocumentEngine...');
const DocumentEngine = require('./engines/DocumentEngine');
console.log('DocumentEngine loaded');

console.log('Loading ImageEngine...');
const ImageEngine = require('./engines/ImageEngine');
console.log('ImageEngine loaded');

console.log('Loading PACSEKYCEngine...');
const PACSEKYCEngine = require('./engines/PACSEKYCEngine');
console.log('PACSEKYCEngine loaded');

// ====================
// Register Engines with ToolExecutor
// ====================
console.log('Registering engines with ToolExecutor...');

const calculatorEngine = new CalculatorEngine();
ToolExecutor.registerEngine('calculator', calculatorEngine);
console.log('Calculator engine registered');

const pdfEngine = new PDFEngine();
ToolExecutor.registerEngine('pdf', pdfEngine);
console.log('PDF engine registered');

const documentEngine = new DocumentEngine();
ToolExecutor.registerEngine('document', documentEngine);
console.log('Document engine registered');

const imageEngine = new ImageEngine();
ToolExecutor.registerEngine('image', imageEngine);
console.log('Image engine registered');

const pacsEkycEngine = new PACSEKYCEngine();
ToolExecutor.registerEngine('pacs_ekyc', pacsEkycEngine);
console.log('PACSEKYC engine registered');

// ====================
// Register Fallback Tools (with versions)
// ====================
const registerFallbackTools = () => {
  const fallbackTools = [
    // EMI Calculator v1
    {
      slug: 'emi_calculator',
      name: 'EMI Calculator',
      type: 'calculator',
      version: 'v1',
      categories: ['calculator-tools', 'financial'],
      description: 'Calculate EMI for loans with principal, interest rate, and tenure',
      config: {
        inputs: [
          { name: 'principal', type: 'number', label: 'Loan Amount', required: true },
          { name: 'rate', type: 'number', label: 'Interest Rate (%)', required: true },
          { name: 'tenure', type: 'number', label: 'Tenure (months)', required: true },
          { name: 'processingFee', type: 'number', label: 'Processing Fee', required: false },
          { name: 'prePaymentAmount', type: 'number', label: 'Pre-payment Amount', required: false }
        ],
        outputs: [
          { name: 'emi', label: 'EMI', format: 'currency' },
          { name: 'totalPayment', label: 'Total Payment', format: 'currency' },
          { name: 'totalInterest', label: 'Total Interest', format: 'currency' },
          { name: 'amortization', label: 'Amortization Schedule', format: 'table' }
        ]
      },
      active: true,
      requiresAuth: false,
      requiredPlan: 'free',
      requiredRole: 'user',
      dailyLimitFree: 50
    },
    // EMI Calculator v2 (hypothetical future version)
    {
      slug: 'emi_calculator',
      name: 'EMI Calculator v2',
      type: 'calculator',
      version: 'v2',
      categories: ['calculator-tools', 'financial'],
      description: 'Enhanced EMI Calculator with advanced features',
      config: {
        inputs: [
          { name: 'principal', type: 'number', label: 'Loan Amount', required: true },
          { name: 'rate', type: 'number', label: 'Interest Rate (%)', required: true },
          { name: 'tenure', type: 'number', label: 'Tenure (months)', required: true },
          { name: 'processingFee', type: 'number', label: 'Processing Fee', required: false },
          { name: 'prePaymentAmount', type: 'number', label: 'Pre-payment Amount', required: false },
          { name: 'tenureType', type: 'select', label: 'Tenure Type', options: ['months', 'years'], required: false }
        ],
        outputs: [
          { name: 'emi', label: 'EMI', format: 'currency' },
          { name: 'totalPayment', label: 'Total Payment', format: 'currency' },
          { name: 'totalInterest', label: 'Total Interest', format: 'currency' },
          { name: 'totalCost', label: 'Total Cost', format: 'currency' },
          { name: 'amortization', label: 'Amortization Schedule', format: 'table' }
        ]
      },
      active: true,
      requiresAuth: false,
      requiredPlan: 'pro',
      requiredRole: 'user',
      dailyLimitFree: null
    },
    // Satbara Helper v1
    {
      slug: 'satbara_helper',
      name: 'Satbara 7/12 Helper',
      type: 'calculator',
      version: 'v1',
      categories: ['land-records', 'maharashtra'],
      description: 'Guidance for accessing Maharashtra land records (7/12 extract)',
      config: {
        inputs: [
          { name: 'district', type: 'text', label: 'District', required: true },
          { name: 'taluka', type: 'text', label: 'Taluka', required: true },
          { name: 'village', type: 'text', label: 'Village', required: true },
          { name: 'surveyNumber', type: 'text', label: 'Survey Number', required: true },
          { name: 'groupNumber', type: 'text', label: 'Group Number (optional)', required: false },
          { name: 'ownerName', type: 'text', label: 'Owner Name (optional)', required: false }
        ],
        outputs: [
          { name: 'validation', label: 'Validation', format: 'object' },
          { name: 'guidance', label: 'Step-by-step Guidance', format: 'array' },
          { name: 'help', label: 'Help Information', format: 'object' }
        ]
      },
      active: true,
      requiresAuth: false,
      requiredPlan: 'free',
      requiredRole: 'user',
      dailyLimitFree: 20
    },
    // PDF Merge v1
    {
      slug: 'pdf_merge',
      name: 'PDF Merge',
      type: 'pdf',
      version: 'v1',
      categories: ['pdf-tools'],
      description: 'Merge multiple PDF files into one',
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
    },
    // PDF Compress v1
    {
      slug: 'pdf_compress',
      name: 'PDF Compressor',
      type: 'pdf',
      version: 'v1',
      categories: ['pdf-tools'],
      description: 'Compress PDF files to reduce size',
      config: {
        inputs: [
          { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
          { name: 'compressionLevel', type: 'select', label: 'Compression Level', options: ['low', 'medium', 'high'], default: 'medium' }
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
      // PACS eKYC Tool v1
      {
      slug: 'pacs_ekyc_tool',
      name: 'PACS eKYC Tool',
      type: 'pacs_ekyc',
      version: 'v1',
      categories: ['kyc-tools', 'pacs', 'compliance'],
      description: 'Process and compress PACS eKYC documents into a single PDF under 250KB',
      config: {
      inputs: [
      { name: 'ekycForm', type: 'file', label: 'eKYC Form', required: true, acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
      { name: 'aadhaarCard', type: 'file', label: 'Aadhaar Card', required: true, acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'] },
      { name: 'identityProof', type: 'file', label: 'Identity Proof', required: false, acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'] }
      ],
      outputs: [
      { name: 'fileUrl', label: 'File URL', format: 'string' },
      { name: 'fileSizeKB', label: 'File Size (KB)', format: 'number' },
      { name: 'success', label: 'Success', format: 'boolean' }
      ]
      },
      active: true,
      requiresAuth: false,
      requiredPlan: 'free',
      requiredRole: 'user',
      dailyLimitFree: 10
      }
      ];

  fallbackTools.forEach(tool => {
    ToolRegistry.registerTool(tool);
  });

  console.log(`Registered ${fallbackTools.length} fallback tools`);
};

// ====================
// Load Tools from Database
// ====================
const loadToolsFromDatabase = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB not connected, skipping database tool load');
      return;
    }

    const dbTools = await ToolMetadata.find({ active: true }).lean().maxTimeMS(5000);

    if (dbTools && dbTools.length > 0) {
      dbTools.forEach(tool => {
        const toolConfig = {
          slug: tool.slug,
          type: tool.engineType,
          version: tool.version || 'v1',
          name: tool.name,
          description: tool.description || '',
          categories: tool.categories || [],
          config: tool.config || { inputs: [], outputs: [] },
          active: tool.active !== false,
          requiresAuth: Boolean(tool.requiresAuth),
          requiredPlan: tool.requiredPlan || 'free',
          requiredRole: tool.requiredRole || 'user',
          dailyLimitFree: tool.dailyLimitFree || null
        };

        ToolRegistry.registerTool(toolConfig);
      });
      console.log(`Loaded ${dbTools.length} tools from database`);
    } else {
      console.log('No active tools found in database');
    }
  } catch (error) {
    console.error('Error loading tools from database:', error.message);
  }
};

// ====================
// Initialize
// ====================
const initialize = async () => {
  console.log('Initializing tool registry...');
  
  // Register fallback tools first
  registerFallbackTools();
  
  // Then try to load from database
  await loadToolsFromDatabase();

  console.log(`Tool registry initialized with ${ToolRegistry.count} tool versions (${ToolRegistry.uniqueCount} unique tools)`);
  console.log(`Tool executor has ${ToolExecutor.getRegisteredEngines().length} engines registered`);

  // Log registered tools
  const tools = ToolRegistry.listTools({ latestOnly: true });
  console.log('Registered tools:', tools.map(t => `${t.slug}:${t.version}`).join(', '));

  return { ToolRegistry, ToolExecutor };
};

// Export for use
module.exports = { ToolRegistry, ToolExecutor, initialize };

// Auto-initialize on first import (sync fallback tools, async for DB)
let initPromise = null;

const ensureInitialized = () => {
  if (!initPromise) {
    initPromise = initialize();
  }
  return initPromise;
};

// Auto-initialize
ensureInitialized();