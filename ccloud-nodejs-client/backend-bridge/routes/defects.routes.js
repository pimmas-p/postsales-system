const express = require('express');
const router = express.Router();
const defectQueries = require('../db/defectQueries');
const producer = require('../kafka/producer');
const externalApi = require('../services/externalApi');

/**
 * @swagger
 * tags:
 *   name: Defects
 *   description: Snagging & Defect Orchestration Service API
 */

/**
 * @swagger
 * /api/defects/cases:
 *   get:
 *     summary: Get all defect cases
 *     tags: [Defects]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, reported, assigned, in_progress, resolved, verified, closed]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [all, low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, electrical, plumbing, cosmetic, structural, hvac, door_window, other]
 *         description: Filter by category
 *       - in: query
 *         name: unitId
 *         schema:
 *           type: string
 *         description: Filter by unit ID (partial match)
 *     responses:
 *       200:
 *         description: List of defect cases
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
 *                     $ref: '#/components/schemas/DefectCase'
 *       500:
 *         description: Server error
 */
router.get('/cases', async (req, res) => {
  try {
    const { status, priority, category, unitId } = req.query;
    const defects = await defectQueries.getAllDefects({
      status,
      priority,
      category,
      unitId
    });

    res.json({
      success: true,
      data: defects
    });
  } catch (error) {
    console.error('Error fetching defects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases/{id}:
 *   get:
 *     summary: Get single defect case with events
 *     tags: [Defects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Defect case UUID
 *     responses:
 *       200:
 *         description: Defect case details with events
 *       404:
 *         description: Defect not found
 *       500:
 *         description: Server error
 */
router.get('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const defect = await defectQueries.getDefectById(id);

    res.json({
      success: true,
      data: defect
    });
  } catch (error) {
    console.error('Error fetching defect:', error);
    res.status(error.message === 'Defect not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases:
 *   post:
 *     summary: Report new defect
 *     tags: [Defects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unitId
 *               - title
 *               - category
 *               - reportedBy
 *             properties:
 *               unitId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [electrical, plumbing, cosmetic, structural, hvac, door_window, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               photoBeforeUrl:
 *                 type: string
 *               reportedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Defect reported successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/cases', async (req, res) => {
  try {
    const { unitId, title, description, category, priority, photoBeforeUrl, reportedBy } = req.body;

    // Validation
    if (!unitId || !title || !category || !reportedBy) {
      return res.status(400).json({
        success: false,
        error: 'unitId, title, category, and reportedBy are required'
      });
    }

    const newDefect = await defectQueries.createDefect({
      unitId,
      title,
      description,
      category,
      priority: priority || 'medium',
      photoBeforeUrl,
      reportedBy
    });

    // Optional: Get property history from Inventory for context
    try {
      const propertyHistory = await externalApi.getPropertyHistory(unitId);
      if (propertyHistory) {
        console.log(`✅ Property history retrieved for unit ${unitId}`);
        // Future: Use history to assess if defect is recurring
      }
    } catch (historyError) {
      console.warn('Could not retrieve property history:', historyError.message);
      // Continue without history - not critical
    }

    // Request warranty coverage check from Legal team
    // This publishes event for Legal to verify if defect is covered
    try {
      const warrantyResult = await producer.publishWarrantyDefectReported(newDefect);
      if (warrantyResult?.success) {
        console.log(`✅ Warranty check requested for defect ${newDefect.defect_number}`);
      }
    } catch (warrantyError) {
      console.warn('Failed to request warranty check:', warrantyError.message);
      // Continue without warranty check - will be handled manually
    }

    // Publish general defect.reported event
    try {
      await producer.publishDefectReported({
        defectId: newDefect.id,
        defectNumber: newDefect.defect_number,
        unitId: newDefect.unit_id,
        title: newDefect.title,
        category: newDefect.category,
        priority: newDefect.priority,
        reportedBy: newDefect.reported_by,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.reported event:', kafkaError.message);
    }

    res.status(201).json({
      success: true,
      data: newDefect
    });
  } catch (error) {
    console.error('Error reporting defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases/{id}/schedule:
 *   put:
 *     summary: Schedule repair for defect
 *     tags: [Defects]
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
 *               - assignedTo
 *               - scheduledDate
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: Contractor name
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: Scheduled repair date
 *               repairNotes:
 *                 type: string
 *                 description: Notes about the repair
 *     responses:
 *       200:
 *         description: Repair scheduled successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, scheduledDate, repairNotes } = req.body;

    // Validation
    if (!assignedTo || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'assignedTo and scheduledDate are required'
      });
    }

    const updatedDefect = await defectQueries.scheduleRepair(id, {
      assignedTo,
      scheduledDate,
      repairNotes
    });

    // Publish Kafka event
    try {
      await producer.publishDefectScheduled({
        defectId: updatedDefect.id,
        defectNumber: updatedDefect.defect_number,
        unitId: updatedDefect.unit_id,
        assignedTo: updatedDefect.assigned_to,
        scheduledDate: updatedDefect.repair_scheduled_date,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.scheduled event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    console.error('Error scheduling repair:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases/{id}/close:
 *   put:
 *     summary: Close defect case
 *     tags: [Defects]
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
 *               - closedBy
 *             properties:
 *               closedBy:
 *                 type: string
 *                 description: Name of person closing the case
 *               closingNotes:
 *                 type: string
 *                 description: Notes about case closure
 *               photoAfterUrl:
 *                 type: string
 *                 description: URL of photo after repair
 *     responses:
 *       200:
 *         description: Defect case closed successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { closedBy, closingNotes, photoAfterUrl } = req.body;

    // Validation
    if (!closedBy) {
      return res.status(400).json({
        success: false,
        error: 'closedBy is required'
      });
    }

    const updatedDefect = await defectQueries.closeDefect(id, {
      closedBy,
      closingNotes,
      photoAfterUrl
    });

    // Publish Kafka event
    try {
      await producer.publishDefectClosed({
        defectId: updatedDefect.id,
        defectNumber: updatedDefect.defect_number,
        unitId: updatedDefect.unit_id,
        closedBy: updatedDefect.closed_by,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.closed event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    console.error('Error closing defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/stats:
 *   get:
 *     summary: Get defect statistics
 *     tags: [Defects]
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
 *                     reported:
 *                       type: integer
 *                     assigned:
 *                       type: integer
 *                     in_progress:
 *                       type: integer
 *                     resolved:
 *                       type: integer
 *                     verified:
 *                       type: integer
 *                     critical:
 *                       type: integer
 *                     high:
 *                       type: integer
 *                     medium:
 *                       type: integer
 *                     low:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await defectQueries.getDefectStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching defect stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/{id}/warranty:
 *   get:
 *     summary: Get warranty coverage for defect
 *     tags: [Defects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Defect case ID
 *     responses:
 *       200:
 *         description: Warranty coverage details
 *       404:
 *         description: Defect not found
 *       500:
 *         description: Server error
 */
router.get('/:id/warranty', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get defect details to extract contract_id
    const defect = await defectQueries.getDefectById(id);
    
    if (!defect) {
      return res.status(404).json({
        success: false,
        error: 'Defect case not found'
      });
    }
    
    // Call Legal Warranty Service
    const warrantyData = await externalApi.getWarrantyCoverage(defect.contract_id);
    
    if (!warrantyData) {
      return res.status(503).json({
        success: false,
        error: 'Unable to fetch warranty information from Legal Warranty Service'
      });
    }
    
    res.json({
      success: true,
      data: warrantyData
    });
  } catch (error) {
    console.error('Error fetching warranty for defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/{id}/unit-history:
 *   get:
 *     summary: Get unit/property history for defect
 *     tags: [Defects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Defect case ID
 *     responses:
 *       200:
 *         description: Property history from Inventory Service
 *       404:
 *         description: Defect not found
 *       500:
 *         description: Server error
 */
router.get('/:id/unit-history', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get defect details to extract unit_id
    const defect = await defectQueries.getDefectById(id);
    
    if (!defect) {
      return res.status(404).json({
        success: false,
        error: 'Defect case not found'
      });
    }
    
    // Call Inventory Service
    const historyData = await externalApi.getPropertyHistory(defect.unit_id);
    
    if (!historyData) {
      return res.status(503).json({
        success: false,
        error: 'Unable to fetch property history from Inventory Service'
      });
    }
    
    res.json({
      success: true,
      data: historyData
    });
  } catch (error) {
    console.error('Error fetching unit history for defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
