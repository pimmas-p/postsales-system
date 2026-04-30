/**
 * Read Kafka configuration from environment variables
 * This is more secure than reading from client.properties file
 */
function readKafkaConfig() {
  // Check if Kafka is enabled
  const kafkaEnabled = process.env.KAFKA_ENABLED === 'true';
  
  if (!kafkaEnabled) {
    console.log('ℹ️  Kafka is disabled (KAFKA_ENABLED=false)');
    return null;
  }

  // Get credentials
  const apiKey = process.env.KAFKA_API_KEY;
  const apiSecret = process.env.KAFKA_API_SECRET;
  const bootstrapServers = process.env.KAFKA_BOOTSTRAP_SERVERS;

  // Validate required environment variables
  if (!bootstrapServers) {
    console.error('❌ Missing required Kafka environment variable: KAFKA_BOOTSTRAP_SERVERS');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ Missing required Kafka environment variable: KAFKA_API_KEY');
    process.exit(1);
  }

  if (!apiSecret) {
    console.error('❌ Missing required Kafka environment variable: KAFKA_API_SECRET');
    process.exit(1);
  }

  const config = {
    'bootstrap.servers': bootstrapServers,
    'security.protocol': 'SASL_SSL',
    'sasl.mechanisms': 'PLAIN',
    'sasl.username': apiKey,
    'sasl.password': apiSecret,
  };
  
  // SSL certificate verification - can be disabled for development
  const disableSSLVerification = process.env.KAFKA_DISABLE_SSL_VERIFICATION === 'true';
  if (disableSSLVerification) {
    console.warn('⚠️  Kafka SSL certificate verification is DISABLED');
    config['enable.ssl.certificate.verification'] = 'false';
  }
  
  return config;
}

module.exports = {
  readKafkaConfig
};
