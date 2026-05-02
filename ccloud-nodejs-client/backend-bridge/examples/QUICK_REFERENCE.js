/**
 * QUICK REFERENCE: Sending Kafka Events from Service 1
 * 
 * Copy and paste these snippets into your route handlers or service files
 */

// =============================================================================
// 1. BASIC USAGE - Send existing event types
// =============================================================================

// Import the producer functions at the top of your file
const { publishHandoverCompleted, publishOnboardingStarted } = require('./kafka/producer');

// In your route handler or service function:

// Example: Send handover completed event
async function completeHandover(unitId, customerId) {
  // Your business logic here...
  
  // Send Kafka event
  await publishHandoverCompleted({
    unit_id: unitId,
    customer_id: customerId,
    handover_date: new Date().toISOString(),
    handover_by: 'Staff Name',
    handover_notes: 'All documents verified'
  });
  
  // Continue with your logic...
}

// Example: Send onboarding started event
async function startOnboarding(unitId, customerId) {
  // Your business logic here...
  
  // Send Kafka event
  await publishOnboardingStarted({
    unit_id: unitId,
    customer_id: customerId,
    onboarding_stage: 'documentation',
    assigned_to: 'Staff Name',
    start_date: new Date().toISOString()
  });
  
  // Continue with your logic...
}


// =============================================================================
// 2. IN EXPRESS ROUTES - Real-world example
// =============================================================================

// Example in routes/handover.routes.js
router.post('/handover/:id/complete', async (req, res) => {
  try {
    const handoverId = req.params.id;
    const { handover_by, handover_notes } = req.body;
    
    // Update database
    const result = await completeHandoverInDB(handoverId, handover_by, handover_notes);
    
    // Send Kafka event to notify other services
    await publishHandoverCompleted({
      unit_id: result.unit_id,
      customer_id: result.customer_id,
      handover_date: result.handover_date,
      handover_by: handover_by,
      handover_notes: handover_notes
    });
    
    res.json({ 
      success: true, 
      message: 'Handover completed and event published',
      data: result 
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// =============================================================================
// 3. CUSTOM EVENT - When you need a new event type
// =============================================================================

// Add this function to kafka/producer.js for reusable custom events
async function publishDefectReported(defectData) {
  try {
    if (!producer) {
      console.warn('⚠️  Kafka producer not initialized, skipping event publish');
      return null;
    }

    const topic = 'postsales.defect.reported';
    
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.reported',
      timestamp: new Date().toISOString(),
      data: {
        defectId: defectData.defect_id,
        unitId: defectData.unit_id,
        category: defectData.category,
        severity: defectData.severity,
        description: defectData.description,
        reportedBy: defectData.reported_by
      },
      metadata: {
        source: 'postsales-backend-bridge',
        version: '1.0'
      }
    };

    const message = {
      topic,
      messages: [{
        key: defectData.unit_id,
        value: JSON.stringify(event)
      }]
    };

    console.log(`📤 Publishing event to ${topic}:`, defectData.defect_id);
    const result = await producer.send(message);
    console.log(`✅ Event published successfully!`);

    return result;
    
  } catch (error) {
    console.error('❌ Failed to publish Kafka event:', error.message);
    return null;
  }
}

// Then use it in your route:
router.post('/defects', async (req, res) => {
  try {
    const defectData = req.body;
    
    // Save to database
    const savedDefect = await saveDefectToDB(defectData);
    
    // Publish Kafka event
    await publishDefectReported(savedDefect);
    
    res.json({ success: true, data: savedDefect });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// =============================================================================
// 4. ERROR HANDLING - Recommended pattern
// =============================================================================

async function safePublishEvent(publishFunction, eventData) {
  try {
    await publishFunction(eventData);
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to publish Kafka event:', error.message);
    // Optionally: Save to retry queue or dead letter queue
  }
}

// Usage:
router.post('/handover/:id/complete', async (req, res) => {
  try {
    const result = await completeHandoverInDB(handoverId);
    
    // Publish event - won't fail even if Kafka is down
    safePublishEvent(publishHandoverCompleted, {
      unit_id: result.unit_id,
      customer_id: result.customer_id,
      handover_date: result.handover_date,
      handover_by: req.body.handover_by,
      handover_notes: req.body.handover_notes
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// =============================================================================
// 5. BATCH EVENTS - When sending multiple events
// =============================================================================

async function publishMultipleDefects(defectsArray) {
  const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
  const { readKafkaConfig } = require('./kafka/config');

  const config = readKafkaConfig();
  if (!config) return;

  const kafka = new Kafka();
  const producer = kafka.producer(config);
  await producer.connect();

  const messages = defectsArray.map(defect => ({
    key: defect.unit_id,
    value: JSON.stringify({
      eventId: require('uuid').v4(),
      eventType: 'postsales.defect.reported',
      timestamp: new Date().toISOString(),
      data: defect
    })
  }));

  await producer.send({
    topic: 'postsales.defect.reported',
    messages: messages
  });

  await producer.disconnect();
}

// Usage:
const defects = [
  { defect_id: '1', unit_id: 'UNIT-001', category: 'plumbing' },
  { defect_id: '2', unit_id: 'UNIT-002', category: 'electrical' },
  { defect_id: '3', unit_id: 'UNIT-003', category: 'painting' }
];

await publishMultipleDefects(defects);


// =============================================================================
// 6. INITIALIZATION - Add to server.js
// =============================================================================

// In your server.js file, add this before starting the Express server:

const { initProducer } = require('./kafka/producer');
const { startConsumer } = require('./kafka/consumer');

async function startServer() {
  try {
    // Initialize Kafka producer
    await initProducer();
    console.log('✅ Kafka producer initialized');
    
    // Start Kafka consumer
    await startConsumer();
    console.log('✅ Kafka consumer started');
    
    // Start Express server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


// =============================================================================
// 7. TESTING - Quick test function
// =============================================================================

// Create a test file: test-kafka-producer.js
async function testKafkaProducer() {
  const { initProducer, publishHandoverCompleted } = require('./kafka/producer');
  
  try {
    console.log('🔄 Initializing Kafka producer...');
    await initProducer();
    
    console.log('📤 Sending test event...');
    await publishHandoverCompleted({
      unit_id: 'TEST-UNIT-001',
      customer_id: 'TEST-CUST-001',
      handover_date: new Date().toISOString(),
      handover_by: 'Test User',
      handover_notes: 'This is a test event'
    });
    
    console.log('✅ Test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testKafkaProducer();

// Run with: node test-kafka-producer.js


// =============================================================================
// 8. COMMON EVENT TYPES - Reference
// =============================================================================

/*
Topic Naming Convention: service.entity.action

Examples used in Post-Sales service:
- postsales.handover.completed      → When property handover is done
- postsales.onboarding.started      → When onboarding process begins
- postsales.onboarding.completed    → When onboarding is finished
- postsales.defect.reported         → When a defect is reported
- postsales.defect.resolved         → When a defect is fixed
- postsales.payment.received        → When payment is confirmed
- postsales.document.uploaded       → When document is uploaded
- postsales.inspection.scheduled    → When inspection is scheduled
- postsales.warranty.activated      → When warranty starts

Events we CONSUME from other services:
- managing.kyc.complete                          → From Managing service
- purchase.contract.drafted                      → From Purchase service
- payment.secondpayment.completed                → From Payment service
- payment.invoice.commonfees.completed           → From Payment service
- warranty.coverage.verified-topic               → From Warranty service
*/
