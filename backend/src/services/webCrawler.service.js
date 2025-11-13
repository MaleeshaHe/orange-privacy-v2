const axios = require('axios');
const { ScanJob, ScanResult, RefPhoto } = require('../models');
const awsService = require('./aws.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Web Crawler Service for scanning public web images
 *
 * MODES:
 * 1. Demo Mode - Creates sample scan results for testing (default when no API key configured)
 * 2. Google Custom Search API - Uses Google's API for reverse image search
 */

class WebCrawlerService {
  constructor() {
    this.userAgent = 'OrangePrivacyBot/1.0 (Privacy Scanner; +https://orangeprivacy.com/bot)';

    // Check Google API configuration
    const hasApiKey = !!process.env.GOOGLE_API_KEY;
    const hasSearchEngineId = !!process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.demoMode = !hasApiKey || !hasSearchEngineId;

    // Log configuration status
    console.log('\n========================================');
    console.log('🔍 Web Crawler Service Configuration');
    console.log('========================================');
    console.log(`Mode: ${this.demoMode ? '🎭 DEMO MODE' : '🌐 GOOGLE API MODE'}`);
    console.log(`Google API Key: ${hasApiKey ? '✅ Configured' : '❌ Missing'}`);
    if (hasApiKey) {
      const key = process.env.GOOGLE_API_KEY;
      console.log(`  → Key preview: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`);
    }
    console.log(`Google Search Engine ID: ${hasSearchEngineId ? '✅ Configured' : '❌ Missing'}`);
    if (hasSearchEngineId) {
      console.log(`  → ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID}`);
    }
    console.log('========================================\n');
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

    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  WEB SCAN STARTED - Job: ${scanJobId.substring(0, 8)}...  ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log(`Mode: ${this.demoMode ? '🎭 DEMO MODE' : '🌐 GOOGLE API MODE'}`);
    console.log(`Confidence Threshold: ${confidenceThreshold}%`);
    console.log(`Reference Face IDs: ${refPhotoFaceIds.length}`);

    try {
      if (this.demoMode) {
        // Demo mode - create sample results for testing
        console.log('\n💡 Running in Demo Mode');
        console.log('   → No Google API keys configured');
        console.log('   → Creating sample results for testing\n');
        await this.runDemoScan(scanJobId, confidenceThreshold);
      } else {
        // Use Google Custom Search API
        console.log('\n🔍 Running with Google Custom Search API');

        // Check if AWS is configured for face matching
        const hasAWS = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
        if (!hasAWS) {
          console.warn('⚠️  WARNING: AWS credentials not configured!');
          console.warn('   → Images will be found but cannot be matched');
          console.warn('   → Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env\n');
        }

        await this.scanUsingGoogleSearch(scanJobId, refPhotoFaceIds, confidenceThreshold);
      }

      console.log('\n✅ Web scan completed successfully');
      console.log('═══════════════════════════════════════\n');
    } catch (error) {
      console.error('\n❌ Web scan failed:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.error('═══════════════════════════════════════\n');
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
    const { User } = require('../models');

    const scanJob = await ScanJob.findByPk(scanJobId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'email']
      }]
    });

    if (!scanJob) {
      throw new Error('Scan job not found');
    }

    // Get user's reference photos
    const refPhotos = await RefPhoto.findAll({
      where: { userId: scanJob.userId, isActive: true }
    });

    if (refPhotos.length === 0) {
      throw new Error('No active reference photos found');
    }

    // Construct search query from user's name
    let searchQuery = 'person face'; // fallback
    if (scanJob.user) {
      const firstName = scanJob.user.firstName || '';
      const lastName = scanJob.user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      if (fullName) {
        searchQuery = fullName;
        console.log(`🔍 Using search query: "${searchQuery}"`);
      } else {
        console.log(`⚠️  User has no name set, using fallback query: "${searchQuery}"`);
      }
    }

    console.log(`\n🔄 Processing ${refPhotos.length} reference photo(s)...\n`);

    let totalImagesFound = 0;

    for (let i = 0; i < refPhotos.length; i++) {
      const refPhoto = refPhotos[i];

      try {
        console.log(`─────────────────────────────────────`);
        console.log(`📷 Reference Photo ${i + 1}/${refPhotos.length}`);
        console.log(`   ID: ${refPhoto.id}`);
        console.log(`   Face ID: ${refPhoto.rekognitionFaceId || 'Not indexed'}`);
        console.log(`─────────────────────────────────────`);

        // Update progress
        await scanJob.update({
          progress: Math.min(90, scanJob.progress + 10)
        });

        // Search for similar images using Google Custom Search
        const searchResults = await this.searchGoogleImages(refPhoto.signedUrl || refPhoto.s3Url, searchQuery);

        if (searchResults.length === 0) {
          console.log(`   ⚠️  No images found for this reference photo\n`);
          continue;
        }

        totalImagesFound += searchResults.length;
        console.log(`   📦 Processing ${searchResults.length} found images...\n`);

        // Process each found image
        for (let j = 0; j < searchResults.length; j++) {
          try {
            const searchResult = searchResults[j];
            console.log(`   [${j + 1}/${searchResults.length}] Processing image...`);

            // Extract image URL from search result
            const imageUrl = searchResult.link;
            const sourceUrl = searchResult.image?.contextLink || searchResult.link;

            if (!imageUrl) {
              console.log(`   ✗ No image URL found, skipping\n`);
              continue;
            }

            console.log(`   Source: ${sourceUrl.substring(0, 60)}...`);

            // Download and analyze the image
            await this.analyzeWebImage(
              imageUrl,
              sourceUrl,
              scanJobId,
              refPhotoFaceIds,
              confidenceThreshold
            );

            console.log(''); // Empty line for readability

          } catch (error) {
            console.error(`   ❌ Error processing search result: ${error.message}\n`);
          }
        }

      } catch (error) {
        console.error(`❌ Error scanning with reference photo ${refPhoto.id}: ${error.message}\n`);
      }
    }

    console.log(`\n═══════════════════════════════════════`);
    console.log(`📊 Scan Summary:`);
    console.log(`   Total images found: ${totalImagesFound}`);
    console.log(`   Total images scanned: ${scanJob.totalImagesScanned}`);
    console.log(`═══════════════════════════════════════\n`);
  }

  /**
   * Search Google Custom Search API for similar images
   * Requires: GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID
   * @param {string} imageUrl - Reference image URL (currently not used)
   * @param {string} searchQuery - Search query (user's full name or fallback)
   */
  async searchGoogleImages(imageUrl, searchQuery = 'person face') {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    console.log('\n🔎 Attempting Google Custom Search API connection...');

    if (!apiKey || !searchEngineId) {
      console.warn('❌ Google Custom Search not configured');
      console.log(`   API Key: ${apiKey ? 'Present' : 'Missing'}`);
      console.log(`   Search Engine ID: ${searchEngineId ? 'Present' : 'Missing'}`);
      return [];
    }

    try {
      console.log('📡 Sending request to Google Custom Search API...');
      console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
      console.log(`   Search Engine ID: ${searchEngineId}`);
      console.log(`   Query: "${searchQuery}"`);

      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          searchType: 'image',
          q: searchQuery,
          imgSize: 'large',
          num: 10
        },
        timeout: 15000
      });

      const itemCount = response.data.items?.length || 0;
      console.log(`✅ Google API Response received!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Images found: ${itemCount}`);
      console.log(`   Queries used: ${response.data.queries?.request?.[0]?.count || 0}`);

      return response.data.items || [];
    } catch (error) {
      console.error('❌ Google Image Search API Error:');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${error.response.data.error?.message || 'Unknown error'}`);
        console.error(`   Details:`, error.response.data);

        // Common error messages
        if (error.response.status === 403) {
          console.error('\n   💡 Possible causes:');
          console.error('   1. Invalid API key');
          console.error('   2. API not enabled in Google Cloud Console');
          console.error('   3. API key restrictions preventing access');
        } else if (error.response.status === 400) {
          console.error('\n   💡 Possible causes:');
          console.error('   1. Invalid Search Engine ID');
          console.error('   2. Search Engine not configured for image search');
        }
      } else {
        console.error(`   Message: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Analyze a web image for face matches using AWS Rekognition
   */
  async analyzeWebImage(imageUrl, sourceUrl, scanJobId, refPhotoFaceIds, confidenceThreshold) {
    let s3Key = null;

    try {
      const scanJob = await ScanJob.findByPk(scanJobId);

      console.log(`   📥 Downloading image: ${imageUrl.substring(0, 60)}...`);

      // Download the image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': this.userAgent
        }
      });

      console.log(`   ✓ Downloaded (${(response.data.length / 1024).toFixed(2)} KB)`);

      // Upload to S3 temporarily
      s3Key = `temp/web-scan/${uuidv4()}.jpg`;
      console.log(`   ☁️  Uploading to S3: ${s3Key}`);

      await awsService.uploadToS3(
        {
          buffer: Buffer.from(response.data),
          mimetype: response.headers['content-type'] || 'image/jpeg'
        },
        s3Key,
        false
      );

      console.log(`   🔍 Searching for faces with Rekognition...`);

      // Search for faces using Rekognition
      const searchResult = await awsService.searchFacesByImage(s3Key, confidenceThreshold);

      console.log(`   → Found ${searchResult.matches?.length || 0} face matches`);

      // Check if any matches are in our reference photos
      if (searchResult.matches && searchResult.matches.length > 0) {
        for (const match of searchResult.matches) {
          console.log(`     Checking match: faceId=${match.faceId}, similarity=${match.similarity}%`);

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

            console.log(`   ✅ MATCH FOUND! URL: ${sourceUrl.substring(0, 50)}..., Confidence: ${match.similarity}%`);
          } else {
            console.log(`     ✗ Face not in reference photos (faceId: ${match.faceId})`);
          }
        }
      } else {
        console.log(`   ✗ No face matches found in this image`);
      }

      // Clean up temporary S3 file
      if (s3Key) {
        console.log(`   🗑️  Cleaning up S3: ${s3Key}`);
        await awsService.deleteFromS3(s3Key);
      }

      // Update scan job progress
      await scanJob.update({
        totalImagesScanned: scanJob.totalImagesScanned + 1
      });

    } catch (error) {
      console.error(`   ❌ Error analyzing image: ${error.message}`);

      // Clean up S3 file on error
      if (s3Key) {
        try {
          await awsService.deleteFromS3(s3Key);
        } catch (cleanupError) {
          console.error(`   Failed to cleanup S3 file: ${cleanupError.message}`);
        }
      }

      // Don't throw - continue with other images
    }
  }
}

module.exports = new WebCrawlerService();
