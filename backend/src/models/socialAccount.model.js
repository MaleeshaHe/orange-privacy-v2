module.exports = (sequelize, DataTypes) => {
  const SocialAccount = sequelize.define('SocialAccount', {
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
    provider: {
      type: DataTypes.ENUM('facebook', 'instagram'),
      allowNull: false
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'User ID from the social media provider'
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profileUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    profilePictureUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this account is actively connected'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'OAuth permissions/scopes granted'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time we synced media from this account'
    },
    metadata: {
      type: DataTypes.JSON,
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
    tableName: 'social_accounts',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['provider', 'providerId'], unique: true },
      { fields: ['isActive'] }
    ]
  });

  return SocialAccount;
};
