const { ScanResult, ScanJob, SocialMediaItem } = require('../models');
const { Op } = require('sequelize');

const getScanResults = async (req, res) => {
  try {
    const { scanJobId } = req.params;
    const {
      minConfidence,
      maxConfidence,
      sourceType,
      isConfirmedByUser,
      limit = 50,
      offset = 0
    } = req.query;

    // Verify scan job belongs to user
    const scanJob = await ScanJob.findOne({
      where: {
        id: scanJobId,
        userId: req.user.id
      }
    });

    if (!scanJob) {
      return res.status(404).json({ error: 'Scan job not found' });
    }

    // Build where clause
    const where = { scanJobId };

    if (minConfidence) {
      where.confidence = {
        ...where.confidence,
        [Op.gte]: parseFloat(minConfidence)
      };
    }

    if (maxConfidence) {
      where.confidence = {
        ...where.confidence,
        [Op.lte]: parseFloat(maxConfidence)
      };
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (isConfirmedByUser !== undefined) {
      where.isConfirmedByUser = isConfirmedByUser === 'true';
    }

    const results = await ScanResult.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['confidence', 'DESC']],
      include: [
        {
          model: SocialMediaItem,
          as: 'socialMediaItem',
          required: false
        }
      ]
    });

    res.json({
      results: results.rows,
      total: results.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      scanJob: scanJob.toJSON()
    });
  } catch (error) {
    console.error('Get scan results error:', error);
    res.status(500).json({ error: 'Failed to fetch scan results' });
  }
};

const updateResultConfirmation = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { isConfirmedByUser } = req.body;

    // Validate isConfirmedByUser is a boolean
    if (typeof isConfirmedByUser !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid confirmation value',
        message: 'isConfirmedByUser must be true or false'
      });
    }

    // Find result and verify ownership
    const result = await ScanResult.findOne({
      where: { id: resultId },
      include: [
        {
          model: ScanJob,
          as: 'scanJob',
          where: { userId: req.user.id }
        }
      ]
    });

    if (!result) {
      return res.status(404).json({
        error: 'Scan result not found',
        message: 'This scan result does not exist or you do not have permission to access it'
      });
    }

    await result.update({ isConfirmedByUser });

    res.json({
      message: `Match ${isConfirmedByUser ? 'confirmed' : 'rejected'} successfully`,
      result: result.toJSON()
    });
  } catch (error) {
    console.error('Update result confirmation error:', error);
    res.status(500).json({ error: 'Failed to update result confirmation' });
  }
};

const getResultStats = async (req, res) => {
  try {
    const { scanJobId } = req.params;

    // Verify scan job belongs to user
    const scanJob = await ScanJob.findOne({
      where: {
        id: scanJobId,
        userId: req.user.id
      }
    });

    if (!scanJob) {
      return res.status(404).json({ error: 'Scan job not found' });
    }

    // Get confidence distribution
    const confidenceRanges = [
      { min: 90, max: 100, label: 'Very High (90-100%)' },
      { min: 80, max: 89, label: 'High (80-89%)' },
      { min: 70, max: 79, label: 'Medium (70-79%)' },
      { min: 0, max: 69, label: 'Low (0-69%)' }
    ];

    const distribution = await Promise.all(
      confidenceRanges.map(async (range) => {
        const count = await ScanResult.count({
          where: {
            scanJobId,
            confidence: {
              [Op.gte]: range.min,
              [Op.lte]: range.max
            }
          }
        });
        return { ...range, count };
      })
    );

    // Get source type distribution
    const sourceTypeStats = await ScanResult.findAll({
      where: { scanJobId },
      attributes: [
        'sourceType',
        [ScanResult.sequelize.fn('COUNT', ScanResult.sequelize.col('id')), 'count']
      ],
      group: ['sourceType']
    });

    // Get confirmation stats
    const confirmationStats = await ScanResult.findAll({
      where: { scanJobId },
      attributes: [
        'isConfirmedByUser',
        [ScanResult.sequelize.fn('COUNT', ScanResult.sequelize.col('id')), 'count']
      ],
      group: ['isConfirmedByUser']
    });

    // Calculate simple summary stats
    const totalMatches = await ScanResult.count({ where: { scanJobId } });
    const confirmedMatches = await ScanResult.count({
      where: { scanJobId, isConfirmedByUser: true }
    });

    res.json({
      totalMatches,
      confirmedMatches,
      confidenceDistribution: distribution,
      sourceTypeDistribution: sourceTypeStats.map(s => ({
        sourceType: s.sourceType,
        count: parseInt(s.getDataValue('count'))
      })),
      confirmationDistribution: confirmationStats.map(s => ({
        status: s.isConfirmedByUser === null ? 'pending' : (s.isConfirmedByUser ? 'confirmed' : 'rejected'),
        count: parseInt(s.getDataValue('count'))
      }))
    });
  } catch (error) {
    console.error('Get result stats error:', error);
    res.status(500).json({ error: 'Failed to fetch result statistics' });
  }
};

module.exports = {
  getScanResults,
  updateResultConfirmation,
  getResultStats
};
