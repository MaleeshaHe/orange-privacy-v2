const express = require('express');
const { body } = require('express-validator');
const refPhotoController = require('../controllers/refPhoto.controller');
const { authenticate, requireBiometricConsent } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');
const upload = require('../config/multer.config');

const router = express.Router();

// All routes require authentication and biometric consent
router.use(authenticate);
router.use(requireBiometricConsent);

// Upload reference photo (with rate limiting)
router.post(
  '/',
  uploadLimiter,
  upload.single('photo'),
  [
    body('photoType').optional().isIn(['frontal', 'side', 'other'])
  ],
  validate,
  refPhotoController.uploadRefPhoto
);

// Get all reference photos for the user
router.get('/', refPhotoController.getRefPhotos);

// Delete a reference photo
router.delete('/:photoId', refPhotoController.deleteRefPhoto);

// Deactivate a reference photo (keep for history)
router.patch('/:photoId/deactivate', refPhotoController.deactivateRefPhoto);

// Activate a reference photo
router.patch('/:photoId/activate', refPhotoController.activateRefPhoto);

module.exports = router;
