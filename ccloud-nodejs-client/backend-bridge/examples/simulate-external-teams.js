/**
 * Simulate External Team Events for Handover Readiness Testing
 * 
 * This script simulates events from other teams (Managing, Legal, Payment, Warranty)
 * sending data to Service 1 (Post-Sales) via Kafka to test the Handover Readiness workflow.
 * 
 * Run with: npm run simulate:external
 * Or: node examples/simulate-external-teams.js
 */

require('dotenv').config();
const { Kafka } = require('@confluentinc/kafka-javascript').KafkaJS;
const { readKafkaConfig } = require('../kafka/config');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize Kafka Producer
 */
async function createProducer() {
  const config = readKafkaConfig();
  
  if (!config) {
    throw new Error('Kafka is disabled or not configured properly');
  }

  const kafka = new Kafka();
  const producer = kafka.producer(config);
  
  await producer.connect();
  console.log('✅ Kafka producer connected');
  
  return producer;
}

/**
 * Send event to Kafka topic
 */
async function sendEvent(producer, topic, key, event) {
  const message = {
    topic,
    messages: [{
      key: key,
      value: JSON.stringify(event),
      headers: {
        'content-type': 'application/json',
        'event-type': event.eventType || topic
      }
    }]
  };

  const result = await producer.send(message);
  return result;
}

// ============================================================================
// SCENARIO 1: Complete Handover Readiness Flow for Single Unit
// ============================================================================

async function simulateCompleteHandoverFlow(producer, unitId, customerId) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Scenario 1: Complete Handover Readiness Flow            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Testing unit: ${unitId}`);
  console.log(`👤 Customer: ${customerId}\n`);

  // Step 1: Legal Team sends Contract Drafted
  console.log('1️⃣  Legal Team → Contract Drafted');
  const contractEvent = {
    eventType: 'contract.drafted',
    contractId: uuidv4(),
    bookingId: uuidv4(),
    unitId: unitId,
    customerId: customerId,
    status: 'SIGNED',
    fileUrl: `https://storage.example.com/contracts/${unitId}.pdf`,
    templateId: uuidv4(),
    createdAt: new Date().toISOString(),
    draftedAt: new Date().toISOString()
  };
  
  await sendEvent(producer, 'contract.drafted', unitId, contractEvent);
  console.log('   ✅ Contract event sent');
  await sleep(2000);

  // Step 2: Payment Team sends Second Payment
  
  await sendEvent(producer, 'contract.drafted', unitId, contractEvent);
  console.log('   ✅ Contract event sent');
  await sleep(2000);

  // Step 2: Payment Team sends Second Payment
  console.log('\n2️⃣  Payment Team → Second Payment Completed');
  const paymentEvent = {
    success: true,
    data: {
      propertyId: unitId,  // Payment team uses propertyId
      customerId: customerId,
      amount: 5000000,
      currency: 'THB',
      status: 'CONFIRMED',
      paymentMethod: 'bank_transfer',
      transactionId: `TXN-${Date.now()}`,
      updatedAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  await sendEvent(producer, 'payment.secondpayment.completed', unitId, paymentEvent);
  console.log('   ✅ Payment event sent');
  await sleep(2000);

  console.log('\n🎉 Complete handover flow simulated!');
  console.log('📊 Check Handover Dashboard for status updates\n');
}

// ============================================================================
// SCENARIO 2: Onboarding Flow - Common Fees Payment
// ============================================================================

async function simulateOnboardingCommonFees(producer, unitId, customerId) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Scenario 2: Onboarding - Common Fees Payment            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Testing unit: ${unitId}`);
  console.log(`👤 Customer: ${customerId}\n`);

  console.log('💰 Payment Team → Common Fees Paid (Onboarding Gatekeeper)');
  const commonFeesEvent = {
    success: true,
    data: {
      invoiceId: `INV-${Date.now()}`,
      refId: `REF-${Date.now()}`,
      customerId: customerId,
      unitId: unitId,
      propertyId: unitId,
      amount: 15000,
      currency: 'THB',
      type: 'COMMON_FEES',
      status: 'PAID',
      issuedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      paidAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  await sendEvent(producer, 'payment.invoice.commonfees.completed', unitId, commonFeesEvent);
  console.log('   ✅ Common fees payment event sent');
  console.log('   🚪 Onboarding Step 4 gatekeeper should now pass\n');
}

// ============================================================================
// SCENARIO 3: Defect Management - Warranty Verification
// ============================================================================

async function simulateWarrantyVerification(producer, unitId, defectId) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Scenario 3: Defect - Warranty Verification              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Defect ID: ${defectId}`);
  console.log(`🏠 Unit ID: ${unitId}\n`);

  console.log('🛡️  Legal Team → Warranty Coverage Verified');
  const warrantyEvent = {
    eventType: 'warranty.coverage.verified',
    claimId: uuidv4(),
    warrantyId: uuidv4(),
    defectId: defectId,
    contractId: uuidv4(),
    unitId: unitId,
    customerId: uuidv4(),
    coverageStatus: 'COVERED',
    coverageReason: 'Defect covered under 2-year structural warranty',
    verifiedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    coverageDetails: {
      warrantyType: 'structural',
      coveragePercentage: 100,
      maxClaimAmount: 500000
    }
  };
  
  await sendEvent(producer, 'warranty.coverage.verified', defectId, warrantyEvent);
  console.log('   ✅ Warranty verification event sent');
  console.log('   🔧 Defect warranty status should be updated\n');
}

// ============================================================================
// SCENARIO 4: Batch Test - Multiple Units
// ============================================================================

async function simulateBatchHandovers(producer, count = 3) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Scenario 4: Batch Handover Test (Multiple Units)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📦 Simulating ${count} complete handover flows...\n`);

  for (let i = 1; i <= count; i++) {
    const unitId = `BATCH-UNIT-${Date.now()}-${i}`;
    const customerId = `BATCH-CUST-${Date.now()}-${i}`;
    
    console.log(`\n[${i}/${count}] Processing unit: ${unitId}`);
    
    // Send all 3 events for each unit
    const events = [
      {
        topic: 'managing.kyc.complete',
        key: unitId,
        data: {
          unitId,
          customerId,
          kycStatus: 'approved',
          timestamp: new Date().toISOString()
        }
      },
      {
        topic: 'purchase.contract.drafted',
        key: unitId,
        data: {
          contractId: uuidv4(),
          unitId,
          customerId,
          status: 'SIGNED',
          draftedAt: new Date().toISOString()
        }
      },
      {
        topic: 'payment.secondpayment.completed',
        key: unitId,
        data: {
          success: true,
          data: {
            propertyId: unitId,
            customerId,
            amount: 5000000,
            status: 'CONFIRMED',
            updatedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }
      }
    ];

    for (const event of events) {
      await sendEvent(producer, event.topic, event.key, event.data);
      console.log(`   ✅ ${event.topic.split('.')[0]} event sent`);
      await sleep(500);
    }
  }

  console.log(`\n🎉 Batch simulation complete! ${count} units processed\n`);
}

// ============================================================================
// SCENARIO 5: Partial Flow (Testing Incomplete States)
// ============================================================================

async function simulatePartialHandover(producer, scenario) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Scenario 5: Partial Handover (Testing Incomplete)       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const unitId = `PARTIAL-UNIT-${Date.now()}`;
  const customerId = `PARTIAL-CUST-${Date.now()}`;
  
  console.log(`📋 Testing scenario: ${scenario}`);
  console.log(`🏠 Unit: ${unitId}\n`);

  switch (scenario) {
    case 'kyc-only':
      console.log('Sending: KYC only (no contract, no payment)');
      await sendEvent(producer, 'managing.kyc.complete', unitId, {
        unitId,
        customerId,
        kycStatus: 'approved',
        timestamp: new Date().toISOString()
      });
      break;

    case 'kyc-contract':
      console.log('Sending: KYC + Contract (no payment)');
      await sendEvent(producer, 'managing.kyc.complete', unitId, {
        unitId,
        customerId,
        kycStatus: 'approved',
        timestamp: new Date().toISOString()
      });
      await sleep(1000);
      await sendEvent(producer, 'purchase.contract.drafted', unitId, {
        contractId: uuidv4(),
        unitId,
        customerId,
        status: 'SIGNED',
        draftedAt: new Date().toISOString()
      });
      break;

    case 'contract-payment':
      console.log('Sending: Contract + Payment (no KYC)');
      await sendEvent(producer, 'purchase.contract.drafted', unitId, {
        contractId: uuidv4(),
        unitId,
        customerId,
        status: 'SIGNED',
        draftedAt: new Date().toISOString()
      });
      await sleep(1000);
      await sendEvent(producer, 'payment.secondpayment.completed', unitId, {
        success: true,
        data: {
          propertyId: unitId,
          customerId,
          amount: 5000000,
          status: 'CONFIRMED'
        },
        timestamp: new Date().toISOString()
      });
      break;
  }

  console.log('   ✅ Events sent');
  console.log('   ⚠️  Status should show as "pending" (incomplete)\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTestData() {
  const timestamp = Date.now();
  return {
    unitId: `TEST-UNIT-${timestamp}`,
    customerId: `TEST-CUST-${timestamp}`,
    defectId: `TEST-DEFECT-${timestamp}`
  };
}

// ============================================================================
// Main Menu
// ============================================================================

async function runSimulation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     External Team Events Simulator - Service 1            ║');
  console.log('║     Simulate data from other teams for testing            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const scenario = process.argv[2];
  const testData = generateTestData();

  let producer;

  try {
    producer = await createProducer();

    switch (scenario) {
      case '1':
      case 'handover':
        await simulateCompleteHandoverFlow(producer, testData.unitId, testData.customerId);
        break;

      case '2':
      case 'onboarding':
        await simulateOnboardingCommonFees(producer, testData.unitId, testData.customerId);
        break;

      case '3':
      case 'warranty':
        await simulateWarrantyVerification(producer, testData.unitId, testData.defectId);
        break;

      case '4':
      case 'batch':
        const count = parseInt(process.argv[3]) || 3;
        await simulateBatchHandovers(producer, count);
        break;

      case '5':
      case 'partial':
        const partialType = process.argv[3] || 'kyc-only';
        await simulatePartialHandover(producer, partialType);
        break;

      case 'all':
        await simulateCompleteHandoverFlow(producer, testData.unitId, testData.customerId);
        await sleep(3000);
        await simulateOnboardingCommonFees(producer, `${testData.unitId}-2`, testData.customerId);
        await sleep(3000);
        await simulateWarrantyVerification(producer, `${testData.unitId}-3`, testData.defectId);
        break;

      default:
        console.log('Usage: node simulate-external-teams.js [scenario] [options]\n');
        console.log('Scenarios:');
        console.log('  1 or handover    - Complete Handover Readiness flow (KYC + Contract + Payment)');
        console.log('  2 or onboarding  - Onboarding Common Fees payment');
        console.log('  3 or warranty    - Warranty verification for defect');
        console.log('  4 or batch [n]   - Batch test with n units (default: 3)');
        console.log('  5 or partial [type] - Partial flow (kyc-only, kyc-contract, contract-payment)');
        console.log('  all              - Run all scenarios\n');
        console.log('Examples:');
        console.log('  npm run simulate:external 1');
        console.log('  npm run simulate:external batch 5');
        console.log('  npm run simulate:external partial kyc-contract\n');
        process.exit(0);
    }

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ Simulation completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Check Handover Dashboard: http://localhost:5173/handover');
    console.log('   2. Check Onboarding Dashboard: http://localhost:5173/onboarding');
    console.log('   3. Check Defect Dashboard: http://localhost:5173/defects');
    console.log('   4. Check Kafka status: curl http://localhost:3001/api/kafka/status\n');

  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    process.exit(1);
  } finally {
    if (producer) {
      await producer.disconnect();
      console.log('🔌 Producer disconnected\n');
    }
  }
}

// Run simulation
runSimulation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

module.exports = {
  simulateCompleteHandoverFlow,
  simulateOnboardingCommonFees,
  simulateWarrantyVerification,
  simulateBatchHandovers,
  simulatePartialHandover
};
