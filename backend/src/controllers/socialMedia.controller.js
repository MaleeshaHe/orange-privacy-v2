const { SocialAccount, OAuthToken } = require('../models');
const socialMediaService = require('../services/socialMedia.service');

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

module.exports = {
  getSocialAccounts,
  connectFacebook,
  connectInstagram,
  syncSocialAccount,
  disconnectSocialAccount
};
