const fs = require('fs');
const path = require('path');

/**
 * Read Kafka configuration from client.properties file
 */
function readKafkaConfig() {
  const configPath = path.join(__dirname, '../../client.properties');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ client.properties not found!');
    process.exit(1);
  }

  const data = fs.readFileSync(configPath, 'utf8').toString().split('\n');
  
  const config = data.reduce((acc, line) => {
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return acc;
    }

    const [key, value] = trimmedLine.split('=');
    if (key && value) {
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
  
  // Add SSL workaround for development - disable certificate verification
  config['enable.ssl.certificate.verification'] = 'false';
  
  return config;
}

module.exports = {
  readKafkaConfig
};
