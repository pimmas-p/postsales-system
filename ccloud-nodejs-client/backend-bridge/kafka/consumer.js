const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('./config');
const util = require('util');
const { 
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
  'contract.drafted': { count: 0, lastReceived: null },
  'payment.secondpayment.completed': { count: 0, lastReceived: null },
  'payment.invoice.commonfees.completed': { count: 0, lastReceived: null },
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

  // Subscribe to topics (ตามตาราง integration)
  // - contract.drafted: Legal team - Contract drafted
  // - payment.secondpayment.completed: Payment team - Second payment
  // - payment.invoice.commonfees.completed: Payment team - Common fees
  // - warranty.coverage.verified: Legal team - Warranty verification
  const topics = [
    'contract.drafted',
    'payment.secondpayment.completed',
    'payment.invoice.commonfees.completed',
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
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📩 RECEIVED EVENT from topic: ${topic}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Timestamp: ${new Date(parseInt(message.timestamp)).toISOString()}`);
        console.log(`\n📦 Event Payload:`);
        console.log(util.inspect(event, { depth: null, colors: true }));

        console.log(`\n⚙️  Processing event...`);

        // Route to appropriate handler
        switch (topic) {
          case 'contract.drafted':
            await handleContractEvent(event);
            break;
          case 'payment.secondpayment.completed':
            await handlePaymentEvent(event);
            break;
          case 'payment.invoice.commonfees.completed':
            await handleCommonFeesEvent(event);
            break;
          case 'warranty.coverage.verified':
            await handleWarrantyVerifiedEvent(event);
            break;
          default:
            console.warn(`⚠️  Unknown topic: ${topic}`);
        }

        console.log(`\n✅ Event processed successfully!`);
        console.log(`${'='.repeat(80)}\n`);
      } catch (error) {
        console.error(`\n❌ ERROR processing message from ${topic}:`);
        console.error(`   Message: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        console.error(`${'='.repeat(80)}\n`);
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
