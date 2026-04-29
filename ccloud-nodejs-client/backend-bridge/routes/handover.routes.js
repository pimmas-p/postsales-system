const express = require('express');
const router = express.Router();
const {
  getAllHandoverCases,
  getHandoverCaseById,
  completeHandover,
  getEventsForCase
} = require('../db/queries');
const { publishHandoverCompleted } = require('../kafka/producer');

/**
 * GET /api/handover/cases
 * Get all handover cases with optional filters
 */
router.get('/cases', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      unitId: req.query.unitId,
      customerId: req.query.customerId
    };

    const cases = await getAllHandoverCases(filters);

    res.json({
      success: true,
      data: cases,
      count: cases.length
    });
  } catch (error) {
    console.error('❌ Error in GET /api/handover/cases:', {
      query: req.query,
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'DATABASE_ERROR',
        message: 'ไม่สามารถดึงข้อมูล handover cases ได้',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/handover/cases/:id
 * Get single handover case with events
 */
router.get('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const handoverCase = await getHandoverCaseById(id);
    const events = await getEventsForCase(id);

    res.json({
      success: true,
      data: {
        ...handoverCase,
        events
      }
    });
  } catch (error) {
    console.error('❌ Error in GET /api/handover/cases/:id:', {
      caseId: req.params.id,
      error: error.message,
      code: error.code
    });
    
    if (error.message.includes('not found') || error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ไม่พบ handover case ที่ต้องการ',
          caseId: req.params.id,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'DATABASE_ERROR',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูล handover case',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/handover/cases/:id/complete
 * Mark handover as completed and publish event
 */
router.put('/cases/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { handoverDate, handoverBy, notes } = req.body;

    // Validate required fields
    if (!handoverDate || !handoverBy) {
      return res.status(400).json({
        success: false,
        error: 'handoverDate and handoverBy are required'
      });
    }

    // Complete handover in database
    const completedCase = await completeHandover(id, {
      handoverDate,
      handoverBy,
      notes
    });

    // Publish event to Kafka
    await publishHandoverCompleted(completedCase);

    res.json({
      success: true,
      message: 'Handover completed successfully',
      data: completedCase
    });
  } catch (error) {
    console.error('Error completing handover:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Handover case not found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/handover/cases/:id/events
 * Get all events for a handover case
 */
router.get('/cases/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const events = await getEventsForCase(id);

    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/handover/stats
 * Get statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const allCases = await getAllHandoverCases();

    const stats = {
      total: allCases.length,
      pending: allCases.filter(c => c.overall_status === 'pending').length,
      ready: allCases.filter(c => c.overall_status === 'ready').length,
      completed: allCases.filter(c => c.overall_status === 'completed').length,
      blocked: allCases.filter(c => c.overall_status === 'blocked').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
