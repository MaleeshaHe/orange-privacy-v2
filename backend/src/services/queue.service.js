const Queue = require('bull');
const { ScanJob, RefPhoto, ScanResult } = require('../models');
const awsService = require('./aws.service');
const webCrawlerService = require('./webCrawler.service');
const socialMediaService = require('./socialMedia.service');

// Create Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // Required for Bull
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Add password if provided
if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

// Enable TLS for hosted Redis services (Upstash, Redis Cloud, etc.)
// Can be explicitly set via REDIS_TLS env var or auto-detected
const explicitTLS = process.env.REDIS_TLS === 'true';
const hostedRedisIndicators = ['upstash.io', 'redislabs.com', 'redis.cloud', 'amazonaws.com'];
const isHostedRedis = hostedRedisIndicators.some(domain => redisConfig.host.includes(domain)) || redisConfig.port !== 6379;
const isLocalhost = redisConfig.host.includes('localhost') || redisConfig.host.includes('127.0.0.1');

if ((explicitTLS || (isHostedRedis && !isLocalhost)) && !isLocalhost) {
  redisConfig.tls = {
    // SECURITY: Always verify TLS certificates in production
    // Set REDIS_TLS_REJECT_UNAUTHORIZED=false ONLY for development/testing with self-signed certs
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
  };
  console.log('📡 TLS enabled for Redis connection');
}

// Create scan queue
const scanQueue = new Queue('scan-jobs', {
  redis: redisConfig
});

// Process scan jobs
scanQueue.process(async (job) => {
  const { scanJobId } = job.data;

  try {
    console.log(`\n🚀 STARTING SCAN JOB: ${scanJobId}`);

    // Get scan job from database
    const scanJob = await ScanJob.findByPk(scanJobId);
    if (!scanJob) {
      throw new Error('Scan job not found');
    }

    console.log(`   User ID: ${scanJob.userId}`);
    console.log(`   Scan Type: ${scanJob.scanType}`);
    console.log(`   Confidence Threshold: ${scanJob.confidenceThreshold}%`);

    // Update status to processing
    await scanJob.update({
      status: 'processing',
      startedAt: new Date(),
      progress: 0
    });

    console.log(`   Status updated to: processing\n`);

    // Get user's active reference photos
    const refPhotos = await RefPhoto.findAll({
      where: {
        userId: scanJob.userId,
        isActive: true
      }
    });

    if (refPhotos.length === 0) {
      throw new Error('No active reference photos found');
    }

    // Update progress
    await scanJob.update({ progress: 10 });

    // Get Rekognition face IDs for matching
    const refPhotoFaceIds = refPhotos
      .filter(photo => photo.rekognitionFaceId)
      .map(photo => photo.rekognitionFaceId);

    if (refPhotoFaceIds.length === 0) {
      throw new Error('No indexed faces found in reference photos');
    }

    const results = [];

    // Process web scanning if scanType includes it
    if (scanJob.scanType === 'web' || scanJob.scanType === 'combined') {
      await scanJob.update({ progress: 20 });
      console.log(`Starting web scan for job ${scanJobId}`);

      try {
        // Call web crawler service
        await webCrawlerService.scanWeb(
          scanJobId,
          refPhotoFaceIds,
          scanJob.confidenceThreshold
        );
        await scanJob.update({ progress: 50 });
      } catch (error) {
        console.error('Web scanning error:', error);
        // Continue with other scan types even if web scan fails
      }
    }

    // Process social media if scanType includes it
    if (scanJob.scanType === 'social' || scanJob.scanType === 'combined') {
      await scanJob.update({ progress: 60 });
      console.log(`Starting social media scan for job ${scanJobId}`);

      try {
        // Get user's social accounts
        const { SocialAccount } = require('../models');
        const socialAccounts = await SocialAccount.findAll({
          where: { userId: scanJob.userId, isActive: true }
        });

        for (const account of socialAccounts) {
          await socialMediaService.scanSocialMedia(
            account.id,
            refPhotoFaceIds,
            scanJob.confidenceThreshold,
            scanJobId
          );
        }
        await scanJob.update({ progress: 90 });
      } catch (error) {
        console.error('Social media scanning error:', error);
        // Continue even if social scan fails
      }
    }

    await scanJob.update({ progress: 95 });

    // Calculate totals
    const totalMatches = await ScanResult.count({
      where: { scanJobId: scanJob.id }
    });

    console.log(`\n📊 SCAN COMPLETION SUMMARY:`);
    console.log(`   Job ID: ${scanJobId}`);
    console.log(`   Total Matches Found: ${totalMatches}`);
    console.log(`   Saving to database...`);

    // Mark as completed
    await scanJob.update({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      totalMatchesFound: totalMatches,
      totalImagesScanned: 0 // Would be actual count in production
    });

    console.log(`✅ Scan job ${scanJobId} completed successfully`);
    console.log(`   Status: completed`);
    console.log(`   Matches: ${totalMatches}`);
    console.log(`   Results should now be visible in frontend\n`);

    return { success: true, scanJobId, totalMatches };
  } catch (error) {
    console.error(`Scan job ${scanJobId} failed:`, error);

    // Update scan job with error
    const scanJob = await ScanJob.findByPk(scanJobId);
    if (scanJob) {
      await scanJob.update({
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    }

    throw error;
  }
});

// Redis connection event handlers
scanQueue.on('error', (error) => {
  console.error('❌ Redis Queue Error:', error.message);
});

scanQueue.on('ready', () => {
  console.log('✅ Redis connection established - Queue is ready');
});

scanQueue.on('stalled', (job) => {
  console.warn(`⚠️  Job ${job.id} has stalled`);
});

// Queue event handlers
scanQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

scanQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err.message);
});

scanQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

// Function to add a scan job to the queue
const addScanJob = async (scanJobId) => {
  try {
    const job = await scanQueue.add(
      { scanJobId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: false,
        removeOnFail: false
      }
    );

    return job;
  } catch (error) {
    console.error('Error adding scan job to queue:', error);
    throw error;
  }
};

// Get job status
const getJobStatus = async (jobId) => {
  try {
    const job = await scanQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    throw error;
  }
};

// Check Redis connection health
const checkRedisHealth = async () => {
  try {
    const client = await scanQueue.client;
    await client.ping();

    const jobCounts = await scanQueue.getJobCounts();

    return {
      connected: true,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      jobCounts: jobCounts
    };
  } catch (error) {
    return {
      connected: false,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      error: error.message
    };
  }
};

module.exports = {
  scanQueue,
  addScanJob,
  getJobStatus,
  checkRedisHealth
};
