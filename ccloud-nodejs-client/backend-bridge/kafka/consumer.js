const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');
const { 
  handleKycEvent, 
  handleContractEvent, 
  handlePaymentEvent,
  handleCommonFeesEvent,
  handleWarrantyVerifiedEvent
} = require('../services/eventHandlers');

let consumer = null;
let isConnected = false;
let lastMessageTimestamp = null;

// Track messages received per topic
const topicStats = {
  'managing.kyc.complete': { count: 0, lastReceived: null },
  'purchase.contract.drafted': { count: 0, lastReceived: null },
  'payment.secondpayment.completed': { count: 0, lastReceived: null },
  'payment.invoice.commonfees.completed': { count: 0, lastReceived: null },
  'warranty.coverage.verified-topic': { count: 0, lastReceived: null }
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

  // Subscribe to topics (ตามตาราง integration)
  // - managing.kyc.complete: Managing team - KYC completion
  // - purchase.contract.drafted: Legal team - Purchase contract drafted
  // - payment.secondpayment.completed: Payment team - Second payment
  // - payment.invoice.commonfees.completed: Payment team - Common fees
  // - warranty.coverage.verified-topic: Legal team - Warranty verification
  const topics = [
    'managing.kyc.complete',
    'purchase.contract.drafted',
    'payment.secondpayment.completed',
    'payment.invoice.commonfees.completed',
    'warranty.coverage.verified-topic'
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
        
        console.log(`\n📩 Received event from ${topic}:`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Timestamp: ${new Date(parseInt(message.timestamp)).toISOString()}`);
        console.log(`   Payload:`, JSON.stringify(event, null, 2));

        // Route to appropriate handler
        switch (topic) {
          case 'managing.kyc.complete':
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
          case 'warranty.coverage.verified-topic':
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
