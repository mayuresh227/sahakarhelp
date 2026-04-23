---
name: imagetoolgenerator
version: 1.0.0
description: |
  Skill for creating image processing tools in the SahakarHelp Tool Builder system.
  Guides developers through implementing image tools using the ImageEngine with Sharp library.
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

# Image Tool Generator Skill

This skill provides specific guidance for creating image processing tools within the SahakarHelp platform. Image tools use the ImageEngine with Sharp library for high-performance image manipulation.

## Image Engine Overview

The ImageEngine (`backend/engines/ImageEngine.js`) provides:
- Image compression (quality adjustment)
- Image resizing (dimension scaling)
- Image cropping (custom, square, circle)
- Format conversion (JPG, PNG, WEBP)
- Metadata extraction

## Creating a New Image Tool

### 1. Tool Metadata Structure

```javascript
{
  slug: 'image-tool-name',
  name: 'Image Tool Name',
  categories: ['image-tools'],
  engineType: 'image',
  requiresAuth: false,
  config: {
    inputs: [
      {
        name: 'image',
        type: 'file',
        label: 'Image',
        required: true,
        accept: 'image/jpeg,image/png,image/webp'
      },
      // Additional parameters specific to your tool
    ],
    outputs: [
      {
        name: 'result',
        label: 'Processed Image',
        format: 'jpg' // or png, webp
      }
    ]
  },
  active: true
}
```

### 2. Engine Method Implementation

Add a new method to `ImageEngine.js`:

```javascript
async yourToolMethod({ image, param1, param2 }) {
  try {
    const tempPath = path.join('/tmp', `${Date.now()}-processed.jpg`);
    const sharpInstance = sharp(image.buffer);
    
    // Apply image processing
    await sharpInstance
      .yourSharpOperation(param1, param2)
      .toFile(tempPath);
    
    const processedBuffer = fs.readFileSync(tempPath);
    await unlinkAsync(tempPath);
    
    return {
      success: true,
      processedImage: processedBuffer.toString('base64'),
      format: 'jpg'
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
}
```

### 3. Update Engine Execute Method

Add a case for your tool slug in the `execute` method:

```javascript
async execute(tool, inputs) {
  switch(tool.slug) {
    case 'image-tool-name':
      return this.yourToolMethod(inputs);
    // ... existing cases
  }
}
```

## Image Processing Patterns

### File Handling
```javascript
// Input: image.buffer from FormData
const buffer = image.buffer;

// Create Sharp instance
const sharpInstance = sharp(buffer);

// Get metadata
const metadata = await sharpInstance.metadata();
```

### Common Operations

**Resize:**
```javascript
.sharpInstance.resize(width, height, {
  fit: 'cover', // or 'contain', 'fill', 'inside', 'outside'
  position: 'center'
})
```

**Crop:**
```javascript
.sharpInstance.extract({
  left: x,
  top: y,
  width: cropWidth,
  height: cropHeight
})
```

**Format Conversion:**
```javascript
// To JPEG
.sharpInstance.jpeg({ quality: 85 })

// To PNG
.sharpInstance.png({ compressionLevel: 9 })

// To WEBP
.sharpInstance.webp({ quality: 80 })
```

**Compression:**
```javascript
.sharpInstance.jpeg({ 
  quality: parseInt(quality), // 1-100
  mozjpeg: true // better compression
})
```

## Specialized UI Components

For complex image tools, create a specialized UI component:

### Component Structure:
```javascript
// frontend/src/components/YourImageToolUI.js
import { useState, useRef } from 'react';

const YourImageToolUI = ({ config, onSubmit, result }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [params, setParams] = useState({});
  
  // Handle file upload with preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('image', file);
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Call onSubmit with formData
  };
  
  return (
    <div>
      {/* File upload with preview */}
      {/* Parameter inputs */}
      {/* Submit button */}
      {/* Result display with download */}
    </div>
  );
};
```

### Integration in ToolLoader:
```javascript
// In ToolLoader.js
import YourImageToolUI from './YourImageToolUI';

// In render logic
{slug === 'image-tool-name' && (
  <YourImageToolUI
    config={toolConfig}
    onSubmit={handleSubmit}
    result={result}
  />
)}
```

## Example: Image Cropper Tool

### Metadata:
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

### Engine Method:
Implemented `cropImage()` with three crop modes and validation.

### Frontend Component:
Created `ImageCropperUI.js` with interactive preview, crop type selection, and visual feedback.

## Best Practices for Image Tools

### Performance:
- Process images asynchronously
- Use streaming for very large images (>10MB)
- Implement progress indicators for long operations
- Cache processed results when appropriate

### Quality:
- Maintain aspect ratio when resizing
- Preserve EXIF data when needed
- Provide quality/size tradeoff options
- Support progressive loading for large images

### User Experience:
- Show before/after previews
- Provide real-time parameter feedback
- Include preset options (common sizes, ratios)
- Support batch processing when applicable

### Error Handling:
- Validate image dimensions before processing
- Check file format compatibility
- Handle memory limits gracefully
- Provide clear error messages for unsupported operations

## Testing Image Tools

### Validation Checklist:
1. File upload works with supported formats
2. Preview generates correctly
3. Processing completes within reasonable time
4. Output image meets quality expectations
5. Download functionality works
6. Error handling for invalid inputs
7. Responsive design on different devices

### Test Images:
- Include test images of various formats (JPG, PNG, WEBP)
- Test with different sizes (small, medium, large)
- Verify edge cases (transparent PNGs, progressive JPGs)

## Common Image Tool Types

### Basic Operations:
- Format converter (JPG ↔ PNG ↔ WEBP)
- Size reducer (bulk compression)
- Resolution changer (DPI adjustment)

### Advanced Operations:
- Watermark adder
- Filter applicator (grayscale, sepia, etc.)
- Collage maker
- Background remover
- Face detector/blurrer

### Specialized Tools:
- Social media image optimizer
- Print-ready image preparer
- E-commerce product image processor
- Document image enhancer (for scanned documents)

## References

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Image File Formats](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types)
- [Color Spaces](https://en.wikipedia.org/wiki/Color_space)
- [EXIF Data](https://en.wikipedia.org/wiki/Exif)

## Version History

- **1.0.0** - Initial skill creation based on Image Cropper implementation
- **0.1.0** - Basic image tool guidelines
- **0.0.1** - Draft for image processing tools