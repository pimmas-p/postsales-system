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
  updateContractDocumentAuto
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

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Payment event processed for unit: ${unitId}`);
    console.log(`   💰 Amount: ${paymentAmount}`);
    console.log(`   📊 Overall status: ${updatedCase.overall_status}`);
  }
}

/**
 * Handle Common Fees payment completed event
 * Optional: Track common area fees payment for units
 * Supports both camelCase and snake_case field names from different teams
 */
async function handleCommonFeesEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Common Fees event...');
  }
  
  // Parse Payment team's wrapper format if present
  const eventData = event.success ? event.data : event;
  
  // ✅ Team 6 format - camelCase ONLY (as per Team 6 CSV documentation)
  const invoiceId = eventData.invoiceId;
  const refId = eventData.refId;
  const customerId = eventData.customerId;
  const unitId = eventData.unitId;
  const propertyId = eventData.propertyId;
  const amount = eventData.amount;
  const type = eventData.type;
  const status = eventData.status;
  const issuedAt = eventData.issuedAt;
  const paidAt = eventData.paidAt;
  
  // For now, just log the event (no UI implementation yet)
  // In future: Store in separate common_fees_payments table
  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Common fees tracked for unit: ${unitId}`);
    console.log(`   💰 Amount: ${amount} THB, Type: ${type}`);
    console.log(`   📄 Invoice ID: ${invoiceId}, Ref ID: ${refId}`);
    console.log(`   📅 Issued: ${issuedAt}, Paid: ${paidAt}`);
    console.log(`   🏢 Property ID: ${propertyId}`);
    console.log(`   ℹ️  Note: Common fees tracking logged but not stored in database yet`);
  }
}

/**
 * Handle Warranty Coverage Registered event from Legal team
 * Store warranty coverage info for defect management
 * Auto-fill contract document for onboarding cases
 * Topic: warranty.coverage.registered (Legal team - Team 5)
 * Team 5 (Legal) format - camelCase as per Team 5 CSV documentation
 */
async function handleWarrantyRegisteredEvent(event) {
  if (process.env.NODE_ENV === 'development') {
    console.log('   📋 Processing Warranty Registration event...');
  }
  
  // ✅ Team 5 format - camelCase ONLY
  const warrantyId = event.warrantyId;
  const contractId = event.contractId;
  const unitId = event.unitId;
  const customerId = event.customerId;
  const startsAt = event.startsAt;
  const endsAt = event.endsAt;
  const coveredCategories = event.coveredCategories;
  
  // Store warranty coverage information for defect management
  try {
    await storeWarrantyCoverage({
      contractId,
      unitId,
      customerId,
      startsAt,
      endsAt,
      coveredCategories
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`   ✅ Warranty registered for unit: ${unitId}`);
      console.log(`   📅 Coverage: ${startsAt} to ${endsAt}`);
      console.log(`   📋 Categories: ${coveredCategories?.join(', ') || 'All'}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to store warranty coverage:`, error.message);
  }

  // Auto-fill contract document for onboarding case
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`   🔍 Checking for onboarding case to auto-fill contract...`);
    }
    
    // Fetch contract document from Legal API
    let contractDocumentUrl = null;
    
    // Try getting contract by unit ID first
    const contractData = await externalApi.getContractByUnit(unitId);
    if (contractData && contractData.fileUrl) {
      contractDocumentUrl = contractData.fileUrl;
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ✅ Contract document URL retrieved from Legal API`);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`   ⚠️  No contract document URL available from Legal API`);
    }

    // Update onboarding case if contract document available
    if (contractDocumentUrl) {
      const updatedCase = await updateContractDocumentAuto(unitId, {
        contractId,
        contractDocumentUrl
      });

      if (updatedCase && process.env.NODE_ENV === 'development') {
        console.log(`   ✨ Contract document auto-filled for onboarding case`);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`   ℹ️  Skipping contract auto-fill (no document URL)`);
    }

  } catch (error) {
    console.error(`   ❌ Failed to auto-fill contract document:`, error.message);
    // Continue even if auto-fill fails
  }
}

/**
 * Handle Warranty Coverage Verified event from Legal team
 * Update defect case with warranty verification result
 * Topic: warranty.coverage.verified (Legal team - Team 5)
 * Team 5 (Legal) format - camelCase as per Team 5 CSV documentation
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
  handleWarrantyRegisteredEvent,
  handleWarrantyVerifiedEvent
};
