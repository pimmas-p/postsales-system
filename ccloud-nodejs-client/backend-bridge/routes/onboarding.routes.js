const express = require('express');
const router = express.Router();
const onboardingQueries = require('../db/onboardingQueries');
const producer = require('../kafka/producer');
const externalApi = require('../services/externalApi');

/**
 * @swagger
 * tags:
 *   name: Onboarding
 *   description: Owner Onboarding Service API
 */

/**
 * @swagger
 * /api/onboarding/cases:
 *   get:
 *     summary: Get all onboarding cases
 *     tags: [Onboarding]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, in_progress, completed]
 *         description: Filter by overall status
 *       - in: query
 *         name: unitId
 *         schema:
 *           type: string
 *         description: Filter by unit ID (partial match)
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID (partial match)
 *     responses:
 *       200:
 *         description: List of onboarding cases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OnboardingCase'
 *       500:
 *         description: Server error
 */
router.get('/cases', async (req, res) => {
  try {
    const { status, unitId, customerId } = req.query;
    const cases = await onboardingQueries.getAllOnboardingCases({
      status,
      unitId,
      customerId
    });

    res.json({
      success: true,
      data: cases
    });
  } catch (error) {
    console.error('Error fetching onboarding cases:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/cases/{id}:
 *   get:
 *     summary: Get single onboarding case with events
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Onboarding case UUID
 *     responses:
 *       200:
 *         description: Onboarding case details with events
 *       404:
 *         description: Case not found
 *       500:
 *         description: Server error
 */
router.get('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const caseData = await onboardingQueries.getOnboardingCaseById(id);

    res.json({
      success: true,
      data: caseData
    });
  } catch (error) {
    console.error('Error fetching onboarding case:', error);
    res.status(error.message === 'Onboarding case not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/cases:
 *   post:
 *     summary: Create new onboarding case (manual start)
 *     tags: [Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - customerId
 *             properties:
 *               handoverCaseId:
 *                 type: string
 *                 format: uuid
 *               unitId:
 *                 type: string
 *               customerId:
 *                 type: string
 *               areaSize:
 *                 type: number
 *                 description: Unit area in square meters (optional, for common fees calculation)
 *     responses:
 *       201:
 *         description: Onboarding case created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/cases', async (req, res) => {
  try {
    const { handoverCaseId, unitId, customerId, areaSize } = req.body;

    // Validation
    if (!unitId || !customerId) {
      return res.status(400).json({
        success: false,
        error: 'unitId and customerId are required'
      });
    }

    const newCase = await onboardingQueries.createOnboardingCase({
      handoverCaseId,
      unitId,
      customerId,
      areaSize
    });

    // Publish Kafka event
    try {
      await producer.publishOnboardingStarted({
        caseId: newCase.id,
        unitId: newCase.unit_id,
        customerId: newCase.customer_id,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish onboarding.started event:', kafkaError.message);
    }

    res.status(201).json({
      success: true,
      data: newCase
    });
  } catch (error) {
    console.error('Error creating onboarding case:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/cases/{id}/register:
 *   put:
 *     summary: Update member registration
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - passwordHash
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               passwordHash:
 *                 type: string
 *               areaSize:
 *                 type: number
 *                 description: Unit area in square meters (optional, will use DB value or default 50.0)
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, ANNUALLY]
 *                 description: Billing cycle preference (default MONTHLY)
 *               effectiveDate:
 *                 type: string
 *                 format: date-time
 *                 description: Common fee billing start date (default today)
 *     responses:
 *       200:
 *         description: Registration updated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, passwordHash, areaSize, billingCycle, effectiveDate } = req.body;

    // Validation
    if (!email || !phone || !passwordHash) {
      return res.status(400).json({
        success: false,
        error: 'email, phone, and passwordHash are required'
      });
    }

    // 🔍 Fetch property details from Inventory API for areaSize
    // Priority: Request Body > Inventory API > Database > Default
    let finalAreaSize = areaSize; // From request body
    let propertyDetails = null;
    
    // Get current case data
    const currentCase = await onboardingQueries.getOnboardingCaseById(id);
    
    try {
      propertyDetails = await externalApi.getPropertyDetails(currentCase.unit_id);
      if (propertyDetails) {
        console.log(`✅ Property validated via Inventory API: ${propertyDetails.propertyId}`);
        
        // Use areaSize from Inventory if available and not provided in request
        if (!finalAreaSize && propertyDetails.areaSize) {
          finalAreaSize = propertyDetails.areaSize;
          console.log(`📐 Using areaSize from Inventory API: ${finalAreaSize} sqm`);
        }
      }
    } catch (inventoryError) {
      console.warn('⚠️ Could not fetch property details from Inventory:', inventoryError.message);
      // Continue anyway - Inventory API call is optional
    }

    // Final fallback: use existing DB value if no new value provided
    if (!finalAreaSize && currentCase.area_size) {
      finalAreaSize = currentCase.area_size;
      console.log(`📐 Using existing areaSize from DB: ${finalAreaSize} sqm`);
    }

    const updatedCase = await onboardingQueries.updateMemberRegistration(id, {
      email,
      phone,
      passwordHash,
      areaSize: finalAreaSize // Resolved areaSize (request > inventory > db > default)
    });

    // Publish Kafka event with billing information for Payment team
    // Per TEAM_INTEGRATION.md Section 8.2 - Payment needs this for account receivable setup
    // Team 6 CSV format: customerId, unitId, areaSize, feeRatePerSqm, billingCycle, effectiveDate, propertyId
    try {
      // 🔧 Configuration for common fees calculation
      const DEFAULT_AREA_SIZE = 50.0; // sqm - fallback if no data
      const DEFAULT_FEE_RATE = 45.0; // THB per sqm - fallback if no data (45.0); // THB per sqm
      const DEFAULT_BILLING_CYCLE = 'MONTHLY';

      await producer.publishMemberRegistered({
        customerId: updatedCase.customer_id,
        unitId: updatedCase.unit_id,
        // ✅ Use request body > DB value > default
        areaSize: areaSize || updatedCase.area_size || DEFAULT_AREA_SIZE,
        feeRatePerSqm: DEFAULT_FEE_RATE,
        effectiveDate: effectiveDate || updatedCase.registered_at || new Date().toISOString(),
        billingCycle: billingCycle || DEFAULT_BILLING_CYCLE, // Allow user choice
        propertyId: updatedCase.unit_id, // Use unitId as propertyId
        timestamp: new Date().toISOString()
      });
      console.log(`✅ Member registration published to Payment team for billing setup`);
    } catch (kafkaError) {
      console.warn('Failed to publish member.registered event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedCase
    });
  } catch (error) {
    console.error('Error updating member registration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/cases/{id}/documents:
 *   put:
 *     summary: Upload documents
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idDocumentUrl
 *               - contractDocumentUrl
 *             properties:
 *               idDocumentUrl:
 *                 type: string
 *               contractDocumentUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Documents uploaded
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { idDocumentUrl, contractDocumentUrl } = req.body;

    // Validation
    if (!idDocumentUrl || !contractDocumentUrl) {
      return res.status(400).json({
        success: false,
        error: 'idDocumentUrl and contractDocumentUrl are required'
      });
    }

    const updatedCase = await onboardingQueries.updateDocuments(id, {
      idDocumentUrl,
      contractDocumentUrl
    });

    res.json({
      success: true,
      data: updatedCase
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/cases/{id}/complete:
 *   put:
 *     summary: Complete onboarding
 *     tags: [Onboarding]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completedBy
 *             properties:
 *               completedBy:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { completedBy, notes } = req.body;

    // Validation
    if (!completedBy) {
      return res.status(400).json({
        success: false,
        error: 'completedBy is required'
      });
    }

    const updatedCase = await onboardingQueries.completeOnboarding(id, {
      completedBy,
      notes
    });

    // Publish Kafka event
    try {
      await producer.publishOnboardingCompleted({
        caseId: updatedCase.id,
        unitId: updatedCase.unit_id,
        customerId: updatedCase.customer_id,
        completedBy: updatedCase.completed_by,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish onboarding.completed event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedCase
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/onboarding/stats:
 *   get:
 *     summary: Get onboarding statistics
 *     tags: [Onboarding]
 *     responses:
 *       200:
 *         description: Statistics object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     in_progress:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await onboardingQueries.getOnboardingStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching onboarding stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
