const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Enforce NODE_ENV - throw error if not defined
const validNodeEnvs = ['development', 'production', 'test'];
if (!process.env.NODE_ENV) {
  throw new Error('FATAL: NODE_ENV environment variable is not defined. Must be "development", "production", or "test".');
}

if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
  throw new Error(`FATAL: NODE_ENV must be one of: ${validNodeEnvs.join(', ')}. Got: "${process.env.NODE_ENV}"`);
}

// Strong secret validation - minimum 32 characters
function validateSecret(secret, name) {
  if (!secret) {
    throw new Error(`FATAL: ${name} is required`);
  }
  if (secret.length < 32) {
    throw new Error(`FATAL: ${name} must be at least 32 characters. Got ${secret.length}`);
  }
}

// Enforce production start command - in production, secrets must be real (not placeholder)
if (process.env.NODE_ENV === 'production') {
  const placeholderPatterns = [
    /your_[^_]+_secret/i,
    /change_in_production/i,
    /placeholder/i,
    /changeme/i,
    /set_me/i
  ];
  
  const secrets = [process.env.JWT_SECRET, process.env.SESSION_SECRET, process.env.NEXTAUTH_SECRET];
  secrets.forEach((secret, i) => {
    const names = ['JWT_SECRET', 'SESSION_SECRET', 'NEXTAUTH_SECRET'];
    if (secret && placeholderPatterns.some(p => p.test(secret))) {
      throw new Error(`FATAL: ${names[i]} appears to be a placeholder. Set a secure value for production.`);
    }
  });
  
  // Validate minimum length in production
  validateSecret(process.env.JWT_SECRET, 'JWT_SECRET');
  validateSecret(process.env.SESSION_SECRET, 'SESSION_SECRET');
  validateSecret(process.env.NEXTAUTH_SECRET, 'NEXTAUTH_SECRET');
}

// Load .env files only in development/test (production uses system env vars)
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  const baseEnvPath = path.join(__dirname, '..', '.env');
  const envSpecificPath = path.join(__dirname, `..`, `.env.${process.env.NODE_ENV}`);

  if (fs.existsSync(baseEnvPath)) {
    require('dotenv').config({ path: baseEnvPath });
    console.log(`[ENV] Loaded base .env`);
  }

  if (fs.existsSync(envSpecificPath)) {
    require('dotenv').config({ path: envSpecificPath });
    console.log(`[ENV] Loaded ${envSpecificPath}`);
  } else if (process.env.NODE_ENV === 'development') {
    throw new Error(`FATAL: Environment file not found: ${envSpecificPath}`);
  }
}

// Redis config resolver - compatible with BullMQ
function buildRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const redisUrl = new URL(process.env.REDIS_URL);
      if (!['redis:', 'rediss:'].includes(redisUrl.protocol)) {
        throw new Error(`Invalid protocol: ${redisUrl.protocol}`);
      }
      return { url: process.env.REDIS_URL };
    } catch (e) {
      throw new Error(`Invalid REDIS_URL: ${process.env.REDIS_URL}. Error: ${e.message}`);
    }
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379
  };
}

const redisConnection = buildRedisConnection();
console.log(`[ENV] Redis config:`, JSON.stringify(redisConnection));

function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required secrets
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }
  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is required');
  }
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required');
  }

  // Database
  if (!process.env.MONGO_URI) {
    errors.push('MONGO_URI is required');
  }

  // Redis - either URL or HOST+PORT
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasRedisHost = !!process.env.REDIS_HOST;
  const hasRedisPort = !!process.env.REDIS_PORT;

  if (!hasRedisUrl && !(hasRedisHost && hasRedisPort)) {
    errors.push('Either REDIS_URL or both REDIS_HOST and REDIS_PORT are required');
  }

  // Frontend URL
  if (!process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL is required');
  }

  // Log loaded values for debugging
  console.log('[ENV] MAX_FILE_SIZE_MB:', process.env.MAX_FILE_SIZE_MB);
  console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  if (warnings.length > 0) {
    console.warn('[ENV] Warnings:', warnings);
  }
}

if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
} else {
  console.log('[ENV] Test mode - skipping full validation');
}

const app = express();
const PORT = process.env.PORT || 8080;

// Startup logs
const mongoType = process.env.MONGO_URI?.includes('mongodb+srv') ? 'Atlas' : 'local';
const redisType = process.env.REDIS_URL ? 'cloud' : 'local';

console.log('='.repeat(50));
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV}`);
console.log(`[STARTUP] MongoDB: ${mongoType}`);
console.log(`[STARTUP] Redis: ${redisType}`);
console.log(`[STARTUP] Frontend: ${process.env.FRONTEND_URL}`);
console.log('='.repeat(50));

// ====================
// Trust Proxy (for correct IP behind reverse proxy)
// ====================
app.set('trust proxy', 1);

// ====================
// MongoDB Connection
// ====================
const MONGODB_URI = process.env.MONGO_URI;

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferTimeoutMS: 5000,
    bufferCommands: false,
  }).then(() => {
    console.log('✅ MongoDB connected successfully');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Cannot start server without MongoDB in production. Exiting.');
      process.exit(1);
    }
    console.log('⚠️ Server will start without database connection. Some features may be unavailable.');
  });
}

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
const { requestIdMiddleware } = require('./middleware/requestId');
app.use(requestIdMiddleware);

// ====================
// Global Rate Limiter
// ====================
const { globalLimiter } = require('./middleware/rateLimiter');
app.use(globalLimiter);

// ====================
// Early routes (no DB dependency)
// ====================
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    database: dbStatus
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API working 🚀' });
});

// ====================
// Mount route modules
// ====================
const toolsRouter = require('./routes/tools');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const invoiceRouter = require('./routes/invoiceRoutes');
const paymentRouter = require('./routes/payment');
const jobsRouter = require('./routes/jobs');
const pacsEKYCDownloadRouter = require('./routes/pacsEKYCDownload');

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
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

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

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

module.exports = app;