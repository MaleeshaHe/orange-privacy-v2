module.exports = (sequelize, DataTypes) => {
  const SocialMediaItem = sequelize.define('SocialMediaItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    socialAccountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'social_accounts',
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
      comment: 'Media ID from the social media provider'
    },
    mediaType: {
      type: DataTypes.ENUM('photo', 'video', 'album'),
      allowNull: false
    },
    mediaUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Direct URL to the media'
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permalinkUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Permanent link to the post/media'
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isUserOwned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether user owns this media or is just tagged'
    },
    isTagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether user is tagged in this media'
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the media was posted on social platform'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata from the provider'
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
    tableName: 'social_media_items',
    timestamps: true,
    indexes: [
      { fields: ['socialAccountId'] },
      { fields: ['provider', 'providerId'], unique: true },
      { fields: ['isUserOwned'] },
      { fields: ['isTagged'] },
      { fields: ['postedAt'] }
    ]
  });

  return SocialMediaItem;
};
