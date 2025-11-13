const encryptionService = require('../services/encryption.service');

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
      comment: 'Encrypted OAuth access token',
      // Virtual getter to decrypt token when accessed
      get() {
        const encrypted = this.getDataValue('accessToken');
        if (!encrypted) return null;

        try {
          // Only decrypt if it appears to be encrypted
          if (encryptionService.isEncrypted(encrypted)) {
            return encryptionService.decrypt(encrypted);
          }
          // Return as-is if not encrypted (backwards compatibility during migration)
          return encrypted;
        } catch (error) {
          console.error('Error decrypting access token:', error.message);
          // Return null on decryption failure for security
          return null;
        }
      },
      // Virtual setter to encrypt token when set
      set(value) {
        if (!value) {
          this.setDataValue('accessToken', null);
          return;
        }

        try {
          // Only encrypt if not already encrypted
          if (!encryptionService.isEncrypted(value)) {
            const encrypted = encryptionService.encrypt(value);
            this.setDataValue('accessToken', encrypted);
          } else {
            // Already encrypted, store as-is
            this.setDataValue('accessToken', value);
          }
        } catch (error) {
          console.error('Error encrypting access token:', error.message);
          throw new Error('Failed to encrypt access token');
        }
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted OAuth refresh token',
      // Virtual getter to decrypt token when accessed
      get() {
        const encrypted = this.getDataValue('refreshToken');
        if (!encrypted) return null;

        try {
          // Only decrypt if it appears to be encrypted
          if (encryptionService.isEncrypted(encrypted)) {
            return encryptionService.decrypt(encrypted);
          }
          // Return as-is if not encrypted (backwards compatibility during migration)
          return encrypted;
        } catch (error) {
          console.error('Error decrypting refresh token:', error.message);
          // Return null on decryption failure for security
          return null;
        }
      },
      // Virtual setter to encrypt token when set
      set(value) {
        if (!value) {
          this.setDataValue('refreshToken', null);
          return;
        }

        try {
          // Only encrypt if not already encrypted
          if (!encryptionService.isEncrypted(value)) {
            const encrypted = encryptionService.encrypt(value);
            this.setDataValue('refreshToken', encrypted);
          } else {
            // Already encrypted, store as-is
            this.setDataValue('refreshToken', value);
          }
        } catch (error) {
          console.error('Error encrypting refresh token:', error.message);
          throw new Error('Failed to encrypt refresh token');
        }
      }
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
    ],
    hooks: {
      /**
       * Hook: Before validation
       * Ensures tokens are encrypted before validation
       */
      beforeValidate: (instance) => {
        // Encryption happens in setters, just ensure they're set
        if (instance.changed('accessToken') && instance.accessToken) {
          // Trigger setter by re-setting the value
          const token = instance.getDataValue('accessToken');
          if (token && !encryptionService.isEncrypted(token)) {
            instance.accessToken = token;
          }
        }
        if (instance.changed('refreshToken') && instance.refreshToken) {
          const token = instance.getDataValue('refreshToken');
          if (token && !encryptionService.isEncrypted(token)) {
            instance.refreshToken = token;
          }
        }
      }
    }
  });

  /**
   * Instance method: Get decrypted access token
   * Provides explicit method to get decrypted token
   */
  OAuthToken.prototype.getDecryptedAccessToken = function() {
    return this.accessToken; // Getter handles decryption
  };

  /**
   * Instance method: Get decrypted refresh token
   * Provides explicit method to get decrypted token
   */
  OAuthToken.prototype.getDecryptedRefreshToken = function() {
    return this.refreshToken; // Getter handles decryption
  };

  /**
   * Instance method: Check if token is expired
   */
  OAuthToken.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  };

  return OAuthToken;
};
