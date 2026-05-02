/**
 * Kafka Producer Example - Service 1 (Post-Sales Backend Bridge)
 * 
 * This example demonstrates how to send various types of events to Kafka
 * from the Post-Sales service (Service 1).
 */

// Load environment variables from .env file
require('dotenv').config();

const { initProducer, publishHandoverCompleted, publishOnboardingStarted } = require('../kafka/producer');

/**
 * Example 1: Send Handover Completed Event
 * 
 * This event is published when a property handover is completed.
 * Other services (like Defect Management) can listen to this event.
 */
async function exampleSendHandoverCompleted() {
  console.log('\n=== Example 1: Send Handover Completed Event ===\n');

  const handoverData = {
    unit_id: 'UNIT-2024-001',
    customer_id: 'CUST-12345',
    handover_date: new Date().toISOString(),
    handover_by: 'John Doe',
    handover_notes: 'All documents verified and keys handed over to customer'
  };

  try {
    const result = await publishHandoverCompleted(handoverData);
    
    if (result) {
      console.log('✅ Handover event sent successfully!');
      console.log('   Topic: postsales.handover.completed');
      console.log('   Result:', result);
    } else {
      console.log('⚠️  Kafka producer not initialized or event not sent');
    }
  } catch (error) {
    console.error('❌ Error sending handover event:', error.message);
  }
}

/**
 * Example 2: Send Onboarding Started Event
 * 
 * This event is published when owner onboarding process begins.
 */
async function exampleSendOnboardingStarted() {
  console.log('\n=== Example 2: Send Onboarding Started Event ===\n');

  const onboardingData = {
    unit_id: 'UNIT-2024-002',
    customer_id: 'CUST-67890',
    onboarding_stage: 'documentation',
    assigned_to: 'Jane Smith',
    start_date: new Date().toISOString()
  };

  try {
    const result = await publishOnboardingStarted(onboardingData);
    
    if (result) {
      console.log('✅ Onboarding event sent successfully!');
      console.log('   Topic: postsales.onboarding.started');
      console.log('   Result:', result);
    } else {
      console.log('⚠️  Kafka producer not initialized or event not sent');
    }
  } catch (error) {
    console.error('❌ Error sending onboarding event:', error.message);
  }
}

/**
 * Example 3: Send Custom Event (Generic)
 * 
 * This demonstrates how to send any custom event using the producer directly.
 */
async function exampleSendCustomEvent() {
  console.log('\n=== Example 3: Send Custom Event ===\n');

  const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
  const { readKafkaConfig } = require('../kafka/config');

  try {
    const config = readKafkaConfig();
    
    if (!config) {
      console.log('⚠️  Kafka is disabled');
      return;
    }

    const kafka = new Kafka();
    const producer = kafka.producer(config);

    await producer.connect();
    console.log('✅ Producer connected');

    // Custom event data
    const event = {
      eventId: require('uuid').v4(),
      eventType: 'postsales.custom.event',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a custom event from Service 1',
        userId: 'USER-001',
        action: 'test_action',
        metadata: {
          source: 'backend-bridge',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    };

    const message = {
      topic: 'postsales.custom.events',
      messages: [{
        key: event.eventId,
        value: JSON.stringify(event),
        headers: {
          'content-type': 'application/json',
          'event-type': event.eventType
        }
      }]
    };

    const result = await producer.send(message);
    
    console.log('✅ Custom event sent successfully!');
    console.log('   Topic:', message.topic);
    console.log('   Event ID:', event.eventId);
    console.log('   Partition:', result[0].partition);
    console.log('   Offset:', result[0].baseOffset);

    await producer.disconnect();
    
  } catch (error) {
    console.error('❌ Error sending custom event:', error.message);
  }
}

/**
 * Example 4: Send Batch Events
 * 
 * Send multiple events in a single batch for better performance.
 */
async function exampleSendBatchEvents() {
  console.log('\n=== Example 4: Send Batch Events ===\n');

  const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
  const { readKafkaConfig } = require('../kafka/config');

  try {
    const config = readKafkaConfig();
    
    if (!config) {
      console.log('⚠️  Kafka is disabled');
      return;
    }

    const kafka = new Kafka();
    const producer = kafka.producer(config);

    await producer.connect();

    // Create multiple events
    const events = [];
    for (let i = 1; i <= 5; i++) {
      events.push({
        eventId: require('uuid').v4(),
        eventType: 'postsales.batch.test',
        timestamp: new Date().toISOString(),
        data: {
          batchNumber: i,
          message: `Batch event ${i} of 5`
        }
      });
    }

    // Send all events in a batch
    const message = {
      topic: 'postsales.batch.events',
      messages: events.map(event => ({
        key: event.eventId,
        value: JSON.stringify(event)
      }))
    };

    const result = await producer.send(message);
    
    console.log(`✅ Sent ${events.length} events in batch!`);
    console.log('   Results:', result);

    await producer.disconnect();
    
  } catch (error) {
    console.error('❌ Error sending batch events:', error.message);
  }
}

/**
 * Example 5: Send Event with Retry Logic
 * 
 * Demonstrates robust event publishing with retry mechanism.
 */
async function exampleSendEventWithRetry() {
  console.log('\n=== Example 5: Send Event with Retry Logic ===\n');

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Attempt ${attempt} of ${maxRetries}...`);

      const handoverData = {
        unit_id: 'UNIT-RETRY-001',
        customer_id: 'CUST-RETRY-001',
        handover_date: new Date().toISOString(),
        handover_by: 'Retry Example User',
        handover_notes: 'Testing retry mechanism'
      };

      const result = await publishHandoverCompleted(handoverData);

      if (result) {
        console.log(`✅ Event sent successfully on attempt ${attempt}`);
        return;
      } else {
        console.log(`⚠️  Event not sent (producer not initialized)`);
        return;
      }

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt >= maxRetries) {
        console.error(`❌ All ${maxRetries} attempts failed`);
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Kafka Producer Examples - Service 1 (Post-Sales)     ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Initialize the producer first
    console.log('\n🔄 Initializing Kafka producer...');
    await initProducer();

    // Run examples
    await exampleSendHandoverCompleted();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    await exampleSendOnboardingStarted();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleSendCustomEvent();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleSendBatchEvents();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleSendEventWithRetry();

    console.log('\n✅ All examples completed!\n');

  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run specific example based on command line argument
const exampleNumber = process.argv[2];

if (exampleNumber) {
  const examples = {
    '1': exampleSendHandoverCompleted,
    '2': exampleSendOnboardingStarted,
    '3': exampleSendCustomEvent,
    '4': exampleSendBatchEvents,
    '5': exampleSendEventWithRetry
  };

  const selectedExample = examples[exampleNumber];
  
  if (selectedExample) {
    console.log(`\n🚀 Running Example ${exampleNumber}...\n`);
    initProducer()
      .then(() => selectedExample())
      .then(() => {
        console.log('\n✅ Example completed!\n');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      });
  } else {
    console.log('\n❌ Invalid example number. Use 1-5.\n');
    console.log('Usage: node kafka-producer-example.js [1-5]');
    console.log('  1 - Send Handover Completed Event');
    console.log('  2 - Send Onboarding Started Event');
    console.log('  3 - Send Custom Event');
    console.log('  4 - Send Batch Events');
    console.log('  5 - Send Event with Retry Logic');
    console.log('  (no argument) - Run all examples\n');
    process.exit(1);
  }
} else {
  // Run all examples if no argument provided
  runAllExamples()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  exampleSendHandoverCompleted,
  exampleSendOnboardingStarted,
  exampleSendCustomEvent,
  exampleSendBatchEvents,
  exampleSendEventWithRetry
};
