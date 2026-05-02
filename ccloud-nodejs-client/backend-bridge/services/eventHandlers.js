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

const {
  updateContractDocumentAuto,
  updatePaymentStatus
} = require('../db/onboardingQueries');

const externalApi = require('./externalApi');

/**
 * Handle KYC completed event
 * Managing team (Team 4) - No official documentation, using fallback support
 * Topic: managing.kyc.completed
 */
async function handleKycEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing KYC event...');
  }
  
  // ⚠️ No official documentation - Support both camelCase and snake_case as fallback
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
    event_type: 'managing.kyc.completed',
    event_source: 'managing',
    payload: event
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ KYC event processed for unit: ${unitId}`);
    console.log(`   📊 Overall status: ${updatedCase.overall_status}`);
  }
}

/**
 * Handle Purchase Contract drafted event
 * Legal team (Team 5) - Purchase contract drafted (sale completed)
 * Topic: purchase.contract.drafted
 * 
 * Expected Schema (camelCase per Legal CSV documentation):
 * {
 *   contractId: <UUID>,
 *   bookingId: <UUID>,
 *   unitId: <UUID>,
 *   customerId: <UUID>,
 *   status: <enum: DRAFT|PENDING_SIGN|SIGNED|CANCELLED>,
 *   fileUrl: <string>,
 *   templateId: <UUID>,
 *   createdAt: <ISO8601>,
 *   draftedAt: <ISO8601>
 * }
 */
async function handleContractEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Contract event...');
  }
  
  // ✅ Team 5 format - camelCase ONLY
  const contractId = event.contractId;
  const bookingId = event.bookingId;
  const unitId = event.unitId;
  const customerId = event.customerId;
  const contractStatus = event.status;
  const fileUrl = event.fileUrl;
  const templateId = event.templateId;
  const timestamp = event.draftedAt;

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
    event_type: 'purchase.contract.drafted',
    event_source: 'legal',
    payload: event
  });

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Contract event processed for unit: ${unitId}`);
  }
}

/**
 * Handle Payment event
 * Payment team sends wrapped format: {success: true, data: {...}, timestamp: "..."}
 * Team 6 CSV format - camelCase ONLY
 */
async function handlePaymentEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Payment event...');
  }
  
  // ✅ Unwrap Payment team's wrapper format
  const eventData = event.success ? event.data : event;
  
  // ✅ Team 6 format - camelCase ONLY (as per Team 6 CSV documentation)
  // Note: Payment team uses "propertyId" which maps to our internal "unitId"
  const unitId = eventData.propertyId;  // Payment team calls it propertyId
  const customerId = eventData.customerId;
  const paymentAmount = eventData.amount;
  const paymentStatus = eventData.status;
  const timestamp = event.timestamp || eventData.updatedAt;

  // Map Payment Team status to internal status
  // Payment sends "CONFIRMED", we use "completed" internally
  const internalPaymentStatus = paymentStatus === 'CONFIRMED' ? 'completed' : paymentStatus;

  let existingCase = await getHandoverCaseByUnitId(unitId);

  const caseData = {
    unit_id: unitId,
    customer_id: customerId,
    payment_status: internalPaymentStatus,
    payment_amount: paymentAmount,
    payment_received_at: timestamp || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (existingCase) {
    caseData.overall_status = calculateOverallStatus(
      existingCase.kyc_status,
      existingCase.contract_status,
      internalPaymentStatus
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

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Payment event processed for unit: ${unitId}`);
    console.log(`   💰 Amount: ${paymentAmount}`);
    console.log(`   � Payment status: ${paymentStatus} → ${internalPaymentStatus}`);
    console.log(`   �📊 Overall status: ${updatedCase.overall_status}`);
  }
}

/**
 * Handle Common Fees payment completed event
 * CRITICAL for Onboarding Service: Step 4 Gatekeeper
 * Updates payment_status for onboarding cases to enable profile activation
 * Topic: payment.invoice.commonfees.completed
 * From: Payment Team (Team 6)
 */
async function handleCommonFeesEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Common Fees Payment event...');
  }
  
  // Parse Payment team's wrapper format if present
  const eventData = event.success ? event.data : event;
  
  // ✅ Team 6 format - camelCase ONLY (as per Team 6 CSV documentation)
  const invoiceId = eventData.invoiceId;
  const refId = eventData.refId;
  const customerId = eventData.customerId;
  const unitId = eventData.unitId || eventData.propertyId; // propertyId maps to unitId
  const amount = eventData.amount;
  const type = eventData.type;
  const status = eventData.status;
  const issuedAt = eventData.issuedAt;
  const paidAt = eventData.paidAt;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`   💰 Common fees payment for unit: ${unitId}`);
    console.log(`   💵 Amount: ${amount} THB, Status: ${status}`);
    console.log(`   📄 Invoice ID: ${invoiceId}, Ref ID: ${refId}`);
  }

  // ⭐ CRITICAL: Update Onboarding payment status (Step 4 Gatekeeper)
  // This enables profile activation in Onboarding flow
  if (unitId && status === 'PAID') {
    try {
      await updatePaymentStatus(unitId, {
        paymentId: invoiceId || refId,
        invoiceId: invoiceId,
        amount: amount,
        status: status,
        paidAt: paidAt,
        currency: eventData.currency || 'THB'
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ✅ Onboarding payment status updated for unit ${unitId}`);
        console.log(`   🚪 Gatekeeper passed: Profile activation now enabled`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to update onboarding payment status:`, error.message);
      // Don't throw - payment is processed, just logging failed
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ℹ️  Payment status is ${status} (not PAID) - no onboarding update`);
    }
  }
}

/**
 * Handle Warranty Coverage Verified event from Legal team
 * Update defect case with warranty verification result
 * Topic: warranty.coverage.verified-topic (Legal team)
 */
async function handleWarrantyVerifiedEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Warranty Verification event...');
  }
  
  // ✅ Team 5 format - camelCase ONLY
  const claimId = event.claimId;
  const warrantyId = event.warrantyId;
  const defectId = event.defectId;
  const contractId = event.contractId;
  const unitId = event.unitId;
  const customerId = event.customerId;
  const coverageStatus = event.coverageStatus;
  const coverageReason = event.coverageReason;
  const verifiedAt = event.verifiedAt;
  const expiresAt = event.expiresAt;
  
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✅ Warranty verified for defect: ${defectId}`);
      console.log(`   📊 Coverage: ${coverageStatus}`);
      console.log(`   💬 Reason: ${coverageReason || 'No reason provided'}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to update defect warranty status:`, error.message);
  }
}

module.exports = {
  handleKycEvent,
  handleContractEvent,
  handlePaymentEvent,
  handleCommonFeesEvent,
  handleWarrantyVerifiedEvent
};
