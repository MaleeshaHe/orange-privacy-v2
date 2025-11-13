module.exports = (sequelize, DataTypes) => {
  const ScanJob = sequelize.define('ScanJob', {
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
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'queued',
      allowNull: false
    },
    scanType: {
      type: DataTypes.ENUM('web', 'social', 'combined'),
      defaultValue: 'web',
      allowNull: false,
      comment: 'web: public web scan, social: social media only, combined: both'
    },
    confidenceThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Minimum confidence threshold for this scan'
    },
    totalImagesScanned: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalMatchesFound: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Scan progress percentage (0-100)'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Primary provider used (e.g., aws-rekognition)'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional scan configuration and metadata'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
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
    tableName: 'scan_jobs',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  return ScanJob;
};
