const supabase = require('./supabase');

/**
 * Get all defect cases with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of defect cases
 */
async function getAllDefects(filters = {}) {
  try {
    let query = supabase
      .from('defect_cases')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.unitId) {
      query = query.ilike('unit_id', `%${filters.unitId}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching defects:', error);
    throw error;
  }
}

/**
 * Get single defect case by ID with events
 * @param {string} id - Defect UUID
 * @returns {Promise<Object>} Defect case with events
 */
async function getDefectById(id) {
  try {
    // Get defect
    const { data: defectData, error: defectError } = await supabase
      .from('defect_cases')
      .select('*')
      .eq('id', id)
      .single();

    if (defectError) throw defectError;
    if (!defectData) throw new Error('Defect not found');

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('defect_events')
      .select('*')
      .eq('defect_id', id)
      .order('created_at', { ascending: false });

    if (eventsError) throw eventsError;

    return {
      ...defectData,
      events: events || []
    };
  } catch (error) {
    console.error('Error fetching defect by ID:', error);
    throw error;
  }
}

/**
 * Generate unique defect number (DEF-YYYY-####)
 * @returns {Promise<string>} Generated defect number
 */
async function generateDefectNumber() {
  try {
    // Call the database function to generate defect number
    const { data, error } = await supabase.rpc('generate_defect_number');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating defect number:', error);
    // Fallback to JavaScript-based generation if DB function fails
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `DEF-${year}-${random}`;
  }
}

/**
 * Create new defect case (report defect)
 * @param {Object} defectData - Defect data
 * @returns {Promise<Object>} Created defect
 */
async function createDefect(defectData) {
  try {
    // Generate defect number
    const defectNumber = await generateDefectNumber();

    const { data, error } = await supabase
      .from('defect_cases')
      .insert({
        defect_number: defectNumber,
        unit_id: defectData.unitId,
        title: defectData.title,
        description: defectData.description || null,
        category: defectData.category,
        priority: defectData.priority || 'medium',
        photo_before_url: defectData.photoBeforeUrl || null,
        reported_by: defectData.reportedBy,
        reported_at: new Date().toISOString(),
        status: 'reported',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: data.id,
      event_type: 'defect.reported',
      event_source: 'postsales',
      payload: {
        defectNumber: data.defect_number,
        unitId: data.unit_id,
        category: data.category,
        priority: data.priority
      }
    });

    return data;
  } catch (error) {
    console.error('Error creating defect:', error);
    throw error;
  }
}

/**
 * Assign defect to contractor
 * @param {string} id - Defect UUID
 * @param {string} assignedTo - Contractor ID/name
 * @returns {Promise<Object>} Updated defect
 */
async function assignDefect(id, assignedTo) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        assigned_to: assignedTo,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'defect.assigned',
      event_source: 'postsales',
      payload: { assignedTo }
    });

    return data;
  } catch (error) {
    console.error('Error assigning defect:', error);
    throw error;
  }
}

/**
 * Update defect status (e.g., in_progress)
 * @param {string} id - Defect UUID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated defect
 */
async function updateDefectStatus(id, status) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: `defect.status_changed`,
      event_source: 'postsales',
      payload: { newStatus: status }
    });

    return data;
  } catch (error) {
    console.error('Error updating defect status:', error);
    throw error;
  }
}

/**
 * Resolve defect (mark as fixed)
 * @param {string} id - Defect UUID
 * @param {Object} resolutionData - Resolution data
 * @returns {Promise<Object>} Updated defect
 */
async function resolveDefect(id, resolutionData) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolutionData.resolvedBy,
        resolution_notes: resolutionData.notes || null,
        photo_after_url: resolutionData.photoAfterUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'defect.resolved',
      event_source: 'postsales',
      payload: {
        resolvedBy: resolutionData.resolvedBy,
        notes: resolutionData.notes
      }
    });

    return data;
  } catch (error) {
    console.error('Error resolving defect:', error);
    throw error;
  }
}

/**
 * Verify defect resolution
 * @param {string} id - Defect UUID
 * @param {string} verifiedBy - Staff who verified
 * @returns {Promise<Object>} Updated defect
 */
async function verifyDefect(id, verifiedBy) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: verifiedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'defect.verified',
      event_source: 'postsales',
      payload: { verifiedBy }
    });

    return data;
  } catch (error) {
    console.error('Error verifying defect:', error);
    throw error;
  }
}

/**
 * Insert defect event to audit trail
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Inserted event
 */
async function insertDefectEvent(eventData) {
  try {
    const { data, error } = await supabase
      .from('defect_events')
      .insert({
        defect_id: eventData.defect_id,
        event_type: eventData.event_type,
        event_source: eventData.event_source,
        payload: eventData.payload,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting defect event:', error);
    throw error;
  }
}

/**
 * Get defect statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getDefectStats() {
  try {
    const { data: allDefects, error } = await supabase
      .from('defect_cases')
      .select('status, priority');

    if (error) throw error;

    const stats = {
      total: allDefects.length,
      reported: allDefects.filter(d => d.status === 'reported').length,
      assigned: allDefects.filter(d => d.status === 'assigned').length,
      in_progress: allDefects.filter(d => d.status === 'in_progress').length,
      resolved: allDefects.filter(d => d.status === 'resolved').length,
      verified: allDefects.filter(d => d.status === 'verified').length,
      critical: allDefects.filter(d => d.priority === 'critical').length,
      high: allDefects.filter(d => d.priority === 'high').length,
      medium: allDefects.filter(d => d.priority === 'medium').length,
      low: allDefects.filter(d => d.priority === 'low').length
    };

    return stats;
  } catch (error) {
    console.error('Error fetching defect stats:', error);
    throw error;
  }
}

module.exports = {
  getAllDefects,
  getDefectById,
  generateDefectNumber,
  createDefect,
  assignDefect,
  updateDefectStatus,
  resolveDefect,
  verifyDefect,
  insertDefectEvent,
  getDefectStats
};
