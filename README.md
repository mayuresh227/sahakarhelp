# SahakarHelp - Tool Builder Platform

SahakarHelp is a modular, config-driven tool building platform that allows developers to create and manage various utility tools through a unified registry system. The platform supports multiple engine types (calculator, document, PDF, image, conversion) and provides dynamic routing, frontend UI generation, and backend processing.

## Project Structure

```
SahakarHelp/
├── backend/                    # Node.js backend
│   ├── engines/               # Engine implementations
│   │   ├── CalculatorEngine.js
│   │   ├── DocumentEngine.js
│   │   ├── ImageEngine.js     # Image processing (compression, resizing, cropping)
│   │   └── PDFEngine.js
│   ├── models/                # MongoDB models
│   │   ├── ToolMetadata.js
│   │   └── InvoiceHistory.js
│   ├── routes/                # Express routes
│   │   ├── tools.js
│   │   └── invoiceRoutes.js
│   ├── services/              # Core services
│   │   └── ToolRegistry.js    # Tool registration and execution
│   ├── initToolRegistry.js    # Tool initialization and seeding
│   └── server.js              # Main server
├── frontend/                  # Next.js frontend
│   ├── src/app/               # App router pages
│   ├── src/components/        # UI components
│   │   ├── ToolLoader.js      # Dynamic tool loader
│   │   ├── ImageCropperUI.js  # Image cropping interface
│   │   ├── ImageToolUI.js     # Generic image tool UI
│   │   └── ... other components
│   └── src/services/          # Frontend services
└── plans/                     # Architecture documentation
```

## Key Features

### 1. Tool Registry System
- Centralized tool registration and management
- Dynamic tool discovery and execution
- Config-driven tool definitions
- Support for multiple engine types

### 2. Engine Architecture
- **Calculator Engine**: Basic arithmetic operations
- **Document Engine**: Document generation (invoices, resumes)
- **PDF Engine**: PDF manipulation (compression, conversion)
- **Image Engine**: Image processing (compression, resizing, cropping)

### 3. Dynamic Frontend
- Automatic UI generation from tool configuration
- Specialized UI components for complex tools
- Responsive design with Tailwind CSS
- Real-time preview and download capabilities

### 4. Image Processing Tools
- **Image Compressor**: Reduce image file size with quality control
- **Image Resizer**: Resize images to specific dimensions
- **Image Cropper**: Crop images with custom, square, or circular crops

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd SahakarHelp
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up environment variables:
   ```bash
   # In backend/.env
   MONGODB_URI=mongodb://localhost:27017/sahakarhelp
   PORT=3001
   ```

5. Start MongoDB:
   ```bash
   mongod
   ```

6. Run the development servers:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

7. Open your browser to `http://localhost:3000`

## Creating New Tools

To create a new tool using the SahakarHelp Tool Builder system:

1. **Define Tool Metadata**: Add tool configuration in `backend/initToolRegistry.js`
2. **Implement Engine Logic**: Add corresponding method in the appropriate engine
3. **Create Frontend UI**: Build specialized UI component if needed
4. **Register Tool**: Tool will be automatically registered on server start

### Example: Image Cropper Tool

The Image Cropper tool demonstrates the full tool creation process:

1. **Backend**: Added `cropImage` method to `ImageEngine.js`
2. **Metadata**: Registered tool with slug `image-cropper` in `initToolRegistry.js`
3. **Frontend**: Created `ImageCropperUI.js` component with preview and crop controls
4. **Integration**: Updated `ToolLoader.js` to use the specialized component

## Available Tools

### Calculator Tools
- Basic Calculator
- Scientific Calculator

### Document Tools
- GST Invoice Generator
- Resume Generator

### PDF Tools
- PDF Compressor
- PDF to Image Converter
- Image to PDF Converter

### Image Tools
- Image Compressor
- Image Resizer
- **Image Cropper** (New!)

## Architecture

### ToolRegistry Service
The `ToolRegistry` service manages tool registration, discovery, and execution. It maintains:
- Tool metadata mapping (slug → configuration)
- Engine instances (engineType → engine)
- Execution routing based on tool configuration

### Dynamic Routing
Tools are accessible via:
- `GET /api/tools` - List all tools
- `GET /api/tools/:slug/config` - Get tool configuration
- `POST /api/tools/:slug` - Execute tool with inputs

### Config-Driven UI
Frontend components read tool configuration and dynamically render appropriate input fields, maintaining consistency across tools while allowing specialized UIs for complex operations.

## Development Guidelines

### Adding New Engine Types
1. Create engine class in `backend/engines/`
2. Implement `execute(tool, inputs)` method
3. Register engine in `initToolRegistry.js`
4. Add frontend component mapping in `ToolLoader.js`

### Tool Configuration Schema
```javascript
{
  slug: 'tool-slug',
  name: 'Tool Name',
  categories: ['category'],
  engineType: 'engine-type',
  requiresAuth: false,
  config: {
    inputs: [
      { name: 'field', type: 'text|number|file|select', label: 'Field Label', required: true }
    ],
    outputs: [
      { name: 'result', label: 'Output Label', format: 'jpg|pdf|json' }
    ]
  }
}
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## Acknowledgments

- Built with Node.js, Express, MongoDB, Next.js, and Tailwind CSS
- Image processing powered by Sharp library
- PDF processing with PDFKit and pdf-lib