require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { startConsumer } = require('./kafka/consumer');
const { initProducer } = require('./kafka/producer');
const handoverRoutes = require('./routes/handover.routes');
const onboardingRoutes = require('./routes/onboarding.routes');
const defectsRoutes = require('./routes/defects.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
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

    // Skip Kafka initialization for development (uncomment when Kafka is available)
    console.log('⏭️  Skipping Kafka initialization (REST API only mode)\n');
    
    // // Initialize Kafka producer (skip errors for development)
    // try {
    //   await initProducer();
    //   console.log('✅ Kafka producer initialized');
    // } catch (error) {
    //   console.warn('⚠️  Kafka producer initialization failed (continuing without Kafka)');
    //   console.warn('   Error:', error.message);
    // }

    // // Start Kafka consumer (skip errors for development)
    // try {
    //   await startConsumer();
    //   console.log('✅ Kafka consumer started\n');
    // } catch (error) {
    //   console.warn('⚠️  Kafka consumer initialization failed (continuing without Kafka)');
    //   console.warn('   Error:', error.message);
    // }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server is running on http://localhost:${PORT}`);
      console.log(`   📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`   ❤️  Health check: http://localhost:${PORT}/health`);
      console.log(`\n📋 Available API Endpoints:`);
      console.log(`   • Handover Service:   /api/handover/*`);
      console.log(`   • Onboarding Service: /api/onboarding/*`);
      console.log(`   • Defect Service:     /api/defects/*`);
      console.log(`\n📡 REST API ready (Kafka events disabled)\n`);
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
