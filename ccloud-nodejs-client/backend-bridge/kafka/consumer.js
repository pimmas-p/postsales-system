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
let isConnected = false;
let lastMessageTimestamp = null;

// Track messages received per topic
const topicStats = {
  'managing.kyc.completed': { count: 0, lastReceived: null },
  'purchase.contract.drafted': { count: 0, lastReceived: null },
  'payment.secondpayment.completed': { count: 0, lastReceived: null },
  'payment.invoice.commonfees.completed': { count: 0, lastReceived: null },
  'warranty.coverage.registered': { count: 0, lastReceived: null },
  'warranty.coverage.verified': { count: 0, lastReceived: null }
};

/**
 * Get Kafka consumer status and statistics
 */
function getConsumerStatus() {
  return {
    enabled: process.env.KAFKA_ENABLED === 'true',
    connected: isConnected,
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP_ID || 'postsales-backend-bridge-group',
    subscribedTopics: Object.keys(topicStats),
    topicStats: topicStats,
    lastMessageTimestamp: lastMessageTimestamp,
    totalMessagesReceived: Object.values(topicStats).reduce((sum, stat) => sum + stat.count, 0)
  };
}

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
  // Use 'latest' to prevent processing old accumulated test messages (memory optimization)
  // This ensures consumer only processes NEW messages after activation
  config['auto.offset.reset'] = 'latest';
  config['enable.auto.commit'] = 'true';

  const kafka = new Kafka();
  consumer = kafka.consumer(config);

  console.log('🔄 Connecting Kafka consumer...');
  await consumer.connect();
  isConnected = true;
  console.log('✅ Kafka consumer connected!');

  // Subscribe to topics
  // - managing.kyc.completed: Managing team (Team 4) - KYC completion
  // - purchase.contract.drafted: Legal team (Team 5) - Purchase contract drafted (sale completed)
  // - payment.secondpayment.completed: Payment team (Team 6) - Second payment
  // - payment.invoice.commonfees.completed: Payment team (Team 6) - Common fees
  // - warranty.coverage.registered: Legal team (Team 5) - Warranty registration (fixed topic name)
  // - warranty.coverage.verified: Legal team (Team 5) - Warranty verification (fixed topic name)
  const topics = [
    'managing.kyc.completed',
    'purchase.contract.drafted',
    'payment.secondpayment.completed',
    'payment.invoice.commonfees.completed',
    'warranty.coverage.registered',
    'warranty.coverage.verified'
  ];

  await consumer.subscribe({ topics });
  console.log(`📡 Subscribed to topics: ${topics.join(', ')}`);

  // Start consuming messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // Track message statistics
        if (topicStats[topic]) {
          topicStats[topic].count++;
          topicStats[topic].lastReceived = new Date().toISOString();
        }
        lastMessageTimestamp = new Date().toISOString();
        
        const event = JSON.parse(message.value.toString());
        
        // Verbose logging in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`\n📩 Received event from ${topic}:`);
          console.log(`   Partition: ${partition}`);
          console.log(`   Offset: ${message.offset}`);
          console.log(`   Key: ${message.key?.toString()}`);
          console.log(`   Timestamp: ${new Date(parseInt(message.timestamp)).toISOString()}`);
        } else {
          // Production: compact logging
          console.log(`[Kafka] Received: ${topic} (offset: ${message.offset})`);
        }

        // Route to appropriate handler
        switch (topic) {
          case 'managing.kyc.completed':
            await handleKycEvent(event);
            break;
          case 'purchase.contract.drafted':
            await handleContractEvent(event);
            break;
          case 'payment.secondpayment.completed':
            await handlePaymentEvent(event);
            break;
          case 'payment.invoice.commonfees.completed':
            await handleCommonFeesEvent(event);
            break;
          case 'warranty.coverage.registered':
            await handleWarrantyRegisteredEvent(event);
            break;
          case 'warranty.coverage.verified':
            await handleWarrantyVerifiedEvent(event);
            break;
          default:
            console.warn(`⚠️  Unknown topic: ${topic}`);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Event processed successfully\n`);
        }
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
      isConnected = false;
      await consumer.disconnect();
      console.log('✅ Kafka consumer disconnected');
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  startConsumer,
  getConsumerStatus
};
