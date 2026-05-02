/**
 * Quick Test: Simulate External Events (Single Topic Workaround)
 * 
 * This is a workaround version that uses ONLY existing topics
 * for immediate testing without creating new topics.
 * 
 * Run with: npm run simulate:quick
 */

require('dotenv').config();
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('../kafka/config');
const { v4: uuidv4 } = require('uuid');

async function quickTest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Quick Test - External Team Simulation                   ║');
  console.log('║   Using existing topic: postsales.handover.completed      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const config = readKafkaConfig();
  
  if (!config) {
    console.error('❌ Kafka is disabled or not configured');
    process.exit(1);
  }

  const kafka = new Kafka();
  const producer = kafka.producer(config);
  
  try {
    await producer.connect();
    console.log('✅ Producer connected\n');

    const unitId = `TEST-UNIT-${Date.now()}`;
    const customerId = `TEST-CUST-${Date.now()}`;

    // Test 1: Simulate KYC Event (but send to existing topic)
    console.log('1️⃣  Simulating: Managing Team → KYC Completed');
    const kycEvent = {
      eventType: 'managing.kyc.complete',
      eventSource: 'managing-team-simulation',
      unitId: unitId,
      customerId: customerId,
      kycStatus: 'approved',
      timestamp: new Date().toISOString(),
      simulationNote: 'This event simulates Managing team sending KYC completion'
    };

    await producer.send({
      topic: 'postsales.handover.completed',
      messages: [{
        key: `kyc-${unitId}`,
        value: JSON.stringify(kycEvent),
        headers: {
          'event-type': 'managing.kyc.complete',
          'source': 'simulation'
        }
      }]
    });
    console.log('   ✅ KYC simulation event sent');
    await sleep(1000);

    // Test 2: Simulate Contract Event
    console.log('\n2️⃣  Simulating: Legal Team → Contract Drafted');
    const contractEvent = {
      eventType: 'purchase.contract.drafted',
      eventSource: 'legal-team-simulation',
      contractId: uuidv4(),
      unitId: unitId,
      customerId: customerId,
      status: 'SIGNED',
      draftedAt: new Date().toISOString(),
      simulationNote: 'This event simulates Legal team sending contract'
    };

    await producer.send({
      topic: 'postsales.handover.completed',
      messages: [{
        key: `contract-${unitId}`,
        value: JSON.stringify(contractEvent),
        headers: {
          'event-type': 'purchase.contract.drafted',
          'source': 'simulation'
        }
      }]
    });
    console.log('   ✅ Contract simulation event sent');
    await sleep(1000);

    // Test 3: Simulate Payment Event
    console.log('\n3️⃣  Simulating: Payment Team → Payment Completed');
    const paymentEvent = {
      eventType: 'payment.secondpayment.completed',
      eventSource: 'payment-team-simulation',
      propertyId: unitId,
      customerId: customerId,
      amount: 5000000,
      status: 'CONFIRMED',
      timestamp: new Date().toISOString(),
      simulationNote: 'This event simulates Payment team sending payment'
    };

    await producer.send({
      topic: 'postsales.handover.completed',
      messages: [{
        key: `payment-${unitId}`,
        value: JSON.stringify(paymentEvent),
        headers: {
          'event-type': 'payment.secondpayment.completed',
          'source': 'simulation'
        }
      }]
    });
    console.log('   ✅ Payment simulation event sent');

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('✅ All simulation events sent successfully!');
    console.log('\n📋 Test Data:');
    console.log(`   Unit ID: ${unitId}`);
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Topic: postsales.handover.completed`);
    console.log('\n💡 Note: Events are sent to existing topic for testing.');
    console.log('   For production, create proper topics for each team.\n');

    await producer.disconnect();
    console.log('🔌 Producer disconnected\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (producer) await producer.disconnect();
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

quickTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
