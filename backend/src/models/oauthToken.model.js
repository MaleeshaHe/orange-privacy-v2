module.exports = (sequelize, DataTypes) => {
  const OAuthToken = sequelize.define('OAuthToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    socialAccountId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'social_accounts',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Encrypted OAuth access token'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted OAuth refresh token'
    },
    tokenType: {
      type: DataTypes.STRING,
      defaultValue: 'Bearer'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Token expiration timestamp'
    },
    scope: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'OAuth scopes granted'
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
    tableName: 'oauth_tokens',
    timestamps: true,
    indexes: [
      { fields: ['socialAccountId'] },
      { fields: ['expiresAt'] }
    ]
  });

  return OAuthToken;
};
