const {
  getHandoverCaseByUnitId,
  upsertHandoverCase,
  insertHandoverEvent,
  calculateOverallStatus
} = require('../db/queries');

/**
 * Handle KYC completed event
 */
async function handleKycEvent(event) {
  console.log('   📋 Processing KYC event...');
  
  const { unitId, customerId, kycStatus, timestamp } = event;

  // Get existing case or create new one
  let existingCase = await getHandoverCaseByUnitId(unitId);

  const caseData = {
    unit_id: unitId,
    customer_id: customerId,
    kyc_status: kycStatus,
    kyc_received_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Calculate overall status
  if (existingCase) {
    caseData.overall_status = calculateOverallStatus(
      kycStatus,
      existingCase.contract_status,
      existingCase.payment_status
    );
  } else {
    caseData.overall_status = 'pending';
    caseData.created_at = new Date().toISOString();
  }

  // Upsert case
  const updatedCase = await upsertHandoverCase(caseData);

  // Store event for audit trail
  await insertHandoverEvent({
    case_id: updatedCase.id,
    event_type: 'kyc.completed',
    event_source: 'kyc',
    payload: event
  });

  console.log(`   ✅ KYC event processed for unit: ${unitId}`);
  console.log(`   📊 Overall status: ${updatedCase.overall_status}`);
}

/**
 * Handle Contract drafted event
 */
async function handleContractEvent(event) {
  console.log('   📋 Processing Contract event...');
  
  const { unitId, customerId, contractStatus, timestamp } = event;

  let existingCase = await getHandoverCaseByUnitId(unitId);

  const caseData = {
    unit_id: unitId,
    customer_id: customerId,
    contract_status: contractStatus,
    contract_received_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingCase) {
    caseData.overall_status = calculateOverallStatus(
      existingCase.kyc_status,
      contractStatus,
      existingCase.payment_status
    );
  } else {
    caseData.overall_status = 'pending';
    caseData.created_at = new Date().toISOString();
  }

  const updatedCase = await upsertHandoverCase(caseData);

  await insertHandoverEvent({
    case_id: updatedCase.id,
    event_type: 'legal.contract.drafted',
    event_source: 'legal',
    payload: event
  });

  console.log(`   ✅ Contract event processed for unit: ${unitId}`);
  console.log(`   📊 Overall status: ${updatedCase.overall_status}`);
}

/**
 * Handle Payment completed event
 */
async function handlePaymentEvent(event) {
  console.log('   📋 Processing Payment event...');
  
  const { unitId, customerId, paymentAmount, paymentStatus, timestamp } = event;

  let existingCase = await getHandoverCaseByUnitId(unitId);

  const caseData = {
    unit_id: unitId,
    customer_id: customerId,
    payment_status: paymentStatus || 'completed',
    payment_amount: paymentAmount,
    payment_received_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingCase) {
    caseData.overall_status = calculateOverallStatus(
      existingCase.kyc_status,
      existingCase.contract_status,
      paymentStatus || 'completed'
    );
  } else {
    caseData.overall_status = 'pending';
    caseData.created_at = new Date().toISOString();
  }

  const updatedCase = await upsertHandoverCase(caseData);

  await insertHandoverEvent({
    case_id: updatedCase.id,
    event_type: 'payment.secondpayment.completed',
    event_source: 'payment',
    payload: event
  });

  console.log(`   ✅ Payment event processed for unit: ${unitId}`);
  console.log(`   💰 Amount: ${paymentAmount}`);
  console.log(`   📊 Overall status: ${updatedCase.overall_status}`);
}

module.exports = {
  handleKycEvent,
  handleContractEvent,
  handlePaymentEvent
};
