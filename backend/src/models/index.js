const { Sequelize } = require('sequelize');
const config = require('../config/database.js');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user.model')(sequelize, Sequelize);
db.RefPhoto = require('./refPhoto.model')(sequelize, Sequelize);
db.ScanJob = require('./scanJob.model')(sequelize, Sequelize);
db.ScanResult = require('./scanResult.model')(sequelize, Sequelize);
db.SocialAccount = require('./socialAccount.model')(sequelize, Sequelize);
db.OAuthToken = require('./oauthToken.model')(sequelize, Sequelize);
db.SocialMediaItem = require('./socialMediaItem.model')(sequelize, Sequelize);

// Define associations
// User has many RefPhotos
db.User.hasMany(db.RefPhoto, { foreignKey: 'userId', as: 'refPhotos' });
db.RefPhoto.belongsTo(db.User, { foreignKey: 'userId' });

// User has many ScanJobs
db.User.hasMany(db.ScanJob, { foreignKey: 'userId', as: 'scanJobs' });
db.ScanJob.belongsTo(db.User, { foreignKey: 'userId' });

// ScanJob has many ScanResults
db.ScanJob.hasMany(db.ScanResult, { foreignKey: 'scanJobId', as: 'results' });
db.ScanResult.belongsTo(db.ScanJob, { foreignKey: 'scanJobId', as: 'scanJob' });

// User has many SocialAccounts
db.User.hasMany(db.SocialAccount, { foreignKey: 'userId', as: 'socialAccounts' });
db.SocialAccount.belongsTo(db.User, { foreignKey: 'userId' });

// SocialAccount has one OAuthToken
db.SocialAccount.hasOne(db.OAuthToken, { foreignKey: 'socialAccountId', as: 'token' });
db.OAuthToken.belongsTo(db.SocialAccount, { foreignKey: 'socialAccountId' });

// SocialAccount has many SocialMediaItems
db.SocialAccount.hasMany(db.SocialMediaItem, { foreignKey: 'socialAccountId', as: 'mediaItems' });
db.SocialMediaItem.belongsTo(db.SocialAccount, { foreignKey: 'socialAccountId' });

// ScanResult can reference a SocialMediaItem
db.ScanResult.belongsTo(db.SocialMediaItem, { foreignKey: 'socialMediaItemId', as: 'socialMediaItem' });
db.SocialMediaItem.hasMany(db.ScanResult, { foreignKey: 'socialMediaItemId' });

module.exports = db;
