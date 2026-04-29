const {
  getHandoverCaseByUnitId,
  upsertHandoverCase,
  insertHandoverEvent,
  calculateOverallStatus
} = require('../db/queries');

const {
  updateDefectWarrantyStatus,
  storeWarrantyCoverage
} = require('../db/defectQueries');

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

/**
 * Handle Common Fees payment completed event
 * Optional: Track common area fees payment for units
 */
async function handleCommonFeesEvent(event) {
  console.log('   📋 Processing Common Fees event...');
  
  // Parse Payment team's wrapper format if present
  const eventData = event.success ? event.data : event;
  
  const { invoiceId, customerId, unitId, amount, type, status, paidAt } = eventData;
  
  // For now, just log the event (no UI implementation yet)
  // In future: Store in separate common_fees_payments table
  console.log(`   ✅ Common fees tracked for unit: ${unitId}`);
  console.log(`   💰 Amount: ${amount}`);
  console.log(`   📄 Invoice ID: ${invoiceId}`);
  console.log(`   ℹ️  Note: Common fees tracking logged but not stored in database yet`);
}

/**
 * Handle Warranty Coverage Registered event from Legal team
 * Store warranty coverage info for defect management
 */
async function handleWarrantyRegisteredEvent(event) {
  console.log('   📋 Processing Warranty Registration event...');
  
  const { contractId, unitId, customerId, startsAt, endsAt, coveredCategories } = event;
  
  // Store warranty coverage information
  try {
    await storeWarrantyCoverage({
      contractId,
      unitId,
      customerId,
      startsAt,
      endsAt,
      coveredCategories
    });
    
    console.log(`   ✅ Warranty registered for unit: ${unitId}`);
    console.log(`   📅 Coverage: ${startsAt} to ${endsAt}`);
    console.log(`   📋 Categories: ${coveredCategories?.join(', ') || 'All'}`);
  } catch (error) {
    console.error(`   ❌ Failed to store warranty coverage:`, error.message);
  }
}

/**
 * Handle Warranty Coverage Verified event from Legal team
 * Update defect case with warranty verification result
 */
async function handleWarrantyVerifiedEvent(event) {
  console.log('   📋 Processing Warranty Verification event...');
  
  const { claimId, warrantyId, defectId, coverageStatus, coverageReason, verifiedAt } = event;
  
  if (!defectId) {
    console.warn('   ⚠️  No defectId in warranty verification event, skipping');
    return;
  }
  
  try {
    await updateDefectWarrantyStatus(defectId, {
      warrantyId,
      coverageStatus,
      coverageReason,
      verifiedAt
    });
    
    console.log(`   ✅ Warranty verified for defect: ${defectId}`);
    console.log(`   📊 Coverage: ${coverageStatus}`);
    console.log(`   💬 Reason: ${coverageReason || 'No reason provided'}`);
  } catch (error) {
    console.error(`   ❌ Failed to update defect warranty status:`, error.message);
  }
}

module.exports = {
  handleKycEvent,
  handleContractEvent,
  handlePaymentEvent,
  handleCommonFeesEvent,
  handleWarrantyRegisteredEvent,
  handleWarrantyVerifiedEvent
};
