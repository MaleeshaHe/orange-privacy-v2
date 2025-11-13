const express = require('express');
const socialMediaController = require('../controllers/socialMedia.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { oauthLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// OAuth configuration status (no auth required for setup checks)
router.get('/oauth/status', socialMediaController.getOAuthStatus);

// OAuth initiation routes (require authentication + rate limiting)
router.get('/facebook/oauth', authenticate, oauthLimiter, socialMediaController.facebookOAuthInit);
router.get('/instagram/oauth', authenticate, oauthLimiter, socialMediaController.instagramOAuthInit);

// OAuth callback routes (rate limited - uses state validation for auth)
router.get('/facebook/callback', oauthLimiter, socialMediaController.facebookOAuthCallback);
router.get('/instagram/callback', oauthLimiter, socialMediaController.instagramOAuthCallback);

// All other routes require authentication
router.use(authenticate);

// Get all connected social accounts
router.get('/', socialMediaController.getSocialAccounts);

// Sync social account media
router.post('/:accountId/sync', socialMediaController.syncSocialAccount);

// Disconnect social account
router.post('/:accountId/disconnect', socialMediaController.disconnectSocialAccount);

module.exports = router;
