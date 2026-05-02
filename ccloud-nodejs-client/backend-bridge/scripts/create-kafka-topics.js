/**
 * Auto-create Kafka Topics for External Team Integration
 * 
 * This script attempts to create all required topics programmatically.
 * Note: Requires admin access to Kafka cluster.
 * 
 * Run with: npm run kafka:create-topics
 */

require('dotenv').config();
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('../kafka/config');

const REQUIRED_TOPICS = [
  // ═══════════════════════════════════════════════════════════════
  // � OUR PUBLISH TOPICS (6) - Topics we produce for other teams
  // ═══════════════════════════════════════════════════════════════
  {
    topic: 'postsales.handover.completed',
    description: '📤 Post-Sales → Sales/Marketing: Handover completion events',
    numPartitions: 1,
    replicationFactor: 3
  },
  {
    topic: 'postsales.onboarding.started',
    description: '📤 Post-Sales Internal: Onboarding started events',
    numPartitions: 1,
    replicationFactor: 3
  },
  {
    topic: 'postsales.member.registered',
    description: '📤 Post-Sales → Payment Team: Member registration for billing setup 🔥 CRITICAL',
    numPartitions: 1,
    replicationFactor: 3
  },
  {
    topic: 'postsales.profile.activated',
    description: '📤 Post-Sales → CRM/Marketing: Profile activation after payment',
    numPartitions: 1,
    replicationFactor: 3
  },
  {
    topic: 'warranty.defect.reported',
    description: '📤 Post-Sales → Legal Team: Defect warranty verification request',
    numPartitions: 1,
    replicationFactor: 3
  },
  {
    topic: 'postsales.caseclosed.completed',
    description: '📤 Post-Sales → Marketing: Defect case closed events',
    numPartitions: 1,
    replicationFactor: 3
  }
];

async function createTopics() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Kafka Topics Creation Tool                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const config = readKafkaConfig();
  
  if (!config) {
    console.error('❌ Kafka is disabled or not configured');
    process.exit(1);
  }

  const kafka = new Kafka();
  const admin = kafka.admin(config);

  try {
    console.log('🔄 Connecting to Kafka as admin...');
    await admin.connect();
    console.log('✅ Admin connected\n');

    // List existing topics
    console.log('📋 Checking existing topics...');
    const existingTopics = await admin.listTopics();
    console.log(`   Found ${existingTopics.length} existing topics\n`);

    // Create topics
    console.log('🔧 Creating topics...\n');
    
    for (const topicConfig of REQUIRED_TOPICS) {
      const exists = existingTopics.includes(topicConfig.topic);
      
      if (exists) {
        console.log(`⏭️  ${topicConfig.topic}`);
        console.log(`   Already exists - skipping`);
      } else {
        try {
          await admin.createTopics({
            topics: [{
              topic: topicConfig.topic,
              numPartitions: topicConfig.numPartitions,
              replicationFactor: topicConfig.replicationFactor
            }]
          });
          console.log(`✅ ${topicConfig.topic}`);
          console.log(`   Created successfully`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⏭️  ${topicConfig.topic}`);
            console.log(`   Already exists`);
          } else {
            console.log(`❌ ${topicConfig.topic}`);
            console.log(`   Error: ${error.message}`);
          }
        }
      }
      console.log(`   ${topicConfig.description}\n`);
    }

    // Verify all topics
    console.log('\n📊 Verifying topics...');
    const finalTopics = await admin.listTopics();
    const createdCount = REQUIRED_TOPICS.filter(t => finalTopics.includes(t.topic)).length;
    
    console.log(`\n✅ ${createdCount}/${REQUIRED_TOPICS.length} required topics available\n`);

    if (createdCount === REQUIRED_TOPICS.length) {
      console.log('🎉 All topics ready! You can now run:');
      console.log('   npm run simulate:handover');
      console.log('   npm run simulate:onboarding');
      console.log('   npm run simulate:warranty\n');
    } else {
      console.log('⚠️  Some topics could not be created automatically.');
      console.log('   Please create them manually in Confluent Cloud:\n');
      
      REQUIRED_TOPICS.forEach(t => {
        if (!finalTopics.includes(t.topic)) {
          console.log(`   - ${t.topic}`);
        }
      });
      console.log('');
    }

    await admin.disconnect();
    console.log('🔌 Admin disconnected\n');

  } catch (error) {
    console.error('\n❌ Failed to create topics:', error.message);
    console.log('\n💡 Alternative methods:\n');
    console.log('1. Create topics manually in Confluent Cloud Console:');
    console.log('   https://confluent.cloud → Your Cluster → Topics → Add topic\n');
    console.log('2. Use Confluent CLI:');
    console.log('   confluent login');
    console.log('   confluent kafka topic create <topic-name> --partitions 1\n');
    console.log('3. Use the quick test workaround:');
    console.log('   npm run simulate:quick\n');
    
    if (admin) await admin.disconnect();
    process.exit(1);
  }
}

createTopics()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
