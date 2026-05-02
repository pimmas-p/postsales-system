/**
 * Simple Kafka Producer Test
 * 
 * This is a standalone test file to verify Kafka producer is working.
 * Run with: npm run kafka:test
 * Or: node examples/test-send-kafka-event.js
 */

require('dotenv').config();
const { initProducer, publishHandoverCompleted, publishOnboardingStarted } = require('../kafka/producer');

/**
 * Simple test: Send a handover completed event
 */
async function testSendEvent() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     Testing Kafka Producer - Service 1 (Post-Sales)   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Check environment variables
    console.log('📋 Checking configuration...');
    console.log('   KAFKA_ENABLED:', process.env.KAFKA_ENABLED || 'not set');
    console.log('   KAFKA_BOOTSTRAP_SERVERS:', process.env.KAFKA_BOOTSTRAP_SERVERS ? '✓ set' : '✗ not set');
    console.log('   KAFKA_API_KEY:', process.env.KAFKA_API_KEY ? '✓ set' : '✗ not set');
    console.log('   KAFKA_API_SECRET:', process.env.KAFKA_API_SECRET ? '✓ set' : '✗ not set');

    if (process.env.KAFKA_ENABLED !== 'true') {
      console.log('\n⚠️  Kafka is disabled (KAFKA_ENABLED is not set to "true")');
      console.log('   To enable Kafka, set KAFKA_ENABLED=true in your .env file\n');
      return;
    }

    // Step 2: Initialize producer
    console.log('\n🔄 Initializing Kafka producer...');
    await initProducer();
    console.log('✅ Producer initialized successfully!\n');

    // Step 3: Send test event
    console.log('📤 Sending test handover completed event...\n');
    
    const testData = {
      unit_id: `TEST-UNIT-${Date.now()}`,
      customer_id: `TEST-CUST-${Date.now()}`,
      handover_date: new Date().toISOString(),
      handover_by: 'Kafka Test Script',
      handover_notes: 'This is a test event from the producer test script'
    };

    console.log('Test event data:', {
      unit_id: testData.unit_id,
      customer_id: testData.customer_id,
      handover_date: testData.handover_date
    });

    const result = await publishHandoverCompleted(testData);

    if (result) {
      console.log('\n✅ SUCCESS! Event sent to Kafka successfully!');
      console.log('   Topic: postsales.handover.completed');
      console.log('   Unit ID:', testData.unit_id);
      console.log('   Customer ID:', testData.customer_id);
      console.log('\n🎉 Your Kafka producer is working correctly!\n');
    } else {
      console.log('\n⚠️  Event was not sent (producer may not be initialized)');
      console.log('   Check your Kafka configuration in .env file\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR: Failed to send event');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code || 'N/A');
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Check your .env file has correct Kafka credentials');
    console.log('   2. Verify KAFKA_BOOTSTRAP_SERVERS is correct');
    console.log('   3. Ensure your Kafka cluster is running');
    console.log('   4. Check network connectivity to Kafka cluster');
    console.log('   5. Verify API key and secret are valid\n');
    
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run the test
testSendEvent()
  .then(() => {
    console.log('Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
