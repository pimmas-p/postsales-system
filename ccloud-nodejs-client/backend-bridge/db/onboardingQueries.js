const supabase = require('./supabase');

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
 * Create new onboarding case (manual start)
 * @param {Object} caseData - Case data
 * @param {string} caseData.handoverCaseId - Reference to handover case
 * @param {string} caseData.unitId - Unit ID
 * @param {string} caseData.customerId - Customer ID
 * @returns {Promise<Object>} Created case
 */
async function createOnboardingCase(caseData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .insert({
        handover_case_id: caseData.handoverCaseId || null,
        unit_id: caseData.unitId,
        customer_id: caseData.customerId,
        overall_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertOnboardingEvent({
      case_id: data.id,
      event_type: 'onboarding.started',
      event_source: 'postsales',
      payload: { unitId: caseData.unitId, customerId: caseData.customerId }
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
 * @returns {Promise<Object>} Updated case
 */
async function updateMemberRegistration(id, registrationData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        email: registrationData.email,
        phone: registrationData.phone,
        password_hash: registrationData.passwordHash,
        registration_status: 'completed',
        registered_at: new Date().toISOString(),
        overall_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

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
 * @param {string} documentData.idDocumentUrl - ID document URL/base64
 * @param {string} documentData.contractDocumentUrl - Contract document URL/base64
 * @returns {Promise<Object>} Updated case
 */
async function updateDocuments(id, documentData) {
  try {
    const { data, error } = await supabase
      .from('onboarding_cases')
      .update({
        id_document_url: documentData.idDocumentUrl,
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
      payload: { documentsCount: 2 }
    });

    return data;
  } catch (error) {
    console.error('Error updating documents:', error);
    throw error;
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

module.exports = {
  getAllOnboardingCases,
  getOnboardingCaseById,
  createOnboardingCase,
  updateMemberRegistration,
  updateDocuments,
  completeOnboarding,
  insertOnboardingEvent,
  getOnboardingStats
};
