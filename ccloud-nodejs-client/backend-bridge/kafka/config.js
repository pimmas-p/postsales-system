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

  // Validate required environment variables
  const requiredVars = [
    'KAFKA_BOOTSTRAP_SERVERS',
    'KAFKA_SASL_USERNAME',
    'KAFKA_SASL_PASSWORD'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.error(`❌ Missing required Kafka environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const config = {
    'bootstrap.servers': process.env.KAFKA_BOOTSTRAP_SERVERS,
    'security.protocol': 'SASL_SSL',
    'sasl.mechanisms': 'PLAIN',
    'sasl.username': process.env.KAFKA_SASL_USERNAME,
    'sasl.password': process.env.KAFKA_SASL_PASSWORD,
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
