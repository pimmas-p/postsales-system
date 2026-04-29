const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const fs = require('fs');

/**
 * Read Kafka configuration from client.properties
 */
function readKafkaConfig() {
  const data = fs.readFileSync('./client.properties', 'utf8').toString().split('\n');
  const config = data.reduce((acc, line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return acc;
    const [key, value] = trimmedLine.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});
  
  // Add SSL workaround for development - disable certificate verification
  config['enable.ssl.certificate.verification'] = 'false';
  
  return config;
}

/**
 * Test Kafka connection and send a test message
 */
async function testConnection() {
  console.log('🔄 Testing Kafka connection...\n');
  
  const config = readKafkaConfig();
  console.log('📡 Bootstrap Server:', config['bootstrap.servers']);
  console.log('👤 Username:', config['sasl.username']);
  console.log('');
  
  const kafka = new Kafka();
  const producer = kafka.producer(config);
  
  try {
    console.log('🔌 Connecting to Kafka...');
    await producer.connect();
    console.log('✅ Connected successfully!\n');
    
    // Test sending a message to the specified topic
    const testTopic = 'project.release.create-topic';
    console.log(`📤 Sending test message to topic: ${testTopic}`);
    
    const testMessage = {
      eventId: require('crypto').randomUUID(),
      eventType: 'test.connection',
      timestamp: new Date().toISOString(),
      message: 'Test connection from Node.js Backend Bridge',
      source: 'postsales-backend-bridge'
    };
    
    await producer.send({
      topic: testTopic,
      messages: [{
        key: 'test-key',
        value: JSON.stringify(testMessage, null, 2)
      }]
    });
    
    console.log('✅ Message sent successfully!');
    console.log('📦 Message content:');
    console.log(JSON.stringify(testMessage, null, 2));
    console.log('');
    
    await producer.disconnect();
    console.log('✅ Disconnected. Test completed!\n');
    console.log('🎉 Kafka connection is working! You can now enable Kafka in backend-bridge/server.js');
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- Check if API Key is valid in Confluent Cloud');
    console.error('- Verify the cluster is running');
    console.error('- Confirm topic "project.release.create-topic" exists');
    process.exit(1);
  }
}

// Run the test
testConnection();
