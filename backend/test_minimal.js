const express = require('express');
const app = express();
const PORT = 3002;

// Basic middleware
app.use(require('helmet')());
app.use(require('cors')());
app.use(require('body-parser').json({ limit: '10mb' }));

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('TEST HIT');
  res.json({ message: 'API working 🚀' });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Root
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});