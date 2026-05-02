const express = require('express');
const router = express.Router();
const {
  getAllHandoverCases,
  getHandoverCaseById,
  completeHandover,
  getEventsForCase,
  upsertHandoverCase
} = require('../db/queries');
const { publishHandoverCompleted } = require('../kafka/producer');
const externalApi = require('../services/externalApi');
const onboardingQueries = require('../db/onboardingQueries');

/**
 * POST /api/handover/cases
 * Create a new handover case (for testing/simulation)
 */
router.post('/cases', async (req, res) => {
  try {
    const caseData = {
      unit_id: req.body.unit_id,
      customer_id: req.body.customer_id,
      contract_status: req.body.contract_status || null,
      payment_status: req.body.payment_status || null,
      payment_amount: req.body.payment_amount || null,
      overall_status: req.body.overall_status || 'pending',
      contract_received_at: req.body.contract_received_at || null,
      payment_received_at: req.body.payment_received_at || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!caseData.unit_id || !caseData.customer_id) {
      return res.status(400).json({
        success: false,
        error: 'unit_id and customer_id are required'
      });
    }

    const createdCase = await upsertHandoverCase(caseData);

    res.status(201).json({
      success: true,
      message: 'Handover case created successfully',
      data: createdCase
    });
  } catch (error) {
    console.error('❌ Error creating handover case:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
 * Mark handover as completed, publish event, and create onboarding case
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

    // Automatically create onboarding case
    try {
      const onboardingCase = await onboardingQueries.createOnboardingCase({
        handoverCaseId: completedCase.id,
        unitId: completedCase.unit_id,
        customerId: completedCase.customer_id,
        areaSize: null // Will be set during member registration
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Onboarding case created automatically: ${onboardingCase.id}`);
      }
    } catch (onboardingError) {
      console.error('❌ Failed to create onboarding case:', onboardingError.message);
      // Continue even if onboarding creation fails - don't block handover completion
    }

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

/**
 * GET /api/handover/:id/contract
 * Get contract details from Legal Contract Service
 */
router.get('/:id/contract', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get handover case to extract contract_id
    const handoverCase = await getHandoverCaseById(id);
    
    if (!handoverCase) {
      return res.status(404).json({
        success: false,
        error: 'Handover case not found'
      });
    }
    
    // Check if contract_id exists
    if (!handoverCase.contract_id) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ยังไม่มีข้อมูล Contract - อาจเกิดจาก Legal ยังไม่ได้ส่ง event',
        reason: 'NO_CONTRACT_ID'
      });
    }
    
    // Call Legal Contract Service
    const contractData = await externalApi.getContractDetails(handoverCase.contract_id);
    
    if (!contractData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ไม่สามารถเชื่อมต่อ Legal Contract Service ได้',
        reason: 'SERVICE_UNAVAILABLE',
        contractId: handoverCase.contract_id
      });
    }
    
    res.json({
      success: true,
      data: contractData
    });
  } catch (error) {
    console.error('Error fetching contract for handover:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/handover/:id/payment
 * Get payment details from Payment Service
 */
router.get('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get handover case to extract customer_id and unit_id
    const handoverCase = await getHandoverCaseById(id);
    
    if (!handoverCase) {
      return res.status(404).json({
        success: false,
        error: 'Handover case not found'
      });
    }
    
    // Check if required IDs exist
    if (!handoverCase.customer_id || !handoverCase.unit_id) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ยังไม่มีข้อมูล Customer/Unit ID',
        reason: 'MISSING_IDS'
      });
    }
    
    // Call Payment Service
    const paymentData = await externalApi.getPaymentDetails(
      handoverCase.customer_id,
      handoverCase.unit_id
    );
    
    if (!paymentData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ไม่สามารถเชื่อมต่อ Payment Service ได้',
        reason: 'SERVICE_UNAVAILABLE',
        customerId: handoverCase.customer_id,
        unitId: handoverCase.unit_id
      });
    }
    
    res.json({
      success: true,
      data: paymentData
    });
  } catch (error) {
    console.error('Error fetching payment for handover:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/handover/migrate-to-onboarding
 * Create onboarding cases for all completed handover cases (one-time migration)
 */
router.post('/migrate-to-onboarding', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Starting onboarding migration...');
    }
    
    // Get all completed handover cases
    const completedCases = await getAllHandoverCases({ status: 'completed' });
    
    const results = {
      total: completedCases.length,
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const handoverCase of completedCases) {
      try {
        // Check if onboarding case already exists
        const existing = await onboardingQueries.getAllOnboardingCases({
          unitId: handoverCase.unit_id,
          customerId: handoverCase.customer_id
        });

        if (existing && existing.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⏭️  Skipped: Onboarding already exists for ${handoverCase.unit_id}`);
          }
          results.skipped++;
          continue;
        }

        // Create onboarding case
        const onboardingCase = await onboardingQueries.createOnboardingCase({
          handoverCaseId: handoverCase.id,
          unitId: handoverCase.unit_id,
          customerId: handoverCase.customer_id,
          areaSize: null
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Created onboarding case for ${handoverCase.unit_id}`);
        }
        results.created++;
      } catch (error) {
        console.error(`❌ Error for ${handoverCase.unit_id}:`, error.message);
        results.errors.push({
          unitId: handoverCase.unit_id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Migration completed',
      results
    });
  } catch (error) {
    console.error('Error in migration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/handover/:id/unit
 * Get unit/property details from Inventory Service
 */
router.get('/:id/unit', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get handover case to extract unit_id
    const handoverCase = await getHandoverCaseById(id);
    
    if (!handoverCase) {
      return res.status(404).json({
        success: false,
        error: 'Handover case not found'
      });
    }
    
    // Check if unit_id exists
    if (!handoverCase.unit_id) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ยังไม่มีข้อมูล Unit ID',
        reason: 'MISSING_UNIT_ID'
      });
    }
    
    // Call Inventory Service
    const unitData = await externalApi.getPropertyDetails(handoverCase.unit_id);
    
    if (!unitData) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'ไม่สามารถเชื่อมต่อ Inventory Service ได้',
        reason: 'SERVICE_UNAVAILABLE',
        unitId: handoverCase.unit_id
      });
    }
    
    res.json({
      success: true,
      data: unitData
    });
  } catch (error) {
    console.error('Error fetching unit for handover:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/handover/health/external-services
 * Check health of all external services (diagnostic endpoint)
 */
router.get('/health/external-services', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Test Legal Contract Service
  try {
    const testResult = await externalApi.getContractByUnit('TEST_UNIT');
    results.services.legalContract = {
      status: 'online',
      url: process.env.LEGAL_CONTRACT_SERVICE_URL,
      message: 'Service is responding'
    };
  } catch (error) {
    results.services.legalContract = {
      status: 'offline',
      url: process.env.LEGAL_CONTRACT_SERVICE_URL,
      error: error.message
    };
  }

  // Test Payment Service
  try {
    const testResult = await externalApi.getPaymentDetails('TEST_CUSTOMER', 'TEST_UNIT');
    results.services.payment = {
      status: 'online',
      url: process.env.PAYMENT_SERVICE_URL,
      message: 'Service is responding'
    };
  } catch (error) {
    results.services.payment = {
      status: 'offline',
      url: process.env.PAYMENT_SERVICE_URL,
      error: error.message
    };
  }

  // Test Inventory Service
  try {
    const testResult = await externalApi.getPropertyDetails('TEST_UNIT');
    results.services.inventory = {
      status: 'online',
      url: process.env.INVENTORY_SERVICE_URL,
      message: 'Service is responding'
    };
  } catch (error) {
    results.services.inventory = {
      status: 'offline',
      url: process.env.INVENTORY_SERVICE_URL,
      error: error.message
    };
  }

  res.json({
    success: true,
    data: results
  });
});

module.exports = router;
