---
name: sahakarhelp-tool-builder
version: 1.0.0
description: |
  A comprehensive skill for creating and managing tools in the SahakarHelp Tool Builder system.
  This skill guides developers through the process of adding new tools, implementing engines,
  creating frontend UI components, and ensuring compatibility with the ToolRegistry system.
license: MIT
compatibility: claude-code opencode
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# SahakarHelp Tool Builder Skill

This skill provides guidance for creating and managing tools within the SahakarHelp Tool Builder platform. The system uses a config-driven, modular architecture with dynamic routing and engine-based execution.

## Core Principles

1. **ToolRegistry Centralization**: All tools are registered in a central registry
2. **Engine-Based Execution**: Each tool is associated with an engine type (calculator, document, pdf, image, conversion)
3. **Config-Driven UI**: Tool configuration defines input fields and output formats
4. **Dynamic Routing**: Tools are automatically routed based on slug
5. **Modular Architecture**: Backend engines and frontend components are separated

## Tool Creation Process

### 1. Define Tool Metadata

Add tool configuration to `backend/initToolRegistry.js` in the `toolsToCreate` array:

```javascript
{
  slug: 'tool-slug',
  name: 'Tool Name',
  categories: ['category-name'],
  engineType: 'engine-type', // calculator, document, pdf, image, conversion
  requiresAuth: false,
  config: {
    inputs: [
      { name: 'field1', type: 'text|number|file|select|textarea|date|array', label: 'Field Label', required: true },
      { name: 'field2', type: 'select', label: 'Options', options: ['option1', 'option2'], default: 'option1' }
    ],
    outputs: [
      { name: 'result', label: 'Output Label', format: 'jpg|pdf|json|zip' }
    ]
  },
  active: true
}
```

### 2. Implement Engine Logic

Add corresponding method to the appropriate engine in `backend/engines/`:

**Image Engine Example:**
```javascript
async cropImage({ image, cropType, width, height, x, y }) {
  try {
    // Process image using sharp library
    // Return { success: true, croppedImage: buffer.toString('base64'), format: 'jpg' }
  } catch (error) {
    throw new Error(`Image cropping failed: ${error.message}`);
  }
}
```

**Engine Requirements:**
- Must have `execute(tool, inputs)` method
- Should handle errors gracefully
- Must return consistent response format
- Should clean up temporary files

### 3. Create Frontend UI Component

Choose appropriate UI approach:

**A. Generic UI (Simple Tools):**
- Use existing `ImageToolUI.js`, `PDFToolUI.js`, etc.
- Automatically renders inputs based on config

**B. Specialized UI (Complex Tools):**
- Create new component in `frontend/src/components/`
- Import and register in `ToolLoader.js`
- Example: `ImageCropperUI.js` for advanced cropping features

**Frontend Component Requirements:**
- Handle file uploads with FormData
- Show previews when applicable
- Provide download functionality for results
- Include error handling and loading states

### 4. Update Tool Loader

Modify `frontend/src/components/ToolLoader.js` to use specialized component if needed:

```javascript
// Import component
import ImageCropperUI from './ImageCropperUI';

// In render logic
{slug === 'image-cropper' && (
  <ImageCropperUI
    config={toolConfig}
    onSubmit={handleSubmit}
    result={result}
  />
)}
```

## Engine Types and Responsibilities

### Calculator Engine (`calculator`)
- Simple arithmetic and calculations
- No file processing required
- Returns JSON data

### Document Engine (`document`)
- Document generation (invoices, resumes, forms)
- Template-based processing
- Supports multiple languages (Marathi + English)
- Returns PDF or DOCX

### PDF Engine (`pdf`)
- PDF manipulation (compression, conversion, merging)
- Uses pdf-lib and PDFKit
- Returns PDF files or image archives

### Image Engine (`image`)
- Image processing (compression, resizing, cropping, conversion)
- Uses Sharp library
- Supports JPG, PNG, WEBP formats
- Returns base64-encoded images

### Conversion Engine (`conversion`)
- File format conversion
- Data transformation
- Cross-format compatibility

## File Upload Handling

### Backend Requirements:
- Use `bodyParser.json({ limit: '10mb' })` for larger files
- Expect `image.buffer` property from parsed FormData
- Process buffers directly with Sharp or other libraries
- Clean up temporary files after processing

### Frontend Requirements:
- Use `FormData` for file uploads
- Set `Content-Type: multipart/form-data` header
- Show file preview before submission
- Validate file types and sizes

## Error Handling Guidelines

### Backend Errors:
- Throw descriptive error messages
- Use try-catch blocks in engine methods
- Return 500 status with error details
- Log errors for debugging

### Frontend Errors:
- Display user-friendly error messages
- Handle network errors gracefully
- Show loading states during processing
- Validate inputs before submission

## Testing New Tools

### Verification Checklist:
1. Tool appears in `/api/tools` endpoint
2. Configuration loads at `/api/tools/:slug/config`
3. Frontend UI renders correctly
4. File uploads work (if applicable)
5. Processing completes successfully
6. Results are downloadable
7. Error handling works as expected

### Test Script:
```javascript
// backend/test_tool.js
const ToolRegistry = require('./initToolRegistry');

async function testTool(slug) {
  const tool = ToolRegistry.getTool(slug);
  console.log(`Tool ${slug}:`, tool ? 'Found' : 'Not found');
  
  const engine = ToolRegistry.getEngine(tool?.engineType);
  console.log(`Engine ${tool?.engineType}:`, engine ? 'Found' : 'Not found');
}
```

## Example: Image Cropper Tool Implementation

### 1. Metadata (initToolRegistry.js):
```javascript
{
  slug: 'image-cropper',
  name: 'Image Cropper',
  categories: ['image-tools'],
  engineType: 'image',
  requiresAuth: false,
  config: {
    inputs: [
      { name: 'image', type: 'file', label: 'Image', required: true, accept: 'image/jpeg,image/png,image/webp' },
      { name: 'cropType', type: 'select', label: 'Crop Type', options: ['custom', 'square', 'circle'], default: 'custom' },
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
}
```

### 2. Engine Method (ImageEngine.js):
Added `cropImage()` method with three crop modes: custom, square, and circle.

### 3. Frontend Component (ImageCropperUI.js):
Created specialized component with image preview, crop type selection, dimension inputs, and visual feedback.

### 4. Tool Loader Integration:
Updated `ToolLoader.js` to use `ImageCropperUI` for the `image-cropper` slug.

## Best Practices

### Code Organization:
- Keep engine methods focused and single-purpose
- Use consistent naming conventions
- Follow existing project patterns
- Document complex logic

### Performance:
- Process large files asynchronously
- Implement streaming for very large files
- Cache frequently used resources
- Clean up temporary files promptly

### Security:
- Validate all user inputs
- Sanitize file names and paths
- Implement rate limiting if needed
- Use environment variables for sensitive data

### Maintainability:
- Write clear comments for complex logic
- Keep configuration separate from code
- Use constants for magic values
- Follow the existing project structure

## Troubleshooting

### Common Issues:

1. **Tool not appearing in registry**
   - Check MongoDB connection
   - Verify tool is in `toolsToCreate` array
   - Ensure slug is unique

2. **File uploads failing**
   - Check `bodyParser` limit
   - Verify FormData is being sent
   - Ensure backend expects `file.buffer`

3. **Engine method not called**
   - Verify `engineType` matches registered engine
   - Check switch statement in engine's `execute` method
   - Ensure method name matches tool slug

4. **Frontend UI not rendering**
   - Check ToolLoader conditional logic
   - Verify component import
   - Ensure config is loading correctly

## References

- [Project Structure](plans/project_structure.md)
- [Tool Registry Architecture](plans/tool_registry_architecture.md)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [PDFKit Documentation](http://pdfkit.org/)

## Version History

- **1.0.0** - Initial skill creation for SahakarHelp Tool Builder
- **0.1.0** - Basic tool creation guidelines
- **0.0.1** - Initial draft based on Image Cropper implementation