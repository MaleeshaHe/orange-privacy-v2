const express = require('express');
const socialMediaController = require('../controllers/socialMedia.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// OAuth configuration status (no auth required for setup checks)
router.get('/oauth/status', socialMediaController.getOAuthStatus);

// OAuth initiation routes (require authentication)
router.get('/facebook/oauth', authenticate, socialMediaController.facebookOAuthInit);
router.get('/instagram/oauth', authenticate, socialMediaController.instagramOAuthInit);

// OAuth callback routes (no auth required - uses state validation)
router.get('/facebook/callback', socialMediaController.facebookOAuthCallback);
router.get('/instagram/callback', socialMediaController.instagramOAuthCallback);

// All other routes require authentication
router.use(authenticate);

// Get all connected social accounts
router.get('/', socialMediaController.getSocialAccounts);

// Sync social account media
router.post('/:accountId/sync', socialMediaController.syncSocialAccount);

// Disconnect social account
router.post('/:accountId/disconnect', socialMediaController.disconnectSocialAccount);

module.exports = router;
