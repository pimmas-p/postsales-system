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
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleKycEvent(event) {
  console.log('   📋 Processing KYC event...');
  
  // ✅ FIXED: Support both camelCase and snake_case
  const unitId = event.unitId || event.unit_id;
  const customerId = event.customerId || event.customer_id;
  const kycStatus = event.kycStatus || event.kyc_status || event.status;
  const timestamp = event.timestamp || event.received_at;

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
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleContractEvent(event) {
  console.log('   📋 Processing Contract event...');
  
  // ✅ FIXED: Support both camelCase and snake_case
  const unitId = event.unitId || event.unit_id;
  const customerId = event.customerId || event.customer_id;
  const contractStatus = event.contractStatus || event.contract_status || event.status;
  const timestamp = event.timestamp || event.drafted_at;

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
}

/**
 * Handle Payment event
 * Supports both camelCase and snake_case field names from different teams
 */
async function handlePaymentEvent(event) {
  console.log('   📋 Processing Payment event...');
  
  // ✅ FIXED: Support both camelCase and snake_case
  const unitId = event.unitId || event.unit_id;
  const customerId = event.customerId || event.customer_id;
  const paymentAmount = event.paymentAmount || event.payment_amount || event.amount;
  const paymentStatus = event.paymentStatus || event.payment_status || event.status;
  const timestamp = event.timestamp || event.paid_at || event.completed_at;

  let existingCase = await getHandoverCaseByUnitId(unitId);

  const caseData = {
    unit_id: unitId,
    customer_id: customerId,
    payment_status: paymentStatus,
    payment_amount: paymentAmount,
    payment_received_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingCase) {
    caseData.overall_status = calculateOverallStatus(
      existingCase.kyc_status,
      existingCase.contract_status,
      paymentStatus
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
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleCommonFeesEvent(event) {
  console.log('   📋 Processing Common Fees event...');
  
  // Parse Payment team's wrapper format if present
  const eventData = event.success ? event.data : event;
  
  // ✅ FIXED: Support both camelCase and snake_case
  const invoiceId = eventData.invoiceId || eventData.invoice_id;
  const customerId = eventData.customerId || eventData.customer_id;
  const unitId = eventData.unitId || eventData.unit_id;
  const amount = eventData.amount;
  const type = eventData.type;
  const status = eventData.status;
  const paidAt = eventData.paidAt || eventData.paid_at;
  
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
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleWarrantyRegisteredEvent(event) {
  console.log('   📋 Processing Warranty Registration event...');
  
  // ✅ FIXED: Support both camelCase and snake_case
  const contractId = event.contractId || event.contract_id;
  const unitId = event.unitId || event.unit_id;
  const customerId = event.customerId || event.customer_id;
  const startsAt = event.startsAt || event.starts_at || event.start_date;
  const endsAt = event.endsAt || event.ends_at || event.end_date;
  const coveredCategories = event.coveredCategories || event.covered_categories;
  
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
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleWarrantyVerifiedEvent(event) {
  console.log('   📋 Processing Warranty Verification event...');
  
  // ✅ FIXED: Support both camelCase and snake_case
  const claimId = event.claimId || event.claim_id;
  const warrantyId = event.warrantyId || event.warranty_id;
  const defectId = event.defectId || event.defect_id;
  const coverageStatus = event.coverageStatus || event.coverage_status || event.status;
  const coverageReason = event.coverageReason || event.coverage_reason || event.reason;
  const verifiedAt = event.verifiedAt || event.verified_at;
  
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
