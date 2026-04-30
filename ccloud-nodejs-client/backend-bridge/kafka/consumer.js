const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');
const { 
  handleKycEvent, 
  handleContractEvent, 
  handlePaymentEvent,
  handleCommonFeesEvent,
  handleWarrantyRegisteredEvent,
  handleWarrantyVerifiedEvent
} = require('../services/eventHandlers');

let consumer = null;

/**
 * Start Kafka consumer to listen to Post-Sales related events
 */
async function startConsumer() {
  const config = readKafkaConfig();
  
  // Check if Kafka is disabled
  if (!config) {
    console.log('ℹ️  Kafka consumer not started (Kafka is disabled)');
    return;
  }
  
  // Configure consumer with environment variable or default
  config['group.id'] = process.env.KAFKA_CONSUMER_GROUP_ID || 'postsales-backend-bridge-group';
  config['auto.offset.reset'] = 'earliest';
  config['enable.auto.commit'] = 'true';

  const kafka = new Kafka();
  consumer = kafka.consumer(config);

  console.log('🔄 Connecting Kafka consumer...');
  await consumer.connect();
  console.log('✅ Kafka consumer connected!');

  // Subscribe to topics
  // - managing.kyc.completed: Managing team (Team 4) - KYC completion
  // - legal.contract.drafted: Legal team (Team 5) - Contract drafted
  // - payment.secondpayment.completed: Payment team (Team 6) - Second payment
  // - payment.invoice.commonfees.completed: Payment team (Team 6) - Common fees
  // - legal.warranty.coverage.registered: Legal team (Team 5) - Warranty registration
  // - legal.warranty.coverage.verified: Legal team (Team 5) - Warranty verification
  const topics = [
    'managing.kyc.completed',
    'legal.contract.drafted',
    'payment.secondpayment.completed',
    'payment.invoice.commonfees.completed',
    'legal.warranty.coverage.registered',
    'legal.warranty.coverage.verified'
  ];

  await consumer.subscribe({ topics });
  console.log(`📡 Subscribed to topics: ${topics.join(', ')}`);

  // Start consuming messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        
        console.log(`\n📩 Received event from ${topic}:`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Key: ${message.key?.toString()}`);
        console.log(`   Timestamp: ${new Date(parseInt(message.timestamp)).toISOString()}`);

        // Route to appropriate handler
        switch (topic) {
          case 'managing.kyc.completed':
            await handleKycEvent(event);
            break;
          case 'legal.contract.drafted':
            await handleContractEvent(event);
            break;
          case 'payment.secondpayment.completed':
            await handlePaymentEvent(event);
            break;
          case 'payment.invoice.commonfees.completed':
            await handleCommonFeesEvent(event);
            break;
          case 'legal.warranty.coverage.registered':
            await handleWarrantyRegisteredEvent(event);
            break;
          case 'legal.warranty.coverage.verified':
            await handleWarrantyVerifiedEvent(event);
            break;
          default:
            console.warn(`⚠️  Unknown topic: ${topic}`);
        }

        console.log(`✅ Event processed successfully\n`);
      } catch (error) {
        console.error(`❌ Error processing message from ${topic}:`, error.message);
        console.error(error.stack);
      }
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down Kafka consumer...');
    if (consumer) {
      await consumer.disconnect();
      console.log('✅ Kafka consumer disconnected');
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  startConsumer
};
