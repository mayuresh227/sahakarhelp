const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');

// Route imports
const toolsRouter = require('./routes/tools');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const invoiceRouter = require('./routes/invoiceRoutes');
const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3001;

console.log("🚀 Starting server with all routes...");

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '10mb' }));

// Request timeout middleware (10 seconds)
app.use((req, res, next) => {
  req.setTimeout(10000, () => {
    console.warn(`Request timeout: ${req.method} ${req.url}`);
  });
  res.setTimeout(10000, () => {
    console.warn(`Response timeout: ${req.method} ${req.url}`);
  });
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working 🚀' });
});

// Mount route modules
app.use('/api/tools', toolsRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/payment', paymentRouter);

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
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