module.exports = (sequelize, DataTypes) => {
  const ScanResult = sequelize.define('ScanResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    scanJobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'scan_jobs',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    sourceUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'URL where the image was found'
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Direct URL to the image (if different from sourceUrl)'
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Thumbnail URL for display'
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Match confidence score (0-100)'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Provider that detected this match (e.g., aws-rekognition)'
    },
    providerScore: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Provider-specific scores and metadata'
    },
    sourceType: {
      type: DataTypes.ENUM('web', 'social_media'),
      defaultValue: 'web',
      allowNull: false
    },
    socialMediaItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'social_media_items',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'Link to social media item if source is social media'
    },
    isConfirmedByUser: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'User confirmation: true = "this is me", false = "not me", null = not reviewed'
    },
    boundingBox: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Face bounding box coordinates from recognition'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the match'
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
    tableName: 'scan_results',
    timestamps: true,
    indexes: [
      { fields: ['scanJobId'] },
      { fields: ['confidence'] },
      { fields: ['sourceType'] },
      { fields: ['socialMediaItemId'] },
      { fields: ['isConfirmedByUser'] }
    ]
  });

  return ScanResult;
};
