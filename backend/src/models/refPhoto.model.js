module.exports = (sequelize, DataTypes) => {
  const RefPhoto = sequelize.define('RefPhoto', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    s3Key: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'S3 key for original image (encrypted) - null if privacy mode'
    },
    s3Url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'S3 URL for accessing the image - null if privacy mode'
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes'
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    rekognitionFaceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'AWS Rekognition Face ID in the collection'
    },
    faceEmbedding: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Face embedding vector for privacy mode'
    },
    photoType: {
      type: DataTypes.ENUM('frontal', 'side', 'other'),
      defaultValue: 'other',
      allowNull: false
    },
    qualityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Image quality score from Rekognition (0-100)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Inactive photos are kept for history but not used in scans'
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'ref_photos',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['rekognitionFaceId'] },
      { fields: ['isActive'] }
    ]
  });

  return RefPhoto;
};
