const axios = require('axios');
const { ScanJob, ScanResult, RefPhoto } = require('../models');
const awsService = require('./aws.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Web Crawler Service for scanning public web images
 *
 * MODES:
 * 1. Demo Mode - Creates sample scan results for testing (default when no API keys configured)
 * 2. Google Custom Search API - Uses Google's API for reverse image search
 * 3. Bing Image Search API - Uses Microsoft's API for image search
 */

class WebCrawlerService {
  constructor() {
    this.userAgent = 'OrangePrivacyBot/1.0 (Privacy Scanner; +https://orangeprivacy.com/bot)';
    this.demoMode = !process.env.GOOGLE_API_KEY && !process.env.BING_SEARCH_API_KEY;
  }

  /**
   * Scan public web for face matches
   * @param {string} scanJobId - The scan job ID
   * @param {Array} refPhotoFaceIds - Array of Rekognition face IDs to match
   * @param {number} confidenceThreshold - Minimum confidence for matches
   */
  async scanWeb(scanJobId, refPhotoFaceIds, confidenceThreshold) {
    const scanJob = await ScanJob.findByPk(scanJobId);
    if (!scanJob) throw new Error('Scan job not found');

    console.log(`Starting web scan for job ${scanJobId} (${this.demoMode ? 'DEMO MODE' : 'API MODE'})`);

    try {
      if (this.demoMode) {
        // Demo mode - create sample results for testing
        await this.runDemoScan(scanJobId, confidenceThreshold);
      } else if (process.env.GOOGLE_API_KEY) {
        // Use Google Custom Search API
        await this.scanUsingGoogleSearch(scanJobId, refPhotoFaceIds, confidenceThreshold);
      } else if (process.env.BING_SEARCH_API_KEY) {
        // Use Bing Image Search API
        await this.scanUsingBingSearch(scanJobId, refPhotoFaceIds, confidenceThreshold);
      }

      console.log(`Web scan completed for job ${scanJobId}`);
    } catch (error) {
      console.error('Web scan error:', error);
      throw error;
    }
  }

  /**
   * Demo Mode - Creates sample scan results for testing
   */
  async runDemoScan(scanJobId, confidenceThreshold) {
    console.log('Running demo web scan...');

    const scanJob = await ScanJob.findByPk(scanJobId);

    // Sample image URLs from public sources (placeholder images)
    const sampleResults = [
      {
        sourceUrl: 'https://example.com/photo1',
        imageUrl: 'https://via.placeholder.com/400x400/FF6B35/FFFFFF?text=Demo+Match+1',
        confidence: 92.5,
      },
      {
        sourceUrl: 'https://example.com/photo2',
        imageUrl: 'https://via.placeholder.com/400x400/004E89/FFFFFF?text=Demo+Match+2',
        confidence: 88.3,
      },
      {
        sourceUrl: 'https://example.com/photo3',
        imageUrl: 'https://via.placeholder.com/400x400/F77F00/FFFFFF?text=Demo+Match+3',
        confidence: 85.7,
      },
      {
        sourceUrl: 'https://example.com/photo4',
        imageUrl: 'https://via.placeholder.com/400x400/06A77D/FFFFFF?text=Demo+Match+4',
        confidence: 78.9,
      },
      {
        sourceUrl: 'https://example.com/photo5',
        imageUrl: 'https://via.placeholder.com/400x400/D62828/FFFFFF?text=Demo+Match+5',
        confidence: 72.1,
      },
    ];

    // Filter by confidence threshold
    const filteredResults = sampleResults.filter(r => r.confidence >= confidenceThreshold);

    // Create scan results
    for (const result of filteredResults) {
      await ScanResult.create({
        scanJobId,
        sourceUrl: result.sourceUrl,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.imageUrl,
        confidence: result.confidence,
        provider: 'demo-mode',
        providerScore: { similarity: result.confidence, mode: 'demo' },
        sourceType: 'web',
        metadata: {
          demoMode: true,
          scannedAt: new Date(),
          note: 'This is a demo result. Configure Google or Bing API keys for real scanning.'
        }
      });

      // Update progress
      await scanJob.update({
        progress: Math.min(90, scanJob.progress + 15),
        totalImagesScanned: scanJob.totalImagesScanned + 1
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Demo scan created ${filteredResults.length} sample results`);
  }

  /**
   * Scan using Google Custom Search API
   */
  async scanUsingGoogleSearch(scanJobId, refPhotoFaceIds, confidenceThreshold) {
    const scanJob = await ScanJob.findByPk(scanJobId);

    // Get user's reference photos
    const refPhotos = await RefPhoto.findAll({
      where: { userId: scanJob.userId, isActive: true }
    });

    if (refPhotos.length === 0) {
      throw new Error('No active reference photos found');
    }

    console.log(`Scanning with ${refPhotos.length} reference photos using Google Search`);

    for (const refPhoto of refPhotos) {
      try {
        // Update progress
        await scanJob.update({
          progress: Math.min(90, scanJob.progress + 10)
        });

        // Search for similar images using Google Custom Search
        const searchResults = await this.searchGoogleImages(refPhoto.signedUrl || refPhoto.s3Url);

        // Process each found image
        for (const searchResult of searchResults) {
          try {
            // Extract image URL from search result
            const imageUrl = searchResult.link;
            const sourceUrl = searchResult.image?.contextLink || searchResult.link;

            if (!imageUrl) continue;

            // Download and analyze the image
            await this.analyzeWebImage(
              imageUrl,
              sourceUrl,
              scanJobId,
              refPhotoFaceIds,
              confidenceThreshold
            );

          } catch (error) {
            console.error(`Error processing search result:`, error.message);
          }
        }

      } catch (error) {
        console.error(`Error scanning with reference photo ${refPhoto.id}:`, error.message);
      }
    }
  }

  /**
   * Scan using Bing Image Search API
   */
  async scanUsingBingSearch(scanJobId, refPhotoFaceIds, confidenceThreshold) {
    const scanJob = await ScanJob.findByPk(scanJobId);

    // Get user's reference photos
    const refPhotos = await RefPhoto.findAll({
      where: { userId: scanJob.userId, isActive: true }
    });

    if (refPhotos.length === 0) {
      throw new Error('No active reference photos found');
    }

    console.log(`Scanning with ${refPhotos.length} reference photos using Bing Search`);

    for (const refPhoto of refPhotos) {
      try {
        // Update progress
        await scanJob.update({
          progress: Math.min(90, scanJob.progress + 10)
        });

        // Search for similar images using Bing
        const searchResults = await this.searchBingImages(refPhoto.signedUrl || refPhoto.s3Url);

        // Process each found image
        for (const searchResult of searchResults) {
          try {
            const imageUrl = searchResult.contentUrl;
            const sourceUrl = searchResult.hostPageUrl || searchResult.contentUrl;

            if (!imageUrl) continue;

            // Download and analyze the image
            await this.analyzeWebImage(
              imageUrl,
              sourceUrl,
              scanJobId,
              refPhotoFaceIds,
              confidenceThreshold
            );

          } catch (error) {
            console.error(`Error processing search result:`, error.message);
          }
        }

      } catch (error) {
        console.error(`Error scanning with reference photo ${refPhoto.id}:`, error.message);
      }
    }
  }

  /**
   * Search Google Custom Search API for similar images
   * Requires: GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID
   */
  async searchGoogleImages(imageUrl) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.warn('Google Custom Search not configured');
      return [];
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          searchType: 'image',
          q: 'person face',
          imgSize: 'large',
          num: 10
        },
        timeout: 15000
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google Image Search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Search Bing Image Search API
   * Requires: BING_SEARCH_API_KEY
   */
  async searchBingImages(imageUrl) {
    const apiKey = process.env.BING_SEARCH_API_KEY;

    if (!apiKey) {
      console.warn('Bing Image Search not configured');
      return [];
    }

    try {
      const response = await axios.get('https://api.bing.microsoft.com/v7.0/images/search', {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        },
        params: {
          q: 'person face',
          count: 10,
          imageType: 'Photo',
          size: 'Large'
        },
        timeout: 15000
      });

      return response.data.value || [];
    } catch (error) {
      console.error('Bing Image Search error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Analyze a web image for face matches using AWS Rekognition
   */
  async analyzeWebImage(imageUrl, sourceUrl, scanJobId, refPhotoFaceIds, confidenceThreshold) {
    try {
      const scanJob = await ScanJob.findByPk(scanJobId);

      // Download the image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': this.userAgent
        }
      });

      // Upload to S3 temporarily
      const s3Key = `temp/web-scan/${uuidv4()}.jpg`;
      await awsService.uploadToS3(
        {
          buffer: Buffer.from(response.data),
          mimetype: response.headers['content-type'] || 'image/jpeg'
        },
        s3Key,
        false
      );

      // Search for faces using Rekognition
      const searchResult = await awsService.searchFacesByImage(s3Key, confidenceThreshold);

      // Check if any matches are in our reference photos
      if (searchResult.matches && searchResult.matches.length > 0) {
        for (const match of searchResult.matches) {
          if (refPhotoFaceIds.includes(match.faceId)) {
            // Found a match! Create scan result
            await ScanResult.create({
              scanJobId,
              sourceUrl,
              imageUrl,
              thumbnailUrl: imageUrl,
              confidence: match.similarity,
              provider: 'aws-rekognition',
              providerScore: match,
              sourceType: 'web',
              boundingBox: searchResult.searchedFace,
              metadata: {
                crawledAt: new Date(),
                contentType: response.headers['content-type'],
                imageSize: response.data.length
              }
            });

            console.log(`✓ Match found! URL: ${sourceUrl}, Confidence: ${match.similarity}%`);
          }
        }
      }

      // Clean up temporary S3 file
      await awsService.deleteFromS3(s3Key);

      // Update scan job progress
      await scanJob.update({
        totalImagesScanned: scanJob.totalImagesScanned + 1
      });

    } catch (error) {
      console.error(`Error analyzing image ${imageUrl}:`, error.message);
      // Don't throw - continue with other images
    }
  }
}

module.exports = new WebCrawlerService();
