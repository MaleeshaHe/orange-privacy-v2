const Queue = require('bull');
const { ScanJob, RefPhoto, ScanResult } = require('../models');
const awsService = require('./aws.service');

// Create scan queue
const scanQueue = new Queue('scan-jobs', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Process scan jobs
scanQueue.process(async (job) => {
  const { scanJobId } = job.data;

  try {
    console.log(`Processing scan job: ${scanJobId}`);

    // Get scan job from database
    const scanJob = await ScanJob.findByPk(scanJobId);
    if (!scanJob) {
      throw new Error('Scan job not found');
    }

    // Update status to processing
    await scanJob.update({
      status: 'processing',
      startedAt: new Date(),
      progress: 0
    });

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

    // For MVP, we'll simulate web scanning
    // In production, this would involve:
    // 1. Crawling public web images (respecting robots.txt)
    // 2. Using search engines APIs
    // 3. Checking social media (if configured)

    const results = [];

    // Process social media if scanType includes it
    if (scanJob.scanType === 'social' || scanJob.scanType === 'combined') {
      await scanJob.update({ progress: 30 });
      // Social media scanning will be handled by social media service
      // For now, we'll skip this in the queue processor
    }

    // Simulate web scanning for MVP
    // In production, you would:
    // 1. Use a web crawler to find images
    // 2. Upload found images to S3 temporarily
    // 3. Use Rekognition to compare faces
    // 4. Store matches in ScanResult table

    // For now, we'll just mark as completed with placeholder logic
    await scanJob.update({ progress: 90 });

    // Calculate totals
    const totalMatches = await ScanResult.count({
      where: { scanJobId: scanJob.id }
    });

    // Mark as completed
    await scanJob.update({
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      totalMatchesFound: totalMatches,
      totalImagesScanned: 0 // Would be actual count in production
    });

    console.log(`Scan job ${scanJobId} completed successfully`);

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

module.exports = {
  scanQueue,
  addScanJob,
  getJobStatus
};
