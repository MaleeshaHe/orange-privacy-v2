const { SocialAccount, OAuthToken } = require('../models');
const socialMediaService = require('../services/socialMedia.service');
const axios = require('axios');
const crypto = require('crypto');

// Store OAuth state temporarily (in production, use Redis)
const oauthStateStore = new Map();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.expiresAt < now) {
      oauthStateStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

const getSocialAccounts = async (req, res) => {
  try {
    const socialAccounts = await SocialAccount.findAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['userId'] }
    });

    res.json({
      socialAccounts
    });
  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
};

// Check OAuth configuration status
const getOAuthStatus = async (req, res) => {
  try {
    const status = {
      facebook: {
        configured: !!(process.env.FACEBOOK_APP_ID &&
                      process.env.FACEBOOK_APP_SECRET &&
                      process.env.FACEBOOK_CALLBACK_URL),
        missingFields: []
      },
      instagram: {
        configured: !!(process.env.INSTAGRAM_CLIENT_ID &&
                      process.env.INSTAGRAM_CLIENT_SECRET &&
                      process.env.INSTAGRAM_CALLBACK_URL),
        missingFields: []
      }
    };

    // Identify missing fields
    if (!process.env.FACEBOOK_APP_ID) status.facebook.missingFields.push('FACEBOOK_APP_ID');
    if (!process.env.FACEBOOK_APP_SECRET) status.facebook.missingFields.push('FACEBOOK_APP_SECRET');
    if (!process.env.FACEBOOK_CALLBACK_URL) status.facebook.missingFields.push('FACEBOOK_CALLBACK_URL');

    if (!process.env.INSTAGRAM_CLIENT_ID) status.instagram.missingFields.push('INSTAGRAM_CLIENT_ID');
    if (!process.env.INSTAGRAM_CLIENT_SECRET) status.instagram.missingFields.push('INSTAGRAM_CLIENT_SECRET');
    if (!process.env.INSTAGRAM_CALLBACK_URL) status.instagram.missingFields.push('INSTAGRAM_CALLBACK_URL');

    res.json(status);
  } catch (error) {
    console.error('Get OAuth status error:', error);
    res.status(500).json({ error: 'Failed to check OAuth status' });
  }
};

const syncSocialAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    // Verify account belongs to user
    const socialAccount = await SocialAccount.findOne({
      where: { id: accountId, userId: req.user.id }
    });

    if (!socialAccount) {
      return res.status(404).json({ error: 'Social account not found' });
    }

    if (!socialAccount.isActive) {
      return res.status(400).json({ error: 'Social account is not active' });
    }

    const mediaItems = await socialMediaService.syncSocialMedia(accountId);

    res.json({
      message: 'Social media synced successfully',
      itemCount: mediaItems.length
    });
  } catch (error) {
    console.error('Sync social account error:', error);
    res.status(500).json({
      error: 'Failed to sync social account',
      details: error.message
    });
  }
};

const disconnectSocialAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    const socialAccount = await socialMediaService.disconnectSocialAccount(
      accountId,
      req.user.id
    );

    res.json({
      message: 'Social account disconnected successfully',
      socialAccount: socialAccount.toJSON()
    });
  } catch (error) {
    console.error('Disconnect social account error:', error);
    res.status(500).json({
      error: 'Failed to disconnect social account',
      details: error.message
    });
  }
};

// OAuth Flow - Facebook
const facebookOAuthInit = async (req, res) => {
  try {
    // Check configuration
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.status(503).json({
        error: 'Facebook OAuth is not configured',
        message: 'Administrator needs to configure Facebook OAuth credentials in backend environment variables.',
        missingConfig: {
          appId: !process.env.FACEBOOK_APP_ID,
          appSecret: !process.env.FACEBOOK_APP_SECRET
        }
      });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user ID (expires in 10 minutes)
    oauthStateStore.set(state, {
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
      state: state,
      scope: 'public_profile,email,user_photos',
      response_type: 'code'
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Facebook OAuth init error:', error);
    res.status(500).json({
      error: 'Failed to initiate Facebook OAuth',
      details: error.message
    });
  }
};

const facebookOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors from Facebook
    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          error_description || error
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Missing authorization code or state parameter'
        )}`
      );
    }

    // Verify state to prevent CSRF attacks
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Invalid or expired authorization request. Please try again.'
        )}`
      );
    }

    // Check if state has expired
    if (stateData.expiresAt < Date.now()) {
      oauthStateStore.delete(state);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Authorization request expired. Please try again.'
        )}`
      );
    }

    // Clean up used state
    oauthStateStore.delete(state);

    // Exchange authorization code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        code: code
      }
    });

    const { access_token } = tokenResponse.data;

    // Connect the social account
    const socialAccount = await socialMediaService.connectSocialAccount(
      stateData.userId,
      'facebook',
      access_token
    );

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social?success=${encodeURIComponent(
        'Facebook account connected successfully!'
      )}`
    );
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    let errorMessage = 'Failed to connect Facebook account';

    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(errorMessage)}`
    );
  }
};

// OAuth Flow - Instagram
const instagramOAuthInit = async (req, res) => {
  try {
    // Check configuration
    if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
      return res.status(503).json({
        error: 'Instagram OAuth is not configured',
        message: 'Administrator needs to configure Instagram OAuth credentials in backend environment variables.',
        missingConfig: {
          clientId: !process.env.INSTAGRAM_CLIENT_ID,
          clientSecret: !process.env.INSTAGRAM_CLIENT_SECRET
        }
      });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user ID (expires in 10 minutes)
    oauthStateStore.set(state, {
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
      state: state,
      scope: 'user_profile,user_media',
      response_type: 'code'
    });

    const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

    res.json({ authUrl });
  } catch (error) {
    console.error('Instagram OAuth init error:', error);
    res.status(500).json({
      error: 'Failed to initiate Instagram OAuth',
      details: error.message
    });
  }
};

const instagramOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors from Instagram
    if (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          error_description || error
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Missing authorization code or state parameter'
        )}`
      );
    }

    // Verify state to prevent CSRF attacks
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Invalid or expired authorization request. Please try again.'
        )}`
      );
    }

    // Check if state has expired
    if (stateData.expiresAt < Date.now()) {
      oauthStateStore.delete(state);
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(
          'Authorization request expired. Please try again.'
        )}`
      );
    }

    // Clean up used state
    oauthStateStore.delete(state);

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
        code: code
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Connect the social account
    const socialAccount = await socialMediaService.connectSocialAccount(
      stateData.userId,
      'instagram',
      access_token
    );

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social?success=${encodeURIComponent(
        'Instagram account connected successfully!'
      )}`
    );
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    let errorMessage = 'Failed to connect Instagram account';

    if (error.response?.data?.error_message) {
      errorMessage = error.response.data.error_message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(errorMessage)}`
    );
  }
};

module.exports = {
  getSocialAccounts,
  getOAuthStatus,
  syncSocialAccount,
  disconnectSocialAccount,
  facebookOAuthInit,
  facebookOAuthCallback,
  instagramOAuthInit,
  instagramOAuthCallback
};
