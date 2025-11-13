const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

class AWSService {
  constructor() {
    this.s3Bucket = process.env.AWS_S3_BUCKET;
    this.rekognitionCollectionId = process.env.AWS_REKOGNITION_COLLECTION_ID || 'orangeprivacy-faces';
  }

  // Initialize Rekognition collection
  async initializeRekognitionCollection() {
    try {
      // Check if collection exists
      const collections = await rekognition.listCollections().promise();

      if (!collections.CollectionIds.includes(this.rekognitionCollectionId)) {
        console.log(`Creating Rekognition collection: ${this.rekognitionCollectionId}`);
        await rekognition.createCollection({
          CollectionId: this.rekognitionCollectionId
        }).promise();
        console.log('Collection created successfully');
      } else {
        console.log('Rekognition collection already exists');
      }
    } catch (error) {
      console.error('Error initializing Rekognition collection:', error);
      throw error;
    }
  }

  // Upload file to S3
  async uploadToS3(file, key, isPublic = false) {
    try {
      const params = {
        Bucket: this.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256'
      };

      if (isPublic) {
        params.ACL = 'public-read';
      }

      const result = await s3.upload(params).promise();
      return {
        key: result.Key,
        url: result.Location,
        etag: result.ETag
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  // Get signed URL for private S3 object
  getSignedUrl(key, expiresIn = 3600) {
    try {
      return s3.getSignedUrl('getObject', {
        Bucket: this.s3Bucket,
        Key: key,
        Expires: expiresIn
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  // Delete file from S3
  async deleteFromS3(key) {
    try {
      await s3.deleteObject({
        Bucket: this.s3Bucket,
        Key: key
      }).promise();
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  // Index face in Rekognition collection
  async indexFace(s3Key, externalImageId) {
    try {
      const params = {
        CollectionId: this.rekognitionCollectionId,
        Image: {
          S3Object: {
            Bucket: this.s3Bucket,
            Name: s3Key
          }
        },
        ExternalImageId: externalImageId,
        DetectionAttributes: ['ALL'],
        MaxFaces: 1,
        QualityFilter: 'AUTO'
      };

      const result = await rekognition.indexFaces(params).promise();

      if (result.FaceRecords.length === 0) {
        throw new Error('No face detected in the image');
      }

      const faceRecord = result.FaceRecords[0];

      return {
        faceId: faceRecord.Face.FaceId,
        boundingBox: faceRecord.Face.BoundingBox,
        confidence: faceRecord.Face.Confidence,
        imageQuality: {
          brightness: faceRecord.FaceDetail.Quality.Brightness,
          sharpness: faceRecord.FaceDetail.Quality.Sharpness
        }
      };
    } catch (error) {
      console.error('Rekognition indexFace error:', error);
      throw error;
    }
  }

  // Search faces by image
  async searchFacesByImage(s3Key, threshold = 80, maxFaces = 10) {
    try {
      const params = {
        CollectionId: this.rekognitionCollectionId,
        Image: {
          S3Object: {
            Bucket: this.s3Bucket,
            Name: s3Key
          }
        },
        FaceMatchThreshold: threshold,
        MaxFaces: maxFaces
      };

      const result = await rekognition.searchFacesByImage(params).promise();

      return {
        matches: result.FaceMatches.map(match => ({
          faceId: match.Face.FaceId,
          externalImageId: match.Face.ExternalImageId,
          similarity: match.Similarity,
          confidence: match.Face.Confidence
        })),
        searchedFace: result.SearchedFaceBoundingBox
      };
    } catch (error) {
      console.error('Rekognition searchFacesByImage error:', error);
      throw error;
    }
  }

  // Search faces by face ID
  async searchFacesByFaceId(faceId, threshold = 80, maxFaces = 10) {
    try {
      const params = {
        CollectionId: this.rekognitionCollectionId,
        FaceId: faceId,
        FaceMatchThreshold: threshold,
        MaxFaces: maxFaces
      };

      const result = await rekognition.searchFaces(params).promise();

      return result.FaceMatches.map(match => ({
        faceId: match.Face.FaceId,
        externalImageId: match.Face.ExternalImageId,
        similarity: match.Similarity,
        confidence: match.Face.Confidence
      }));
    } catch (error) {
      console.error('Rekognition searchFaces error:', error);
      throw error;
    }
  }

  // Delete face from collection
  async deleteFace(faceId) {
    try {
      await rekognition.deleteFaces({
        CollectionId: this.rekognitionCollectionId,
        FaceIds: [faceId]
      }).promise();
    } catch (error) {
      console.error('Rekognition deleteFace error:', error);
      throw error;
    }
  }

  // Detect faces in an image (without indexing)
  async detectFaces(s3Key) {
    try {
      const params = {
        Image: {
          S3Object: {
            Bucket: this.s3Bucket,
            Name: s3Key
          }
        },
        Attributes: ['ALL']
      };

      const result = await rekognition.detectFaces(params).promise();

      return result.FaceDetails.map(face => ({
        boundingBox: face.BoundingBox,
        confidence: face.Confidence,
        quality: {
          brightness: face.Quality.Brightness,
          sharpness: face.Quality.Sharpness
        },
        pose: face.Pose,
        emotions: face.Emotions
      }));
    } catch (error) {
      console.error('Rekognition detectFaces error:', error);
      throw error;
    }
  }

  // Compare faces between two images
  async compareFaces(sourceS3Key, targetS3Key, similarityThreshold = 80) {
    try {
      const params = {
        SourceImage: {
          S3Object: {
            Bucket: this.s3Bucket,
            Name: sourceS3Key
          }
        },
        TargetImage: {
          S3Object: {
            Bucket: this.s3Bucket,
            Name: targetS3Key
          }
        },
        SimilarityThreshold: similarityThreshold
      };

      const result = await rekognition.compareFaces(params).promise();

      return {
        matches: result.FaceMatches.map(match => ({
          similarity: match.Similarity,
          boundingBox: match.Face.BoundingBox,
          confidence: match.Face.Confidence
        })),
        unmatchedFaces: result.UnmatchedFaces
      };
    } catch (error) {
      console.error('Rekognition compareFaces error:', error);
      throw error;
    }
  }
}

module.exports = new AWSService();
