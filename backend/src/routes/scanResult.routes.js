const express = require('express');
const { body, query } = require('express-validator');
const scanResultController = require('../controllers/scanResult.controller');
const { authenticate, requireBiometricConsent } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// All routes require authentication and biometric consent
router.use(authenticate);
router.use(requireBiometricConsent);

// Get results for a scan job
router.get(
  '/scan/:scanJobId',
  [
    query('minConfidence').optional().isFloat({ min: 0, max: 100 }),
    query('maxConfidence').optional().isFloat({ min: 0, max: 100 }),
    query('sourceType').optional().isIn(['web', 'social_media']),
    query('isConfirmedByUser').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  scanResultController.getScanResults
);

// Get statistics for scan results
router.get('/scan/:scanJobId/stats', scanResultController.getResultStats);

// Update result confirmation ("This is me" / "Not me")
router.patch(
  '/:resultId/confirm',
  [
    body('isConfirmedByUser').isBoolean().withMessage('isConfirmedByUser must be a boolean')
  ],
  validate,
  scanResultController.updateResultConfirmation
);

module.exports = router;
