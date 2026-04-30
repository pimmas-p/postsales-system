const supabase = require('./supabase');
const externalApi = require('../services/externalApi');
const producer = require('../kafka/producer');

/**
 * Get all onboarding cases with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by overall_status
 * @param {string} filters.unitId - Filter by unit_id
 * @param {string} filters.customerId - Filter by customer_id
 * @returns {Promise<Array>} Array of onboarding cases
 */
async function getAllOnboardingCases(filters = {}) {
  try {
    let query = supabase
      .from('onboarding_cases')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('overall_status', filters.status);
    }
    if (filters.unitId) {
      query = query.ilike('unit_id', `%${filters.unitId}%`);
    }
    if (filters.customerId) {
      query = query.ilike('customer_id', `%${filters.customerId}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching onboarding cases:', error);
    throw error;
  }
}

/**
 * Get single onboarding case by ID with events
 * @param {string} id - Case UUID
 * @returns {Promise<Object>} Onboarding case with events
 */
async function getOnboardingCaseById(id) {
  try {
    // Get case
    const { data: caseData, error: caseError } = await supabase
      .from('onboarding_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (caseError) throw caseError;
    if (!caseData) throw new Error('Onboarding case not found');

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('onboarding_events')
      .select('*')
      .eq('case_id', id)
      .order('received_at', { ascending: false });

    if (eventsError) throw eventsError;

    return {
      ...caseData,
      events: events || []
    };
  } catch (error) {
    console.error('Error fetching onboarding case by ID:', error);
    throw error;
  }
}

/**
 * Get onboarding case by unit ID
 * @param {string} unitId - Unit/Property ID
 * @returns {Promise<Object|null>} Onboarding case or null if not found
 */
async function getOnboardingCaseByUnitId(unitId) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching onboarding case for unit ${unitId}:`, error);
    return null;
  }
}

/**
 * Create new onboarding case (manual start)
 * @param {Object} caseData - Case data
 * @param {string} caseData.handoverCaseId - Reference to handover case
 * @param {string} caseData.unitId - Unit ID
 * @param {string} caseData.customerId - Customer ID
 * @returns {Promise<Object>} Created case
 */
async function createOnboardingCase(caseData) {
  try {
    // Try to fetch contract document from Legal Team API
    let contractDocUrl = null;
    try {
      console.log(`🔍 Fetching contract for unit: ${caseData.unitId}`);
      const contractData = await externalApi.getContractByUnit(caseData.unitId);
      
      if (contractData && contractData.fileUrl) {
        contractDocUrl = contractData.fileUrl;
        console.log(`✅ Contract document URL retrieved: ${contractDocUrl}`);
      } else {
        console.log(`⚠️  No contract document URL available for unit: ${caseData.unitId}`);
      }
    } catch (apiError) {
      console.warn(`⚠️  Failed to fetch contract from Legal API:`, apiError.message);
      // Continue without contract - user can upload manually later
    }

    // Create onboarding case with auto-filled contract (if available)
    const { data, error } = await supabase
      .from('onboarding_cases')
      .insert({
        handover_case_id: caseData.handoverCaseId || null,
        unit_id: caseData.unitId,
        customer_id: caseData.customerId,
        area_size: caseData.areaSize,
        contract_document_url: contractDocUrl, // Auto-filled from Legal API
        document_status: contractDocUrl ? 'uploaded' : 'pending', // Set to 'uploaded' if contract fetched
        overall_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Log success message
    if (contractDocUrl) {
      console.log(`✨ Onboarding case created with auto-filled contract document`);
    } else {
      console.log(`📝 Onboarding case created (contract document pending)`);
    }

    // Insert event
    await insertOnboardingEvent({
      case_id: data.id,
      event_type: 'onboarding.started',
      event_source: 'postsales',
      payload: { unitId: caseData.unitId, customerId: caseData.customerId }
    });

    // Publish Kafka event: postsales.onboarding.started
    await producer.publishOnboardingStarted({
      caseId: data.id,
      unitId: caseData.unitId,
      customerId: caseData.customerId,
      timestamp: data.created_at
    });

    return data;
  } catch (error) {
    console.error('Error creating onboarding case:', error);
    throw error;
  }
}

/**
 * Update member registration information
 * @param {string} id - Case UUID
 * @param {Object} registrationData - Registration data
 * @param {string} registrationData.email - Email address
 * @param {string} registrationData.phone - Phone number
 * @param {string} registrationData.passwordHash - Hashed password
 * @param {number} registrationData.areaSize - Unit area in sqm (optional)
 * @returns {Promise<Object>} Updated case
 */
async function updateMemberRegistration(id, registrationData) {
  try {
    // Build update object dynamically
    const updateData = {
      email: registrationData.email,
      phone: registrationData.phone,
      password_hash: registrationData.passwordHash,
      registration_status: 'completed',
      registered_at: new Date().toISOString(),
      overall_status: 'in_progress',
      updated_at: new Date().toISOString()
    };

    // Add area_size only if provided
    if (registrationData.areaSize !== undefined && registrationData.areaSize !== null) {
      updateData.area_size = registrationData.areaSize;
    }

    const { data, error } = await supabase
      .from('onboarding_cases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Publish Kafka event: postsales.member.registered
    await producer.publishMemberRegistered({
      customerId: data.customer_id,
      unitId: data.unit_id,
      areaSize: data.area_size,
      feeRatePerSqm: 45.0, // Default rate, can be customized
      billingCycle: registrationData.billingCycle || 'MONTHLY',
      effectiveDate: registrationData.effectiveDate || data.registered_at,
      propertyId: data.unit_id,
      registered_at: data.registered_at,
      timestamp: data.updated_at
    });
    console.log('✅ Member registration published to Payment team for billing setup');

    // Insert event
    await insertOnboardingEvent({
      case_id: id,
      event_type: 'onboarding.memberregistered',
      event_source: 'postsales',
      payload: { email: registrationData.email, phone: registrationData.phone }
    });

    return data;
  } catch (error) {
    console.error('Error updating member registration:', error);
    throw error;
  }
}

/**
 * Update document upload information
 * @param {string} id - Case UUID
 * @param {Object} documentData - Document URLs
 * @param {string} documentData.contractDocumentUrl - Contract document URL/base64
 * @returns {Promise<Object>} Updated case
 */
async function updateDocuments(id, documentData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        contract_document_url: documentData.contractDocumentUrl,
        document_status: 'uploaded',
        documents_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertOnboardingEvent({
      case_id: id,
      event_type: 'onboarding.documents_uploaded',
      event_source: 'postsales',
      payload: { documentsCount: 1 }
    });

    return data;
  } catch (error) {
    console.error('Error updating documents:', error);
    throw error;
  }
}

/**
 * Auto-update contract document from warranty registration event
 * Called when Legal team registers warranty coverage
 * @param {string} unitId - Unit/Property ID
 * @param {Object} contractData - Contract/Warranty data
 * @param {string} contractData.contractId - Contract ID
 * @param {string} contractData.contractDocumentUrl - Contract document URL
 * @returns {Promise<Object|null>} Updated case or null
 */
async function updateContractDocumentAuto(unitId, contractData) {
  try {
    // Find onboarding case by unitId
    const onboardingCase = await getOnboardingCaseByUnitId(unitId);
    
    if (!onboardingCase) {
      console.log(`   ℹ️  No onboarding case found for unit: ${unitId}`);
      return null;
    }

    // Skip if contract document already exists
    if (onboardingCase.contract_document_url) {
      console.log(`   ℹ️  Contract document already exists for unit: ${unitId}`);
      return onboardingCase;
    }

    // Update contract document
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        contract_document_url: contractData.contractDocumentUrl,
        document_status: 'uploaded',
        documents_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', onboardingCase.id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertOnboardingEvent({
      case_id: onboardingCase.id,
      event_type: 'onboarding.contract_auto_filled',
      event_source: 'legal-warranty',
      payload: { 
        contractId: contractData.contractId,
        source: 'warranty.coverage.registered'
      }
    });

    console.log(`   ✅ Contract document auto-filled for onboarding case: ${onboardingCase.id}`);
    return data;

  } catch (error) {
    console.error(`Error auto-updating contract document for unit ${unitId}:`, error);
    return null;
  }
}

/**
 * Complete onboarding case
 * @param {string} id - Case UUID
 * @param {Object} completionData - Completion data
 * @param {string} completionData.completedBy - Staff who completed
 * @param {string} completionData.notes - Completion notes
 * @returns {Promise<Object>} Updated case
 */
async function completeOnboarding(id, completionData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        overall_status: 'completed',
        completed_by: completionData.completedBy,
        completed_at: new Date().toISOString(),
        notes: completionData.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertOnboardingEvent({
      case_id: id,
      event_type: 'onboarding.completed',
      event_source: 'postsales',
      payload: { completedBy: completionData.completedBy }
    });

    // Publish Kafka event: postsales.profile.activated
    await producer.publishOnboardingCompleted({
      caseId: id,
      unitId: data.unit_id,
      customerId: data.customer_id,
      completedBy: completionData.completedBy,
      timestamp: data.completed_at
    });
    console.log('✅ Profile activated event published');

    return data;
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Insert onboarding event to audit trail
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Inserted event
 */
async function insertOnboardingEvent(eventData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_events')
      .insert({
        case_id: eventData.case_id,
        event_type: eventData.event_type,
        event_source: eventData.event_source,
        payload: eventData.payload,
        received_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting onboarding event:', error);
    throw error;
  }
}

/**
 * Get onboarding statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getOnboardingStats() {
  try {
    const { data: allCases, error } = await supabase
      .from('onboarding_cases')
      .select('overall_status');

    if (error) throw error;

    const stats = {
      total: allCases.length,
      pending: allCases.filter(c => c.overall_status === 'pending').length,
      in_progress: allCases.filter(c => c.overall_status === 'in_progress').length,
      completed: allCases.filter(c => c.overall_status === 'completed').length
    };

    return stats;
  } catch (error) {
    console.error('Error fetching onboarding stats:', error);
    throw error;
  }
}

/**
 * Manually fetch contract from Legal API
 * @param {string} id - Case UUID
 * @returns {Promise<Object>} Updated case with contract
 */
async function manualFetchContractFromLegal(id) {
  try {
    // Get onboarding case
    const onboardingCase = await getOnboardingCaseById(id);
    
    if (!onboardingCase) {
      throw new Error('Onboarding case not found');
    }

    console.log(`🔍 Manual contract fetch for unit: ${onboardingCase.unit_id}`);

    // Try to fetch contract from Legal API
    const contractData = await externalApi.getContractByUnit(onboardingCase.unit_id);
    
    if (!contractData || !contractData.fileUrl) {
      throw new Error('No contract found from Legal API');
    }

    console.log(`✅ Contract found: ${contractData.fileUrl}`);

    // Update contract document
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        contract_document_url: contractData.fileUrl,
        document_status: 'uploaded',
        documents_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertOnboardingEvent({
      case_id: id,
      event_type: 'onboarding.contract_manual_fetched',
      event_source: 'postsales-manual',
      payload: { 
        contractId: contractData.contractId,
        fileUrl: contractData.fileUrl,
        source: 'manual-fetch'
      }
    });

    console.log(`✨ Contract manually fetched and saved`);
    return data;

  } catch (error) {
    console.error(`Error manually fetching contract:`, error);
    throw error;
  }
}

module.exports = {
  getAllOnboardingCases,
  getOnboardingCaseById,
  getOnboardingCaseByUnitId,
  createOnboardingCase,
  updateMemberRegistration,
  updateDocuments,
  updateContractDocumentAuto,
  manualFetchContractFromLegal,
  completeOnboarding,
  insertOnboardingEvent,
  getOnboardingStats
};
