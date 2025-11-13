const { SocialAccount, OAuthToken } = require('../models');
const socialMediaService = require('../services/socialMedia.service');
const axios = require('axios');
const crypto = require('crypto');

// Store OAuth state temporarily (in production, use Redis)
const oauthStateStore = new Map();

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

const connectFacebook = async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const socialAccount = await socialMediaService.connectSocialAccount(
      req.user.id,
      'facebook',
      accessToken,
      refreshToken
    );

    res.status(201).json({
      message: 'Facebook account connected successfully',
      socialAccount: socialAccount.toJSON()
    });
  } catch (error) {
    console.error('Connect Facebook error:', error);
    res.status(500).json({
      error: 'Failed to connect Facebook account',
      details: error.message
    });
  }
};

const connectInstagram = async (req, res) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    const socialAccount = await socialMediaService.connectSocialAccount(
      req.user.id,
      'instagram',
      accessToken,
      refreshToken
    );

    res.status(201).json({
      message: 'Instagram account connected successfully',
      socialAccount: socialAccount.toJSON()
    });
  } catch (error) {
    console.error('Connect Instagram error:', error);
    res.status(500).json({
      error: 'Failed to connect Instagram account',
      details: error.message
    });
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
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_CALLBACK_URL) {
      return res.status(500).json({
        error: 'Facebook OAuth not configured. Please set FACEBOOK_APP_ID and FACEBOOK_CALLBACK_URL in .env'
      });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user ID (expires in 10 minutes)
    oauthStateStore.set(state, {
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Clean up expired states
    for (const [key, value] of oauthStateStore.entries()) {
      if (value.expiresAt < Date.now()) {
        oauthStateStore.delete(key);
      }
    }

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
    res.status(500).json({ error: 'Failed to initiate Facebook OAuth' });
  }
};

const facebookOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=Missing authorization code or state`);
    }

    // Verify state
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=Invalid or expired state`);
    }

    // Clean up used state
    oauthStateStore.delete(state);

    // Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        code: code
      }
    });

    const { access_token } = tokenResponse.data;

    // Connect the account
    const socialAccount = await socialMediaService.connectSocialAccount(
      stateData.userId,
      'facebook',
      access_token
    );

    res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?success=Facebook account connected successfully`);
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to connect Facebook account';
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(errorMessage)}`);
  }
};

// OAuth Flow - Instagram
const instagramOAuthInit = async (req, res) => {
  try {
    if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CALLBACK_URL) {
      return res.status(500).json({
        error: 'Instagram OAuth not configured. Please set INSTAGRAM_CLIENT_ID and INSTAGRAM_CALLBACK_URL in .env'
      });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state with user ID (expires in 10 minutes)
    oauthStateStore.set(state, {
      userId: req.user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Clean up expired states
    for (const [key, value] of oauthStateStore.entries()) {
      if (value.expiresAt < Date.now()) {
        oauthStateStore.delete(key);
      }
    }

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
    res.status(500).json({ error: 'Failed to initiate Instagram OAuth' });
  }
};

const instagramOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=Missing authorization code or state`);
    }

    // Verify state
    const stateData = oauthStateStore.get(state);
    if (!stateData) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=Invalid or expired state`);
    }

    // Clean up used state
    oauthStateStore.delete(state);

    // Exchange code for access token
    const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token',
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

    // Connect the account
    const socialAccount = await socialMediaService.connectSocialAccount(
      stateData.userId,
      'instagram',
      access_token
    );

    res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?success=Instagram account connected successfully`);
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    const errorMessage = error.response?.data?.error_message || error.message || 'Failed to connect Instagram account';
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/social?error=${encodeURIComponent(errorMessage)}`);
  }
};

module.exports = {
  getSocialAccounts,
  connectFacebook,
  connectInstagram,
  syncSocialAccount,
  disconnectSocialAccount,
  facebookOAuthInit,
  facebookOAuthCallback,
  instagramOAuthInit,
  instagramOAuthCallback
};
