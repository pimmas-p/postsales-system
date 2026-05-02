const supabase = require('./supabase');

/**
 * Handover Cases Queries
 */

// Get all handover cases with optional filters
async function getAllHandoverCases(filters = {}) {
  let query = supabase
    .from('handover_cases')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('overall_status', filters.status);
  }
  if (filters.unitId) {
    query = query.ilike('unit_id', `%${filters.unitId}%`);
  }
  if (filters.customerId) {
    query = query.ilike('customer_id', `%${filters.customerId}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Database Error in getAllHandoverCases:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      filters
    });
    throw error;
  }
  return data;
}

// Get single handover case by ID
async function getHandoverCaseById(id) {
  const { data, error } = await supabase
    .from('handover_cases')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Database Error in getHandoverCaseById:', {
      code: error.code,
      message: error.message,
      caseId: id
    });
    throw error;
  }
  return data;
}

// Get handover case by unit_id
async function getHandoverCaseByUnitId(unitId) {
  const { data, error } = await supabase
    .from('handover_cases')
    .select('*')
    .eq('unit_id', unitId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Database Error in getHandoverCaseByUnitId:', {
      code: error.code,
      message: error.message,
      unitId
    });
    throw error;
  }
  return data;
}

// Upsert handover case (create or update)
async function upsertHandoverCase(caseData) {
  const { data, error } = await supabase
    .from('handover_cases')
    .upsert(caseData, {
      onConflict: 'unit_id',
      returning: 'representation'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Database Error in upsertHandoverCase:', {
      code: error.code,
      message: error.message,
      unitId: caseData.unit_id
    });
    throw error;
  }
  return data;
}

// Update handover case
async function updateHandoverCase(id, updates) {
  const { data, error } = await supabase
    .from('handover_cases')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Database Error in updateHandoverCase:', {
      code: error.code,
      message: error.message,
      caseId: id
    });
    throw error;
  }
  return data;
}

// Complete handover
async function completeHandover(id, completionData) {
  const { data, error } = await supabase
    .from('handover_cases')
    .update({
      overall_status: 'completed',
      handover_date: completionData.handoverDate,
      handover_by: completionData.handoverBy,
      handover_notes: completionData.notes,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Database Error in completeHandover:', {
      code: error.code,
      message: error.message,
      caseId: id
    });
    throw error;
  }
  return data;
}

/**
 * Handover Events Queries
 */

// Insert event
async function insertHandoverEvent(eventData) {
  const { data, error } = await supabase
    .from('handover_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error('❌ Database Error in insertHandoverEvent:', {
      code: error.code,
      message: error.message,
      eventType: eventData.event_type
    });
    throw error;
  }
  return data;
}

// Get events for a case
async function getEventsForCase(caseId) {
  const { data, error } = await supabase
    .from('handover_events')
    .select('*')
    .eq('case_id', caseId)
    .order('received_at', { ascending: true });

  if (error) {
    console.error('❌ Database Error in getEventsForCase:', {
      code: error.code,
      message: error.message,
      caseId
    });
    throw error;
  }
  return data;
}

// Calculate overall status based on event statuses (2 conditions: Contract + Payment)
function calculateOverallStatus(contractStatus, paymentStatus) {
  if (!contractStatus && !paymentStatus) {
    return 'pending';
  }

  // Both conditions must be met for handover to be ready
  const bothCompleted = 
    contractStatus === 'drafted' &&
    paymentStatus === 'completed';

  if (bothCompleted) {
    return 'ready';
  }

  // Check for any blocked status
  if (contractStatus === 'rejected' || paymentStatus === 'failed') {
    return 'blocked';
  }

  return 'pending';
}

module.exports = {
  // Handover cases
  getAllHandoverCases,
  getHandoverCaseById,
  getHandoverCaseByUnitId,
  upsertHandoverCase,
  updateHandoverCase,
  completeHandover,
  
  // Events
  insertHandoverEvent,
  getEventsForCase,
  
  // Utils
  calculateOverallStatus
};
