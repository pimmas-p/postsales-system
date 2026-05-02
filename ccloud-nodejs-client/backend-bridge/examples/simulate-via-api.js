/**
 * Simulate External Team Data via REST API
 * 
 * This script creates test data directly via REST API
 * to test Handover Readiness workflow immediately.
 * 
 * Run with: npm run simulate:api
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Create complete handover case with all required data
 */
async function createCompleteHandoverCase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Simulating Complete Handover Case via API               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const timestamp = Date.now();
  const unitId = `UNIT-${timestamp}`;
  const customerId = `CUST-${timestamp}`;

  console.log(`📋 Creating handover case:`);
  console.log(`   Unit ID: ${unitId}`);
  console.log(`   Customer ID: ${customerId}\n`);

  try {
    // Create complete handover case
    const handoverData = {
      unit_id: unitId,
      customer_id: customerId,
      contract_status: 'SIGNED',
      payment_status: 'completed',
      payment_amount: 5000000,
      overall_status: 'ready',
      contract_received_at: new Date().toISOString(),
      payment_received_at: new Date().toISOString()
    };

    console.log('📤 Sending POST request to create handover case...');
    const response = await axios.post(`${BASE_URL}/api/handover/cases`, handoverData);

    if (response.data.success) {
      console.log('✅ Handover case created successfully!');
      console.log('\n📊 Case Details:');
      console.log(`   ID: ${response.data.data.id}`);
      console.log(`   Unit ID: ${response.data.data.unit_id}`);
      console.log(`   Customer ID: ${response.data.data.customer_id}`);
      console.log(`   Contract Status: ${response.data.data.contract_status}`);
      console.log(`   Payment Status: ${response.data.data.payment_status}`);
      console.log(`   Overall Status: ${response.data.data.overall_status}`);
      console.log(`   Payment Amount: ${response.data.data.payment_amount?.toLocaleString()} THB`);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error creating handover case:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create partial handover case (pending)
 */
async function createPartialHandoverCase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Simulating Partial Handover Case (Pending)              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const timestamp = Date.now();
  const unitId = `PARTIAL-${timestamp}`;
  const customerId = `CUST-${timestamp}`;

  try {
    // Create partial case - only Contract completed
    const handoverData = {
      unit_id: unitId,
      customer_id: customerId,
      contract_status: 'SIGNED',
      overall_status: 'pending',
      contract_received_at: new Date().toISOString()
    };

    console.log(`📋 Creating partial case: ${unitId}`);
    console.log('   Status: Only Contract signed (Payment pending)\n');

    const response = await axios.post(`${BASE_URL}/api/handover/cases`, handoverData);

    if (response.data.success) {
      console.log('✅ Partial case created successfully!');
      console.log(`   Overall Status: ${response.data.data.overall_status} ⚠️`);
    }

    return response.data;

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error || error.message);
    throw error;
  }
}

/**
 * Create multiple handover cases for testing
 */
async function createBatchHandoverCases(count = 5) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║   Creating ${count} Test Handover Cases                           ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (let i = 1; i <= count; i++) {
    const timestamp = Date.now() + i;
    const unitId = `BATCH-UNIT-${timestamp}`;
    const customerId = `BATCH-CUST-${timestamp}`;

    // Randomly create complete or partial cases
    const isComplete = Math.random() > 0.3; // 70% complete, 30% partial

    const handoverData = {
      unit_id: unitId,
      customer_id: customerId,
      contract_status: 'SIGNED',
      contract_received_at: new Date().toISOString()
    };

    if (isComplete) {
      handoverData.payment_status = 'completed';
      handoverData.payment_amount = 5000000 + (Math.random() * 10000000);
      handoverData.overall_status = 'ready';
      handoverData.payment_received_at = new Date().toISOString();
    } else {
      handoverData.overall_status = 'pending';
    }

    try {
      console.log(`[${i}/${count}] Creating ${isComplete ? 'complete' : 'partial'} case: ${unitId}`);
      const response = await axios.post(`${BASE_URL}/api/handover/cases`, handoverData);
      results.push(response.data);
      console.log(`   ✅ Status: ${response.data.data.overall_status}`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Created ${results.length}/${count} cases successfully!\n`);
  return results;
}

/**
 * Main function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     External Team Data Simulator (REST API Method)        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🔗 Backend URL: ${BASE_URL}\n`);

  // Check if backend is running
  try {
    console.log('🔄 Checking backend connection...');
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Backend is running!\n');
  } catch (error) {
    console.error('❌ Backend is not running!');
    console.error('   Please start the backend first: npm start\n');
    process.exit(1);
  }

  const scenario = process.argv[2];

  try {
    switch (scenario) {
      case '1':
      case 'complete':
        await createCompleteHandoverCase();
        break;

      case '2':
      case 'partial':
        await createPartialHandoverCase();
        break;

      case '3':
      case 'batch':
        const count = parseInt(process.argv[3]) || 5;
        await createBatchHandoverCases(count);
        break;

      case 'all':
        await createCompleteHandoverCase();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await createPartialHandoverCase();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await createBatchHandoverCases(3);
        break;

      default:
        console.log('Usage: npm run simulate:api [scenario] [options]\n');
        console.log('Scenarios:');
        console.log('  1 or complete  - Create complete handover case (ready)');
        console.log('  2 or partial   - Create partial handover case (pending)');
        console.log('  3 or batch [n] - Create n test cases (default: 5)');
        console.log('  all            - Run all scenarios\n');
        console.log('Examples:');
        console.log('  npm run simulate:api 1');
        console.log('  npm run simulate:api batch 10');
        console.log('  npm run simulate:api all\n');
        process.exit(0);
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
    console.log('✅ Simulation completed!\n');
    console.log('📊 View results:');
    console.log(`   Handover Dashboard: http://localhost:5173/handover`);
    console.log(`   API Endpoint: ${BASE_URL}/api/handover/cases\n`);

  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    process.exit(1);
  }
}

// Run simulation
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
