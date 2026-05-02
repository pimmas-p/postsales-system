/**
 * Check if SUBSCRIBE topics (from other teams) exist in Kafka cluster
 * 
 * This script checks if the 5 topics we need to subscribe to are available.
 * These topics should be created by other teams (Managing, Legal, Payment).
 * 
 * Run with: node scripts/check-subscribe-topics.js
 */

require('dotenv').config();
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('../kafka/config');

// Topics we need to SUBSCRIBE from other teams
const SUBSCRIBE_TOPICS = [
  {
    topic: 'managing.kyc.complete',
    team: 'Managing Team (Team 4)',
    description: 'KYC completion events → Handover Service'
  },
  {
    topic: 'purchase.contract.drafted',
    team: 'Legal Team (Team 5)',
    description: 'Contract drafted events → Handover Service'
  },
  {
    topic: 'payment.secondpayment.completed',
    team: 'Payment Team (Team 6)',
    description: 'Second payment completion → Handover Service'
  },
  {
    topic: 'payment.invoice.commonfees.completed',
    team: 'Payment Team (Team 6)',
    description: 'Common fees payment → Onboarding Service (GATEKEEPER) ⭐'
  },
  {
    topic: 'warranty.coverage.verified-topic',
    team: 'Legal Team (Team 5)',
    description: 'Warranty verification results → Defect Service'
  }
];

async function checkSubscribeTopics() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Subscribe Topics Checker                                ║');
  console.log('║   Checking if external team topics are available          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const config = readKafkaConfig();
  
  if (!config) {
    console.error('❌ Kafka is disabled or not configured');
    process.exit(1);
  }

  const kafka = new Kafka();
  const admin = kafka.admin(config);

  try {
    console.log('🔄 Connecting to Kafka...');
    await admin.connect();
    console.log('✅ Connected\n');

    // List all existing topics
    console.log('📋 Fetching all topics from cluster...');
    const existingTopics = await admin.listTopics();
    console.log(`   Found ${existingTopics.length} total topics in cluster\n`);

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📥 SUBSCRIBE TOPICS CHECK (5 topics)\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    let availableCount = 0;
    let missingTopics = [];

    for (const topicInfo of SUBSCRIBE_TOPICS) {
      const exists = existingTopics.includes(topicInfo.topic);
      
      if (exists) {
        console.log(`✅ ${topicInfo.topic}`);
        console.log(`   Status: AVAILABLE`);
        availableCount++;
      } else {
        console.log(`❌ ${topicInfo.topic}`);
        console.log(`   Status: MISSING`);
        missingTopics.push(topicInfo);
      }
      console.log(`   Team: ${topicInfo.team}`);
      console.log(`   Usage: ${topicInfo.description}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📊 Summary: ${availableCount}/${SUBSCRIBE_TOPICS.length} topics available\n`);

    if (availableCount === SUBSCRIBE_TOPICS.length) {
      console.log('🎉 All required topics are available!');
      console.log('   Your backend consumer can now subscribe to these topics.\n');
      console.log('✅ Ready to receive events from:');
      console.log('   • Managing Team (KYC)');
      console.log('   • Legal Team (Contract, Warranty)');
      console.log('   • Payment Team (Payments)\n');
    } else {
      console.log('⚠️  Some topics are missing. Your services cannot work properly.\n');
      console.log('📋 Missing Topics:\n');
      
      missingTopics.forEach(t => {
        console.log(`   ❌ ${t.topic}`);
        console.log(`      Needed from: ${t.team}`);
        console.log(`      Purpose: ${t.description}\n`);
      });

      console.log('💡 Action Required:\n');
      console.log('   Contact the following teams to create these topics:\n');
      
      const teamsToContact = [...new Set(missingTopics.map(t => t.team))];
      teamsToContact.forEach(team => {
        const teamTopics = missingTopics.filter(t => t.team === team);
        console.log(`   📞 ${team}:`);
        teamTopics.forEach(t => console.log(`      - ${t.topic}`));
        console.log('');
      });

      console.log('   Or ask them to run their equivalent of:');
      console.log('   npm run kafka:create-topics\n');
    }

    await admin.disconnect();
    console.log('🔌 Disconnected\n');

    process.exit(availableCount === SUBSCRIBE_TOPICS.length ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error checking topics:', error.message);
    console.log('\nPossible issues:');
    console.log('  • Kafka cluster not accessible');
    console.log('  • Invalid credentials in client.properties');
    console.log('  • Network connectivity issues\n');
    
    if (admin) await admin.disconnect();
    process.exit(1);
  }
}

// Run the check
checkSubscribeTopics();
