const express = require('express');
const router = express.Router();
const defectQueries = require('../db/defectQueries');
const producer = require('../kafka/producer');

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

    // Publish Kafka event
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
 * /api/defects/cases/{id}/assign:
 *   put:
 *     summary: Assign defect to contractor
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
 *             properties:
 *               assignedTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Defect assigned successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Validation
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'assignedTo is required'
      });
    }

    const updatedDefect = await defectQueries.assignDefect(id, assignedTo);

    // Publish Kafka event
    try {
      await producer.publishDefectAssigned({
        defectId: updatedDefect.id,
        defectNumber: updatedDefect.defect_number,
        unitId: updatedDefect.unit_id,
        assignedTo: updatedDefect.assigned_to,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.assigned event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    console.error('Error assigning defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases/{id}/resolve:
 *   put:
 *     summary: Mark defect as resolved
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
 *               - resolvedBy
 *             properties:
 *               resolvedBy:
 *                 type: string
 *               notes:
 *                 type: string
 *               photoAfterUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Defect resolved successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, notes, photoAfterUrl } = req.body;

    // Validation
    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy is required'
      });
    }

    const updatedDefect = await defectQueries.resolveDefect(id, {
      resolvedBy,
      notes,
      photoAfterUrl
    });

    // Publish Kafka event
    try {
      await producer.publishDefectResolved({
        defectId: updatedDefect.id,
        defectNumber: updatedDefect.defect_number,
        unitId: updatedDefect.unit_id,
        resolvedBy: updatedDefect.resolved_by,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.resolved event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    console.error('Error resolving defect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/defects/cases/{id}/verify:
 *   put:
 *     summary: Verify defect resolution
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
 *               - verifiedBy
 *             properties:
 *               verifiedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Defect verified successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.put('/cases/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;

    // Validation
    if (!verifiedBy) {
      return res.status(400).json({
        success: false,
        error: 'verifiedBy is required'
      });
    }

    const updatedDefect = await defectQueries.verifyDefect(id, verifiedBy);

    // Publish Kafka event
    try {
      await producer.publishDefectVerified({
        defectId: updatedDefect.id,
        defectNumber: updatedDefect.defect_number,
        unitId: updatedDefect.unit_id,
        verifiedBy: updatedDefect.verified_by,
        timestamp: new Date().toISOString()
      });
    } catch (kafkaError) {
      console.warn('Failed to publish defect.verified event:', kafkaError.message);
    }

    res.json({
      success: true,
      data: updatedDefect
    });
  } catch (error) {
    console.error('Error verifying defect:', error);
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

module.exports = router;
