const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

const toolsRouter = require('./routes/tools');
const invoiceRouter = require('./routes/invoiceRoutes');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const paymentRouter = require('./routes/payment');
const { authMiddleware } = require('./middleware/auth');
const { analyticsMiddleware } = require('./middleware/analytics');
const { requestLogger, ipBlocklist } = require('./middleware/security');
require('./initToolRegistry');

const app = express();
const PORT = process.env.PORT || 3001;

// Debug logs
console.log("🚀 Server starting...");
console.log("PORT:", process.env.PORT || 3001);
console.log("Mongo URI exists:", !!process.env.MONGODB_URI);
console.log("NODE_ENV:", process.env.NODE_ENV || 'development');

// ✅ Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting: 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(xss());
app.use(mongoSanitize());

// ✅ Additional security middleware
app.use(requestLogger);
app.use(ipBlocklist);

// ✅ Root route (IMPORTANT)
app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// ✅ MongoDB Connection (FIXED)
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        console.log("Database connected successfully");
    })
    .catch((err) => {
        console.error("❌ MongoDB Error:", err.message);
        console.error("Failed to connect to MongoDB. Check MONGODB_URI environment variable.");
    });

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  // Optionally send to external monitoring
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Optionally send to external monitoring
});

// ✅ Attach auth middleware
app.use(authMiddleware);

// ✅ Analytics middleware (track all API calls)
app.use(analyticsMiddleware({
    trackRequests: true,
    trackErrors: true,
    trackResponseTime: true,
    excludePaths: ['/'] // exclude root route
}));

// ✅ Routes
app.use('/api/tools', toolsRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/payment', paymentRouter);

// ✅ Test API route
app.get("/api/test", (req, res) => {
    res.json({ message: "API working 🚀" });
});

// ✅ Error handler (secure – no stack traces in production)
app.use(async (err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = err.statusCode || 500;
    
    console.error("GLOBAL ERROR:", err);
    // Log error with stack for debugging
    console.error(`🔥 Error ${statusCode}:`, err.message);
    if (isDevelopment) {
        console.error(err.stack);
    }
    
    // Track error in analytics (include stack only in development)
    try {
        const Analytics = require('./models/Analytics');
        const analytics = new Analytics({
            userId: req.user?.id || null,
            action: 'error',
            metadata: {
                method: req.method,
                path: req.path,
                error: err.message,
                stack: isDevelopment ? err.stack : undefined
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            errorMessage: err.message,
            statusCode,
            createdAt: new Date()
        });
        await analytics.save();
    } catch (analyticsError) {
        console.error('Failed to log error to analytics:', analyticsError.message);
    }
    
    // Determine safe error message for client
    let clientError;
    if (statusCode >= 400 && statusCode < 500 && err.expose !== false) {
        // 4xx client errors can be shown (but sanitize)
        clientError = err.message || 'Bad request';
    } else {
        // 5xx server errors – hide internal details in production
        clientError = isDevelopment ? err.message : 'Internal server error';
    }
    
    res.status(statusCode).json({
        error: clientError,
        ...(isDevelopment && { details: err.message, stack: err.stack })
    });
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});