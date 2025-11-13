const { ScanJob, ScanResult, RefPhoto } = require('../models');
const { addScanJob, getJobStatus } = require('../services/queue.service');
const { Op } = require('sequelize');

const createScanJob = async (req, res) => {
  try {
    const { scanType, confidenceThreshold } = req.body;

    // Check if user has biometric consent
    if (!req.user.biometricConsentGiven) {
      return res.status(403).json({
        error: 'Biometric consent required',
        message: 'You must give consent for biometric scanning before starting a scan'
      });
    }

    // Check if user has reference photos
    const refPhotoCount = await RefPhoto.count({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    if (refPhotoCount === 0) {
      return res.status(400).json({
        error: 'No reference photos',
        message: 'Please upload at least one reference photo before starting a scan'
      });
    }

    // Use user's confidence threshold if not provided
    const threshold = confidenceThreshold || req.user.confidenceThreshold || 80;

    // Create scan job
    const scanJob = await ScanJob.create({
      userId: req.user.id,
      status: 'queued',
      scanType: scanType || 'web',
      confidenceThreshold: threshold,
      provider: 'aws-rekognition',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    // Add job to queue
    await addScanJob(scanJob.id);

    res.status(201).json({
      message: 'Scan job created successfully',
      scanJob: scanJob.toJSON()
    });
  } catch (error) {
    console.error('Create scan job error:', error);
    res.status(500).json({
      error: 'Failed to create scan job',
      details: error.message
    });
  }
};

const getScanJobs = async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }

    const scanJobs = await ScanJob.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ScanResult,
          as: 'results',
          attributes: ['id', 'confidence', 'sourceType'],
          limit: 5
        }
      ]
    });

    res.json({
      scanJobs: scanJobs.rows,
      total: scanJobs.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get scan jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch scan jobs' });
  }
};

const getScanJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const scanJob = await ScanJob.findOne({
      where: {
        id: jobId,
        userId: req.user.id
      },
      include: [
        {
          model: ScanResult,
          as: 'results'
        }
      ]
    });

    if (!scanJob) {
      return res.status(404).json({ error: 'Scan job not found' });
    }

    res.json({
      scanJob: scanJob.toJSON()
    });
  } catch (error) {
    console.error('Get scan job error:', error);
    res.status(500).json({ error: 'Failed to fetch scan job' });
  }
};

const cancelScanJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const scanJob = await ScanJob.findOne({
      where: {
        id: jobId,
        userId: req.user.id
      }
    });

    if (!scanJob) {
      return res.status(404).json({ error: 'Scan job not found' });
    }

    if (scanJob.status === 'completed' || scanJob.status === 'failed' || scanJob.status === 'cancelled') {
      return res.status(400).json({
        error: 'Cannot cancel scan job',
        message: `Scan job is already ${scanJob.status}`
      });
    }

    // Update status to cancelled
    await scanJob.update({
      status: 'cancelled',
      completedAt: new Date()
    });

    // TODO: Remove job from queue if it's still queued

    res.json({
      message: 'Scan job cancelled successfully',
      scanJob: scanJob.toJSON()
    });
  } catch (error) {
    console.error('Cancel scan job error:', error);
    res.status(500).json({ error: 'Failed to cancel scan job' });
  }
};

const getScanJobStats = async (req, res) => {
  try {
    const stats = await ScanJob.findAll({
      where: { userId: req.user.id },
      attributes: [
        'status',
        [ScanJob.sequelize.fn('COUNT', ScanJob.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const totalScans = await ScanJob.count({
      where: { userId: req.user.id }
    });

    const totalMatches = await ScanResult.count({
      include: [{
        model: ScanJob,
        as: 'scanJob',
        where: { userId: req.user.id },
        attributes: []
      }]
    });

    res.json({
      stats: stats.map(s => ({
        status: s.status,
        count: parseInt(s.getDataValue('count'))
      })),
      totalScans,
      totalMatches
    });
  } catch (error) {
    console.error('Get scan job stats error:', error);
    res.status(500).json({ error: 'Failed to fetch scan job stats' });
  }
};

module.exports = {
  createScanJob,
  getScanJobs,
  getScanJobById,
  cancelScanJob,
  getScanJobStats
};
