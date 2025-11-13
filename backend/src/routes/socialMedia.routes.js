const express = require('express');
const { body } = require('express-validator');
const socialMediaController = require('../controllers/socialMedia.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all connected social accounts
router.get('/', socialMediaController.getSocialAccounts);

// Connect Facebook account
router.post(
  '/facebook/connect',
  [
    body('accessToken').notEmpty().withMessage('Access token is required'),
    body('refreshToken').optional()
  ],
  validate,
  socialMediaController.connectFacebook
);

// Connect Instagram account
router.post(
  '/instagram/connect',
  [
    body('accessToken').notEmpty().withMessage('Access token is required'),
    body('refreshToken').optional()
  ],
  validate,
  socialMediaController.connectInstagram
);

// Sync social account media
router.post('/:accountId/sync', socialMediaController.syncSocialAccount);

// Disconnect social account
router.post('/:accountId/disconnect', socialMediaController.disconnectSocialAccount);

module.exports = router;
