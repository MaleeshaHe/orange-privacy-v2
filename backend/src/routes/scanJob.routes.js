const express = require('express');
const { body, query } = require('express-validator');
const scanJobController = require('../controllers/scanJob.controller');
const { authenticate, requireBiometricConsent } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { scanLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// All routes require authentication and biometric consent
router.use(authenticate);
router.use(requireBiometricConsent);

// Create a new scan job (with rate limiting - expensive operation)
router.post(
  '/',
  scanLimiter,
  [
    body('scanType').optional().isIn(['web', 'social', 'combined']),
    body('confidenceThreshold').optional().isInt({ min: 0, max: 100 })
  ],
  validate,
  scanJobController.createScanJob
);

// Get all scan jobs for the user
router.get(
  '/',
  [
    query('status').optional().isIn(['queued', 'processing', 'completed', 'failed', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  scanJobController.getScanJobs
);

// Get scan job statistics
router.get('/stats', scanJobController.getScanJobStats);

// Get a specific scan job
router.get('/:jobId', scanJobController.getScanJobById);

// Cancel a scan job
router.post('/:jobId/cancel', scanJobController.cancelScanJob);

module.exports = router;
