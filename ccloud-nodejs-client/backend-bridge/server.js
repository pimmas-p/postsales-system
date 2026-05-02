require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { startConsumer, getConsumerStatus } = require('./kafka/consumer');
const { initProducer } = require('./kafka/producer');
const handoverRoutes = require('./routes/handover.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const defectsRoutes = require('./routes/defects.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

  console.log('🔐 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins
    const isAllowed = allowedOrigins.some(allowed => origin === allowed);
    
    // Also allow all Vercel preview URLs (*.vercel.app)
    const isVercelDomain = origin.endsWith('.vercel.app');
    
    // In development, allow all origins
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isAllowed || isVercelDomain || isDevelopment) {
      callback(null, true);
    } else {
      console.warn('⚠️  CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'postsales-backend-bridge',
    timestamp: new Date().toISOString()
  });
});

// Kafka status endpoint
app.get('/kafka/status', (req, res) => {
  const status = getConsumerStatus();
  res.json({
    success: true,
    data: status
  });
});

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Post-Sales API Docs',
  customfavIcon: '/favicon.ico'
}));

// API Routes
app.use('/api/handover', handoverRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/defects', defectsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function startServer() {
  try {
    console.log('\n🚀 Starting Post-Sales Backend Bridge...\n');

    // Check required environment variables
    console.log('🔍 Environment Variables Check:');
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SECRET_KEY',
      'PORT'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    requiredEnvVars.forEach(varName => {
      const isSet = process.env[varName] ? '✅' : '❌';
      const value = varName.includes('KEY') || varName.includes('PASSWORD') 
        ? '(hidden)' 
        : process.env[varName] || 'NOT SET';
      console.log(`   ${isSet} ${varName}: ${isSet === '✅' ? value : 'MISSING'}`);
    });
    
    if (missingVars.length > 0) {
      console.error('\n❌ ERROR: Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n   Please set these in Render Dashboard > Environment\n');
      process.exit(1);
    }
    
    console.log('');

    // Initialize Kafka if enabled
    if (process.env.KAFKA_ENABLED === 'true') {
      console.log('🔌 Kafka is enabled - Initializing Kafka connections...\n');
      
      // Initialize Kafka producer
      try {
        await initProducer();
        console.log('✅ Kafka producer initialized');
      } catch (error) {
        console.warn('⚠️  Kafka producer initialization failed (continuing without producer)');
        console.warn('   Error:', error.message);
      }

      // Start Kafka consumer
      try {
        await startConsumer();
        console.log('✅ Kafka consumer started\n');
      } catch (error) {
        console.warn('⚠️  Kafka consumer initialization failed (continuing without consumer)');
        console.warn('   Error:', error.message);
      }
    } else {
      console.log('⏭️  Kafka is disabled (KAFKA_ENABLED=false) - REST API only mode\n');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`   📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`   ❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`\n📋 Available API Endpoints:`);
      console.log(`   • Handover Service:   /api/handover/*`);
      console.log(`   • Onboarding Service: /api/onboarding/*`);
      console.log(`   • Defect Service:     /api/defects/*`);
      
      const kafkaStatus = process.env.KAFKA_ENABLED === 'true' ? '✅ Kafka events enabled' : '📡 REST API only (Kafka disabled)';
      console.log(`\n${kafkaStatus}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
