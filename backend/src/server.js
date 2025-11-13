require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const db = require('./models');
const awsService = require('./services/aws.service');
const queueService = require('./services/queue.service');

// Import routes
const authRoutes = require('./routes/auth.routes');
const refPhotoRoutes = require('./routes/refPhoto.routes');
const scanJobRoutes = require('./routes/scanJob.routes');
const scanResultRoutes = require('./routes/scanResult.routes');
const socialMediaRoutes = require('./routes/socialMedia.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check database
    await db.sequelize.authenticate();
    const dbStatus = { connected: true, type: 'MySQL' };

    // Check Redis
    const redisStatus = await queueService.checkRedisHealth();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        redis: redisStatus
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ref-photos', refPhotoRoutes);
app.use('/api/scan-jobs', scanJobRoutes);
app.use('/api/scan-results', scanResultRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum 10MB allowed.' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database (in production, use migrations instead)
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: false });
      console.log('Database synced successfully.');
    }

    // Initialize AWS Rekognition collection (optional in development)
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (hasAWSCredentials) {
      try {
        await awsService.initializeRekognitionCollection();
        console.log('AWS Rekognition initialized successfully.');
      } catch (error) {
        console.error('Warning: Failed to initialize Rekognition collection:', error.message);
        console.error('Some features requiring AWS will not be available.');
      }
    } else {
      console.warn('⚠️  AWS credentials not configured - AWS features disabled');
      console.warn('   To enable AWS features, configure credentials in .env file');
      console.warn('   See backend/.env.example for required variables');
    }

    // Check Redis connection
    const redisHealth = await queueService.checkRedisHealth();
    if (redisHealth.connected) {
      console.log(`✅ Redis connected: ${redisHealth.host}:${redisHealth.port}`);
    } else {
      console.warn('⚠️  Redis connection failed:', redisHealth.error);
      console.warn('   Background job processing will not work');
      console.warn('   Configure Redis in .env file or use a hosted Redis service');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║          OrangePrivacy API Server                ║
║                                                   ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(36)}║
║  Port: ${PORT.toString().padEnd(42)}║
║  Region: ${(process.env.AWS_REGION || 'eu-west-1').padEnd(40)}║
║                                                   ║
║  Server is running and ready to accept requests  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await db.sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
