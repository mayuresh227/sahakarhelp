const ToolRegistry = require('./services/ToolRegistry');
const ToolMetadata = require('./models/ToolMetadata');

// Initialize engines with error handling
let CalculatorEngine, PDFEngine, DocumentEngine, ImageEngine;
try {
    CalculatorEngine = require('./engines/CalculatorEngine');
} catch (err) {
    console.warn('CalculatorEngine failed to load:', err.message);
    CalculatorEngine = null;
}
try {
    PDFEngine = require('./engines/PDFEngine');
} catch (err) {
    console.warn('PDFEngine failed to load:', err.message);
    PDFEngine = null;
}
try {
    DocumentEngine = require('./engines/DocumentEngine');
} catch (err) {
    console.warn('DocumentEngine failed to load:', err.message);
    DocumentEngine = null;
}
try {
    ImageEngine = require('./engines/ImageEngine');
} catch (err) {
    console.warn('ImageEngine failed to load:', err.message);
    ImageEngine = null;
}

// Initialize engines
if (CalculatorEngine) {
    const calculatorEngine = new CalculatorEngine();
    ToolRegistry.registerEngine('calculator', calculatorEngine);
}
if (PDFEngine) {
    const pdfEngine = new PDFEngine();
    ToolRegistry.registerEngine('pdf', pdfEngine);
}
if (DocumentEngine) {
    const documentEngine = new DocumentEngine();
    ToolRegistry.registerEngine('document', documentEngine);
}
if (ImageEngine) {
    const imageEngine = new ImageEngine();
    ToolRegistry.registerEngine('image', imageEngine);
}

// Register fallback tools (always available)
const registerFallbackTools = () => {
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
  fallbackTools.forEach(tool => ToolRegistry.registerTool(tool));
  console.log(`Registered ${fallbackTools.length} fallback tools`);
};
registerFallbackTools();

// Seed new tools
const seedNewTools = async () => {
  try {
    const toolsToCreate = [
      {
        slug: 'image-to-pdf',
        name: 'Image to PDF Converter',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'images', type: 'file', label: 'Images', required: true, multiple: true },
            { name: 'pageSize', type: 'select', label: 'Page Size', options: ['A4', 'Letter'], default: 'A4' },
            { name: 'orientation', type: 'select', label: 'Orientation', options: ['portrait', 'landscape'], default: 'portrait' }
          ],
          outputs: [
            { name: 'result', label: 'PDF File', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-compressor',
        name: 'PDF Compressor',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true },
            { name: 'compressionLevel', type: 'select', label: 'Compression Level', options: ['low', 'medium', 'high'], default: 'medium' }
          ],
          outputs: [
            { name: 'result', label: 'Compressed PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-to-image',
        name: 'PDF to Image Converter',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true },
            { name: 'format', type: 'select', label: 'Output Format', options: ['jpg', 'png'], default: 'jpg' },
            { name: 'quality', type: 'number', label: 'Quality (1-100)', min: 1, max: 100 }
          ],
          outputs: [
            { name: 'result', label: 'Converted Images', format: 'zip' }
          ]
        },
        active: true
      },
      {
        slug: 'image-compressor',
        name: 'Image Compressor',
        categories: ['image-tools'],
        engineType: 'image',
        config: {
          inputs: [
            { name: 'image', type: 'file', label: 'Image', required: true },
            { name: 'quality', type: 'number', label: 'Quality (1-100)', min: 1, max: 100 }
          ],
          outputs: [
            { name: 'result', label: 'Compressed Image', format: 'jpg' }
          ]
        },
        active: true
      },
      {
        slug: 'image-resizer',
        name: 'Image Resizer',
        categories: ['image-tools'],
        engineType: 'image',
        config: {
          inputs: [
            { name: 'image', type: 'file', label: 'Image', required: true },
            { name: 'width', type: 'number', label: 'Width', required: true },
            { name: 'height', type: 'number', label: 'Height', required: true }
          ],
          outputs: [
            { name: 'result', label: 'Resized Image', format: 'jpg' }
          ]
        },
        active: true
      },
      {
        slug: 'image-cropper',
        name: 'Image Cropper',
        categories: ['image-tools'],
        engineType: 'image',
        requiresAuth: false,
        config: {
          inputs: [
            { name: 'image', type: 'file', label: 'Image', required: true, accept: 'image/jpeg,image/png,image/webp' },
            {
              name: 'cropType',
              type: 'select',
              label: 'Crop Type',
              options: ['custom', 'square', 'circle'],
              default: 'custom'
            },
            { name: 'width', type: 'number', label: 'Width (pixels)', required: false, min: 1 },
            { name: 'height', type: 'number', label: 'Height (pixels)', required: false, min: 1 },
            { name: 'x', type: 'number', label: 'X Position (pixels)', required: false, min: 0 },
            { name: 'y', type: 'number', label: 'Y Position (pixels)', required: false, min: 0 }
          ],
          outputs: [
            { name: 'result', label: 'Cropped Image', format: 'jpg' }
          ]
        },
        active: true
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
        active: true
      },
      {
        slug: 'pdf-split',
        name: 'PDF Split',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'pageRanges', type: 'text', label: 'Page Ranges (e.g., 1-3,5,7-9)', required: true, placeholder: '1-3,5,7-9' }
          ],
          outputs: [
            { name: 'result', label: 'Split PDFs', format: 'zip' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-rotate',
        name: 'PDF Rotate',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'angle', type: 'select', label: 'Rotation Angle', options: ['90', '180', '270'], default: '90' },
            { name: 'pageNumbers', type: 'text', label: 'Page Numbers (e.g., 1,3,5 or "all")', placeholder: 'all or 1,3,5' }
          ],
          outputs: [
            { name: 'result', label: 'Rotated PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-protect',
        name: 'PDF Protect',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'password', type: 'password', label: 'Password', required: true }
          ],
          outputs: [
            { name: 'result', label: 'Protected PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-unlock',
        name: 'PDF Unlock',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'password', type: 'password', label: 'Password', required: true }
          ],
          outputs: [
            { name: 'result', label: 'Unlocked PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-watermark',
        name: 'PDF Watermark',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'watermarkText', type: 'text', label: 'Watermark Text (optional)', required: false },
            { name: 'watermarkImage', type: 'file', label: 'Watermark Image (optional)', required: false, accept: 'image/*' },
            { name: 'position', type: 'select', label: 'Position', options: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'center' },
            { name: 'opacity', type: 'number', label: 'Opacity (0.1 to 1.0)', min: 0.1, max: 1.0, step: 0.1, default: 0.3 }
          ],
          outputs: [
            { name: 'result', label: 'Watermarked PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'page-reorder',
        name: 'Page Reorder',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'pageOrder', type: 'text', label: 'Page Order (e.g., 3,1,2)', required: true, placeholder: '3,1,2' }
          ],
          outputs: [
            { name: 'result', label: 'Reordered PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'extract-pages',
        name: 'Extract Pages',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'pageNumbers', type: 'text', label: 'Page Numbers to Extract (e.g., 1,3,5)', required: true }
          ],
          outputs: [
            { name: 'result', label: 'Extracted PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'delete-pages',
        name: 'Delete Pages',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'pageNumbers', type: 'text', label: 'Page Numbers to Delete (e.g., 2,4)', required: true }
          ],
          outputs: [
            { name: 'result', label: 'Modified PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'add-page-numbers',
        name: 'Add Page Numbers',
        categories: ['pdf-tools'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'position', type: 'select', label: 'Position', options: ['bottom-center', 'bottom-left', 'bottom-right', 'top-center', 'top-left', 'top-right'], default: 'bottom-center' },
            { name: 'format', type: 'text', label: 'Format (use {page} and {total})', placeholder: '{page} of {total}', default: '{page} of {total}' }
          ],
          outputs: [
            { name: 'result', label: 'Numbered PDF', format: 'pdf' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-metadata',
        name: 'PDF Metadata Editor',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'metadata.title', type: 'text', label: 'Title', required: false },
            { name: 'metadata.author', type: 'text', label: 'Author', required: false },
            { name: 'metadata.subject', type: 'text', label: 'Subject', required: false },
            { name: 'metadata.keywords', type: 'text', label: 'Keywords (comma-separated)', required: false },
            { name: 'metadata.creator', type: 'text', label: 'Creator', required: false },
            { name: 'metadata.producer', type: 'text', label: 'Producer', required: false }
          ],
          outputs: [
            { name: 'result', label: 'PDF with updated metadata', format: 'pdf' },
            { name: 'metadata', label: 'Updated metadata', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-remove-duplicates',
        name: 'Remove Duplicate Pages',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' }
          ],
          outputs: [
            { name: 'result', label: 'PDF without duplicates', format: 'pdf' },
            { name: 'removed', label: 'Number of pages removed', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-size-estimator',
        name: 'PDF Size Estimator',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'options.compressionLevel', type: 'select', label: 'Compression Level', options: ['low', 'medium', 'high'], default: 'medium' }
          ],
          outputs: [
            { name: 'estimation', label: 'Size estimation report', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-batch-processing',
        name: 'PDF Batch Processing',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'files', type: 'file', label: 'PDF Files', required: true, multiple: true, accept: '.pdf' },
            { name: 'operation', type: 'select', label: 'Operation', options: ['compress', 'rotate', 'protect'], default: 'compress' },
            { name: 'options.compressionLevel', type: 'select', label: 'Compression Level', options: ['low', 'medium', 'high'], default: 'medium', dependsOn: { operation: 'compress' } },
            { name: 'options.angle', type: 'select', label: 'Rotation Angle', options: ['90', '180', '270'], default: '90', dependsOn: { operation: 'rotate' } },
            { name: 'options.password', type: 'password', label: 'Password', dependsOn: { operation: 'protect' } }
          ],
          outputs: [
            { name: 'result', label: 'ZIP file with processed PDFs', format: 'zip' },
            { name: 'summary', label: 'Processing summary', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-thumbnail-preview',
        name: 'PDF Thumbnail Preview',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' },
            { name: 'count', type: 'number', label: 'Number of thumbnails', min: 1, max: 20, default: 5 }
          ],
          outputs: [
            { name: 'thumbnails', label: 'Page thumbnails', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'pdf-preview-before-download',
        name: 'PDF Preview',
        categories: ['pdf-tools', 'premium'],
        engineType: 'pdf',
        config: {
          inputs: [
            { name: 'file', type: 'file', label: 'PDF File', required: true, accept: '.pdf' }
          ],
          outputs: [
            { name: 'result', label: 'First page preview image', format: 'jpg' },
            { name: 'preview', label: 'Document information', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'gst-invoice-generator',
        name: 'GST Invoice Generator',
        categories: ['document-tools'],
        engineType: 'document',
        requiresAuth: true,
        config: {
          inputs: [
            // Seller Details
            { name: 'businessName', type: 'text', label: 'Business Name', required: true },
            { name: 'businessAddress', type: 'textarea', label: 'Business Address', required: true },
            { name: 'gstNumber', type: 'text', label: 'GST Number', required: true },
            { name: 'phone', type: 'text', label: 'Phone', required: false },
            { name: 'email', type: 'text', label: 'Email', required: false },
            // Customer Details
            { name: 'customerName', type: 'text', label: 'Customer Name', required: true },
            { name: 'customerAddress', type: 'textarea', label: 'Customer Address', required: true },
            { name: 'customerGST', type: 'text', label: 'Customer GST (Optional)', required: false },
            // Invoice Info
            { name: 'invoiceNumber', type: 'text', label: 'Invoice Number', required: true },
            { name: 'invoiceDate', type: 'date', label: 'Invoice Date', required: true },
            // Items (dynamic array)
            {
              name: 'items',
              type: 'array',
              label: 'Items',
              fields: [
                { name: 'itemName', type: 'text', label: 'Item Name', required: true },
                { name: 'quantity', type: 'number', label: 'Quantity', required: true, min: 1 },
                { name: 'price', type: 'number', label: 'Price per unit', required: true, min: 0 },
                { name: 'taxRate', type: 'number', label: 'Tax Rate (%)', required: true, min: 0, max: 100 }
              ]
            },
            // Extra Fields
            { name: 'discount', type: 'number', label: 'Discount Amount', required: false, min: 0 },
            { name: 'shipping', type: 'number', label: 'Shipping Charges', required: false, min: 0 },
            // Branding
            { name: 'logo', type: 'file', label: 'Logo (Optional)', required: false },
            { name: 'signature', type: 'file', label: 'Signature (Optional)', required: false }
          ],
          outputs: [
            { name: 'invoicePdf', label: 'Invoice PDF', format: 'pdf' },
            { name: 'invoiceData', label: 'Invoice Data', format: 'json' }
          ]
        },
        active: true
      },
      {
        slug: 'satbara-helper',
        name: '7/12 (Satbara) Helper',
        categories: ['land-tools'],
        engineType: 'calculator',
        requiresAuth: false,
        config: {
          inputs: [
            { name: 'district', type: 'text', label: 'District', required: true },
            { name: 'taluka', type: 'text', label: 'Taluka', required: true },
            { name: 'village', type: 'text', label: 'Village', required: true },
            { name: 'surveyNumber', type: 'text', label: 'Survey Number', required: true },
            { name: 'groupNumber', type: 'text', label: 'Group Number (Optional)', required: false },
            { name: 'ownerName', type: 'text', label: 'Owner Name (Optional)', required: false }
          ],
          outputs: [
            { name: 'validation', label: 'Validation Results', format: 'json' },
            { name: 'guidance', label: 'Step-by-Step Guidance', format: 'json' },
            { name: 'help', label: 'Smart Help', format: 'json' },
            { name: 'errorHelp', label: 'Error Helper', format: 'json' }
          ]
        },
        active: true
      }
    ];
    
    for (const toolData of toolsToCreate) {
      const existingTool = await ToolMetadata.findOne({ slug: toolData.slug });
      if (!existingTool) {
        const tool = new ToolMetadata(toolData);
        await tool.save();
        ToolRegistry.registerTool(tool);
        console.log(`Created new tool: ${toolData.name}`);
      }
    }
  } catch (error) {
    console.error('Failed to seed new tools:', error);
  }
};

// Load tools from database
const loadTools = async () => {
  try {
    const tools = await ToolMetadata.find({ active: true });
    tools.forEach(tool => ToolRegistry.registerTool(tool));
    console.log(`Loaded ${tools.length} tools from database`);
    
    // Seed new tools after initial load
    await seedNewTools();
  } catch (error) {
    console.error('Failed to load tools from database:', error);
  }
};

// Initialize tool registry
loadTools().catch(err => {
  console.error('Failed to load tools:', err);
});

module.exports = ToolRegistry;