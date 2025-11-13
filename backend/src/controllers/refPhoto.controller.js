const { RefPhoto } = require('../models');
const awsService = require('../services/aws.service');
const { v4: uuidv4 } = require('uuid');

const uploadRefPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { photoType } = req.body;

    // Check if user has biometric consent
    if (!req.user.biometricConsentGiven) {
      return res.status(403).json({
        error: 'Biometric consent required',
        message: 'You must give consent for biometric scanning before uploading reference photos'
      });
    }

    // Check if user already has max reference photos
    const existingPhotos = await RefPhoto.count({
      where: { userId: req.user.id, isActive: true }
    });

    const maxPhotos = parseInt(process.env.MAX_REFERENCE_PHOTOS || '3');
    if (existingPhotos >= maxPhotos) {
      return res.status(400).json({
        error: 'Maximum reference photos reached',
        message: `You can only have up to ${maxPhotos} active reference photos`
      });
    }

    // Validate image dimensions
    const minWidth = parseInt(process.env.MIN_IMAGE_WIDTH || '640');
    const minHeight = parseInt(process.env.MIN_IMAGE_HEIGHT || '480');

    // Note: In production, you'd want to use a library like 'sharp' to get actual dimensions
    // For now, we'll skip this validation and let Rekognition handle it

    const file = req.file;
    const s3Key = `reference-photos/${req.user.id}/${uuidv4()}-${file.originalname}`;

    // Upload to S3 (only if not in privacy mode)
    let s3Url = null;
    if (req.user.privacyMode === 'standard') {
      const s3Result = await awsService.uploadToS3(file, s3Key, false);
      s3Url = s3Result.url;
    } else {
      // In privacy mode, still upload temporarily for indexing
      await awsService.uploadToS3(file, s3Key, false);
    }

    // Index face in Rekognition
    const externalImageId = `user-${req.user.id}-${uuidv4()}`;
    const rekognitionResult = await awsService.indexFace(s3Key, externalImageId);

    // Create database record
    const refPhoto = await RefPhoto.create({
      userId: req.user.id,
      s3Key: req.user.privacyMode === 'standard' ? s3Key : null,
      s3Url: req.user.privacyMode === 'standard' ? s3Url : null,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      width: 0, // TODO: Get actual dimensions
      height: 0, // TODO: Get actual dimensions
      rekognitionFaceId: rekognitionResult.faceId,
      photoType: photoType || 'other',
      qualityScore: rekognitionResult.confidence,
      uploadedAt: new Date()
    });

    // If privacy mode, delete the original from S3 after indexing
    if (req.user.privacyMode === 'privacy') {
      await awsService.deleteFromS3(s3Key);
    }

    res.status(201).json({
      message: 'Reference photo uploaded successfully',
      refPhoto: refPhoto.toJSON()
    });
  } catch (error) {
    console.error('Upload reference photo error:', error);

    // Handle specific Rekognition errors
    if (error.message.includes('No face detected')) {
      return res.status(400).json({
        error: 'No face detected',
        message: 'Please upload an image with a clearly visible face'
      });
    }

    res.status(500).json({
      error: 'Failed to upload reference photo',
      details: error.message
    });
  }
};

const getRefPhotos = async (req, res) => {
  try {
    const refPhotos = await RefPhoto.findAll({
      where: { userId: req.user.id },
      order: [['uploadedAt', 'DESC']]
    });

    // Generate signed URLs for standard mode photos
    const photosWithUrls = refPhotos.map(photo => {
      const photoData = photo.toJSON();
      if (photo.s3Key && req.user.privacyMode === 'standard') {
        photoData.signedUrl = awsService.getSignedUrl(photo.s3Key, 3600);
      }
      return photoData;
    });

    res.json({
      refPhotos: photosWithUrls
    });
  } catch (error) {
    console.error('Get reference photos error:', error);
    res.status(500).json({ error: 'Failed to fetch reference photos' });
  }
};

const deleteRefPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const refPhoto = await RefPhoto.findOne({
      where: { id: photoId, userId: req.user.id }
    });

    if (!refPhoto) {
      return res.status(404).json({ error: 'Reference photo not found' });
    }

    // Delete from Rekognition collection
    if (refPhoto.rekognitionFaceId) {
      try {
        await awsService.deleteFace(refPhoto.rekognitionFaceId);
      } catch (error) {
        console.error('Failed to delete face from Rekognition:', error);
        // Continue with deletion even if Rekognition fails
      }
    }

    // Delete from S3
    if (refPhoto.s3Key) {
      try {
        await awsService.deleteFromS3(refPhoto.s3Key);
      } catch (error) {
        console.error('Failed to delete from S3:', error);
        // Continue with deletion even if S3 fails
      }
    }

    // Delete from database
    await refPhoto.destroy();

    res.json({
      message: 'Reference photo deleted successfully'
    });
  } catch (error) {
    console.error('Delete reference photo error:', error);
    res.status(500).json({ error: 'Failed to delete reference photo' });
  }
};

const deactivateRefPhoto = async (req, res) => {
  try {
    const { photoId } = req.params;

    const refPhoto = await RefPhoto.findOne({
      where: { id: photoId, userId: req.user.id }
    });

    if (!refPhoto) {
      return res.status(404).json({ error: 'Reference photo not found' });
    }

    await refPhoto.update({ isActive: false });

    res.json({
      message: 'Reference photo deactivated successfully',
      refPhoto: refPhoto.toJSON()
    });
  } catch (error) {
    console.error('Deactivate reference photo error:', error);
    res.status(500).json({ error: 'Failed to deactivate reference photo' });
  }
};

module.exports = {
  uploadRefPhoto,
  getRefPhotos,
  deleteRefPhoto,
  deactivateRefPhoto
};
