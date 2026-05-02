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
        priority: defectData.priority,
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
 * Schedule repair for defect
 * @param {string} id - Defect UUID
 * @param {Object} scheduleData - Schedule data (scheduledDate, technicianName, estimatedDuration)
 * @returns {Promise<Object>} Updated defect
 */
async function scheduleRepair(id, scheduleData) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        repair_scheduled_date: scheduleData.scheduledDate,
        repair_notes: scheduleData.repairNotes || null,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'defect.scheduled',
      event_source: 'postsales',
      payload: {
        scheduledDate: scheduleData.scheduledDate,
        technicianName: scheduleData.technicianName,
        estimatedDuration: scheduleData.estimatedDuration
      }
    });

    return data;
  } catch (error) {
    console.error('Error scheduling repair:', error);
    throw error;
  }
}

/**
 * Complete repair (mark as resolved)
 * @param {string} id - Defect UUID
 * @param {Object} repairData - Repair completion data (completedBy, completionNotes, photoAfterUrl)
 * @returns {Promise<Object>} Updated defect
 */
async function completeRepair(id, repairData) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        status: 'resolved',
        repair_notes: repairData.completionNotes || null,
        photo_after_url: repairData.photoAfterUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'repair.completed',
      event_source: 'postsales',
      payload: {
        completedBy: repairData.completedBy,
        completionNotes: repairData.completionNotes
      }
    });

    return data;
  } catch (error) {
    console.error('Error completing repair:', error);
    throw error;
  }
}

/**
 * Close defect case
 * @param {string} id - Defect UUID
 * @param {Object} closeData - Close data (closedBy, closingNotes, photoAfterUrl)
 * @returns {Promise<Object>} Updated defect
 */
async function closeDefect(id, closeData) {
  try {
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: closeData.closedBy,
        closing_notes: closeData.closingNotes || null,
        photo_after_url: closeData.photoAfterUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Insert event
    await insertDefectEvent({
      defect_id: id,
      event_type: 'defect.closed',
      event_source: 'postsales',
      payload: {
        closedBy: closeData.closedBy,
        notes: closeData.closingNotes
      }
    });

    return data;
  } catch (error) {
    console.error('Error closing defect:', error);
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
      in_progress: allDefects.filter(d => d.status === 'in_progress').length,
      resolved: allDefects.filter(d => d.status === 'resolved').length,
      closed: allDefects.filter(d => d.status === 'closed').length,
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

/**
 * Update defect with warranty information
 * @param {string} defectId - Defect UUID
 * @param {Object} warrantyData - Warranty information
 * @returns {Promise<Object>} Updated defect
 */
async function updateDefectWarrantyStatus(defectId, warrantyData) {
  try {
    console.log('ℹ️  Updating defect warranty status...');
    console.log(`   Defect ID: ${defectId}`);
    console.log(`   Warranty Coverage: ${warrantyData.coverageStatus}`);
    console.log(`   Reason: ${warrantyData.coverageReason}`);
    
    const { data, error } = await supabase
      .from('defect_cases')
      .update({
        warranty_id: warrantyData.warrantyId,
        warranty_coverage_status: warrantyData.coverageStatus,
        warranty_coverage_reason: warrantyData.coverageReason,
        warranty_verified_at: warrantyData.verifiedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', defectId)
      .select()
      .single();

    if (error) throw error;
    
    // Insert event
    await insertDefectEvent({
      defect_id: defectId,
      event_type: 'warranty.verified',
      event_source: 'legal',
      payload: {
        coverageStatus: warrantyData.coverageStatus,
        coverageReason: warrantyData.coverageReason
      }
    });
    
    console.log(`   ✅ Warranty status updated successfully`);
    return data;
    
  } catch (error) {
    console.error('Error updating defect warranty status:', error);
    throw error;
  }
}

/**
 * Store warranty coverage information
 * NOTE: This may require a separate warranty_coverage table
 * @param {Object} warrantyData - Warranty coverage data
 * @returns {Promise<Object>} Stored warranty info
 */
async function storeWarrantyCoverage(warrantyData) {
  try {
    console.log('ℹ️  storeWarrantyCoverage called - Database schema/table needed');
    console.log(`   Unit ID: ${warrantyData.unitId}`);
    console.log(`   Contract ID: ${warrantyData.contractId}`);
    console.log(`   Coverage: ${warrantyData.startsAt} to ${warrantyData.endsAt}`);
    
    // TODO: Implement when warranty_coverage table is created
    /*
    const { data, error } = await supabase
      .from('warranty_coverage')
      .insert({
        contract_id: warrantyData.contractId,
        unit_id: warrantyData.unitId,
        customer_id: warrantyData.customerId,
        starts_at: warrantyData.startsAt,
        ends_at: warrantyData.endsAt,
        covered_categories: warrantyData.coveredCategories,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
    */
    
    console.log(`   ℹ️  Warranty coverage logged (storage pending table creation)`);
    return { success: true, message: 'Warranty coverage logged' };
    
  } catch (error) {
    console.error('Error storing warranty coverage:', error);
    throw error;
  }
}

module.exports = {
  getAllDefects,
  getDefectById,
  generateDefectNumber,
  createDefect,
  scheduleRepair,
  completeRepair,
  closeDefect,
  insertDefectEvent,
  getDefectStats,
  updateDefectWarrantyStatus,
  storeWarrantyCoverage
};
