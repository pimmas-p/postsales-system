const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');
const { handleKycEvent, handleContractEvent, handlePaymentEvent } = require('../services/eventHandlers');

let consumer = null;

/**
 * Start Kafka consumer to listen to Post-Sales related events
 */
async function startConsumer() {
  const config = readKafkaConfig();
  
  // Configure consumer
  config['group.id'] = 'postsales-backend-bridge-group';
  config['auto.offset.reset'] = 'earliest';
  config['enable.auto.commit'] = 'true';

  const kafka = new Kafka();
  consumer = kafka.consumer(config);

  console.log('🔄 Connecting Kafka consumer...');
  await consumer.connect();
  console.log('✅ Kafka consumer connected!');

  // Subscribe to topics
  const topics = [
    'kyc.completed',
    'legal.contract.drafted',
    'payment.secondpayment.completed'
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
          case 'kyc.completed':
            await handleKycEvent(event);
            break;
          case 'legal.contract.drafted':
            await handleContractEvent(event);
            break;
          case 'payment.secondpayment.completed':
            await handlePaymentEvent(event);
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
