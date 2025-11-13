const axios = require('axios');
const { SocialAccount, OAuthToken, SocialMediaItem, ScanResult } = require('../models');
const awsService = require('./aws.service');
const { v4: uuidv4 } = require('uuid');

class SocialMediaService {
  // Facebook Graph API methods
  async getFacebookUserProfile(accessToken) {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me', {
        params: {
          fields: 'id,name,picture',
          access_token: accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('Facebook API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook profile');
    }
  }

  async getFacebookPhotos(accessToken, userId) {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}/photos`, {
        params: {
          type: 'uploaded',
          fields: 'id,source,images,picture,created_time,link',
          access_token: accessToken,
          limit: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Facebook photos API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook photos');
    }
  }

  async getFacebookTaggedPhotos(accessToken, userId) {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${userId}/photos`, {
        params: {
          type: 'tagged',
          fields: 'id,source,images,picture,created_time,link',
          access_token: accessToken,
          limit: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Facebook tagged photos API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook tagged photos');
    }
  }

  // Instagram Graph API methods
  async getInstagramUserProfile(accessToken) {
    try {
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'id,username,account_type',
          access_token: accessToken
        }
      });

      return response.data;
    } catch (error) {
      console.error('Instagram API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram profile');
    }
  }

  async getInstagramMedia(accessToken, userId) {
    try {
      const response = await axios.get(`https://graph.instagram.com/${userId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
          access_token: accessToken,
          limit: 100
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Instagram media API error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Instagram media');
    }
  }

  // Connect social account
  async connectSocialAccount(userId, provider, accessToken, refreshToken = null) {
    try {
      let profile;
      let providerId;
      let username;
      let profileUrl;

      if (provider === 'facebook') {
        profile = await this.getFacebookUserProfile(accessToken);
        providerId = profile.id;
        username = profile.name;
        profileUrl = `https://facebook.com/${profile.id}`;
      } else if (provider === 'instagram') {
        profile = await this.getInstagramUserProfile(accessToken);
        providerId = profile.id;
        username = profile.username;
        profileUrl = `https://instagram.com/${profile.username}`;
      } else {
        throw new Error('Unsupported provider');
      }

      // Check if account already exists
      let socialAccount = await SocialAccount.findOne({
        where: { provider, providerId }
      });

      if (socialAccount) {
        // Update existing account
        await socialAccount.update({
          userId,
          username,
          displayName: username,
          profileUrl,
          isActive: true,
          lastSyncedAt: null
        });
      } else {
        // Create new account
        socialAccount = await SocialAccount.create({
          userId,
          provider,
          providerId,
          username,
          displayName: username,
          profileUrl,
          isActive: true
        });
      }

      // Store OAuth token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60); // Default 60 days expiry

      await OAuthToken.upsert({
        socialAccountId: socialAccount.id,
        accessToken,
        refreshToken,
        expiresAt
      });

      return socialAccount;
    } catch (error) {
      console.error('Connect social account error:', error);
      throw error;
    }
  }

  // Sync media from social account
  async syncSocialMedia(socialAccountId) {
    try {
      const socialAccount = await SocialAccount.findByPk(socialAccountId, {
        include: [{ model: OAuthToken, as: 'token' }]
      });

      if (!socialAccount || !socialAccount.token) {
        throw new Error('Social account or token not found');
      }

      const accessToken = socialAccount.token.accessToken;
      let mediaItems = [];

      if (socialAccount.provider === 'facebook') {
        const ownedPhotos = await this.getFacebookPhotos(accessToken, socialAccount.providerId);
        const taggedPhotos = await this.getFacebookTaggedPhotos(accessToken, socialAccount.providerId);

        mediaItems = [
          ...ownedPhotos.map(photo => ({
            providerId: photo.id,
            mediaType: 'photo',
            mediaUrl: photo.source,
            thumbnailUrl: photo.picture,
            permalinkUrl: photo.link,
            isUserOwned: true,
            isTagged: false,
            postedAt: photo.created_time
          })),
          ...taggedPhotos.map(photo => ({
            providerId: photo.id,
            mediaType: 'photo',
            mediaUrl: photo.source,
            thumbnailUrl: photo.picture,
            permalinkUrl: photo.link,
            isUserOwned: false,
            isTagged: true,
            postedAt: photo.created_time
          }))
        ];
      } else if (socialAccount.provider === 'instagram') {
        const media = await this.getInstagramMedia(accessToken, socialAccount.providerId);

        mediaItems = media.filter(m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM').map(m => ({
          providerId: m.id,
          mediaType: m.media_type === 'VIDEO' ? 'video' : 'photo',
          mediaUrl: m.media_url,
          thumbnailUrl: m.thumbnail_url || m.media_url,
          permalinkUrl: m.permalink,
          caption: m.caption,
          isUserOwned: true,
          isTagged: false,
          postedAt: m.timestamp
        }));
      }

      // Store media items in database
      const savedItems = [];
      for (const item of mediaItems) {
        const [mediaItem] = await SocialMediaItem.findOrCreate({
          where: {
            socialAccountId: socialAccount.id,
            provider: socialAccount.provider,
            providerId: item.providerId
          },
          defaults: {
            socialAccountId: socialAccount.id,
            provider: socialAccount.provider,
            ...item
          }
        });
        savedItems.push(mediaItem);
      }

      // Update last synced time
      await socialAccount.update({ lastSyncedAt: new Date() });

      return savedItems;
    } catch (error) {
      console.error('Sync social media error:', error);
      throw error;
    }
  }

  // Scan social media for faces
  async scanSocialMedia(socialAccountId, refPhotoFaceIds, confidenceThreshold, scanJobId) {
    try {
      const mediaItems = await SocialMediaItem.findAll({
        where: {
          socialAccountId,
          mediaType: 'photo'
        }
      });

      const matches = [];

      for (const mediaItem of mediaItems) {
        try {
          // Download image temporarily to S3
          const imageResponse = await axios.get(mediaItem.mediaUrl, {
            responseType: 'arraybuffer'
          });

          const s3Key = `temp/social-scan/${uuidv4()}.jpg`;
          await awsService.uploadToS3(
            {
              buffer: Buffer.from(imageResponse.data),
              mimetype: 'image/jpeg'
            },
            s3Key,
            false
          );

          // Search for faces in the image
          const searchResult = await awsService.searchFacesByImage(s3Key, confidenceThreshold);

          // Check if any of the user's reference photos match
          for (const match of searchResult.matches) {
            if (refPhotoFaceIds.includes(match.faceId)) {
              // Create scan result
              const scanResult = await ScanResult.create({
                scanJobId,
                sourceUrl: mediaItem.permalinkUrl,
                imageUrl: mediaItem.mediaUrl,
                thumbnailUrl: mediaItem.thumbnailUrl,
                confidence: match.similarity,
                provider: 'aws-rekognition',
                providerScore: match,
                sourceType: 'social_media',
                socialMediaItemId: mediaItem.id,
                boundingBox: searchResult.searchedFace,
                metadata: {
                  caption: mediaItem.caption,
                  postedAt: mediaItem.postedAt,
                  isUserOwned: mediaItem.isUserOwned,
                  isTagged: mediaItem.isTagged
                }
              });

              matches.push(scanResult);
            }
          }

          // Clean up temporary S3 file
          await awsService.deleteFromS3(s3Key);
        } catch (error) {
          console.error(`Error scanning media item ${mediaItem.id}:`, error);
          // Continue with next item
        }
      }

      return matches;
    } catch (error) {
      console.error('Scan social media error:', error);
      throw error;
    }
  }

  // Disconnect social account
  async disconnectSocialAccount(socialAccountId, userId) {
    try {
      const socialAccount = await SocialAccount.findOne({
        where: { id: socialAccountId, userId }
      });

      if (!socialAccount) {
        throw new Error('Social account not found');
      }

      await socialAccount.update({ isActive: false });

      return socialAccount;
    } catch (error) {
      console.error('Disconnect social account error:', error);
      throw error;
    }
  }
}

module.exports = new SocialMediaService();
