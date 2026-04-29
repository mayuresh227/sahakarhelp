const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Rate limiter
const { globalLimiter } = require('./middleware/rateLimiter');
// Request ID middleware
const { requestIdMiddleware } = require('./middleware/requestId');

// Route imports
const toolsRouter = require('./routes/tools');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const invoiceRouter = require('./routes/invoiceRoutes');
const paymentRouter = require('./routes/payment');
const jobsRouter = require('./routes/jobs');
const pacsEKYCDownloadRouter = require('./routes/pacsEKYCDownload');

const app = express();
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  console.log(`Server starting on port ${PORT}`);
  console.log("🚀 Starting server with all routes...");
}

// ====================
// Trust Proxy (for correct IP behind reverse proxy)
// ====================
app.set('trust proxy', 1);

// ====================
// MongoDB Connection
// ====================
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sahakarhelp';

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000, // Timeout after 10s if no MongoDB
    socketTimeoutMS: 45000,
    bufferTimeoutMS: 5000, // Timeout for buffered commands
    bufferCommands: false, // Disable buffering to fail fast when not connected
  }).then(() => {
    console.log('✅ MongoDB connected successfully');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    // Do not crash the server; allow it to start but tools will fail
    console.log('⚠️ Server will start without database connection. Some features may be unavailable.');
  });
}

// Set global mongoose settings
mongoose.set('bufferTimeoutMS', 5000);

// ====================
// Basic middleware
// ====================
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));

// ====================
// Request ID Middleware (must be before routes)
// ====================
app.use(requestIdMiddleware);

// ====================
// Global Rate Limiter
// ====================
app.use(globalLimiter);


// ====================
// Early routes (no DB dependency)
// ====================
// Root route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Health endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    database: dbStatus
  });
});

// Test endpoint - guaranteed to work even if DB is down
app.get('/api/test', (req, res) => {
  console.log('TEST HIT');
  res.json({ message: 'API working 🚀' });
});

// ====================
// Mount route modules
// ====================
app.use('/api/tools', toolsRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/pacs-ekyc', pacsEKYCDownloadRouter);

// ====================
// Error handling
// ====================
// Global 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ====================
// Start server (only if not in test mode)
// ====================
let server;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT} (bound to 0.0.0.0)`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      mongoose.connection.close()
      .then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      });
    });
    setTimeout(() => {
      console.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

// Export app for testing
module.exports = app;
