const axios = require('axios');
const cheerio = require('cheerio');
const { ScanJob, ScanResult, RefPhoto } = require('../models');
const awsService = require('./aws.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Web Crawler Service for scanning public web images
 *
 * IMPORTANT: This implementation requires careful consideration of:
 * - Legal compliance (robots.txt, terms of service)
 * - Rate limiting and ethical crawling
 * - Resource management
 * - Privacy regulations
 */

class WebCrawlerService {
  constructor() {
    this.userAgent = 'OrangePrivacyBot/1.0 (Privacy Scanner; +https://orangeprivacy.com/bot)';
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

    try {
      // Method 1: Use image search APIs (Recommended for MVP)
      await this.scanUsingImageSearchAPIs(scanJobId, refPhotoFaceIds, confidenceThreshold);

      // Method 2: Crawl specific domains (more complex)
      // await this.crawlSpecificDomains(scanJobId, refPhotoFaceIds, confidenceThreshold);

    } catch (error) {
      console.error('Web scan error:', error);
      throw error;
    }
  }

  /**
   * Method 1: Use Image Search APIs (Recommended for MVP)
   * Uses search engines and reverse image search
   */
  async scanUsingImageSearchAPIs(scanJobId, refPhotoFaceIds, confidenceThreshold) {
    const scanJob = await ScanJob.findByPk(scanJobId);

    // Get user's reference photos
    const refPhotos = await RefPhoto.findAll({
      where: { userId: scanJob.userId, isActive: true }
    });

    const matches = [];

    for (const refPhoto of refPhotos) {
      try {
        // Update progress
        await scanJob.update({
          progress: Math.min(90, scanJob.progress + 10),
          totalImagesScanned: scanJob.totalImagesScanned + 1
        });

        // Option A: Use Google Custom Search API
        // const googleResults = await this.searchGoogleImages(refPhoto.s3Url);

        // Option B: Use Bing Image Search API
        // const bingResults = await this.searchBingImages(refPhoto.s3Url);

        // Option C: Use TinEye API (reverse image search)
        // const tinEyeResults = await this.searchTinEye(refPhoto.s3Url);

        // For each found image URL, download and compare faces
        // const foundImages = googleResults; // or combine results

        // Placeholder: In production, you'd iterate through found images
        console.log(`Scanning with reference photo: ${refPhoto.id}`);

      } catch (error) {
        console.error(`Error scanning with reference photo ${refPhoto.id}:`, error);
      }
    }

    return matches;
  }

  /**
   * Search Google Custom Search API for similar images
   * Requires: Google API Key and Custom Search Engine ID
   * https://developers.google.com/custom-search/v1/overview
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
          q: imageUrl, // Or use reverse image search
          num: 10
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google Image Search error:', error);
      return [];
    }
  }

  /**
   * Search Bing Image Search API
   * Requires: Bing API Key (Azure Cognitive Services)
   * https://www.microsoft.com/en-us/bing/apis/bing-image-search-api
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
          q: imageUrl,
          count: 10,
          imageType: 'Photo'
        }
      });

      return response.data.value || [];
    } catch (error) {
      console.error('Bing Image Search error:', error);
      return [];
    }
  }

  /**
   * Method 2: Crawl specific domains
   * More complex, requires careful implementation
   */
  async crawlSpecificDomains(scanJobId, refPhotoFaceIds, confidenceThreshold) {
    // List of domains to crawl (must respect robots.txt)
    const domains = [
      'https://example-photo-site.com',
      // Add more domains as needed
    ];

    for (const domain of domains) {
      try {
        // Check robots.txt first
        const canCrawl = await this.checkRobotsTxt(domain);
        if (!canCrawl) {
          console.log(`Crawling not allowed for ${domain}`);
          continue;
        }

        // Crawl the domain
        await this.crawlDomain(domain, scanJobId, refPhotoFaceIds, confidenceThreshold);

      } catch (error) {
        console.error(`Error crawling ${domain}:`, error);
      }
    }
  }

  /**
   * Check robots.txt before crawling
   */
  async checkRobotsTxt(domain) {
    try {
      const robotsUrl = `${domain}/robots.txt`;
      const response = await axios.get(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 5000
      });

      // Parse robots.txt and check if crawling is allowed
      const robotsTxt = response.data;

      // Simple check - in production use a proper robots.txt parser
      if (robotsTxt.includes('User-agent: *') && robotsTxt.includes('Disallow: /')) {
        return false;
      }

      return true;
    } catch (error) {
      // If robots.txt doesn't exist, be conservative and don't crawl
      return false;
    }
  }

  /**
   * Crawl a single domain for images
   */
  async crawlDomain(domain, scanJobId, refPhotoFaceIds, confidenceThreshold) {
    try {
      const response = await axios.get(domain, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // Find all image elements
      $('img').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src) {
          // Convert relative URLs to absolute
          const absoluteUrl = new URL(src, domain).href;
          images.push(absoluteUrl);
        }
      });

      // Process each image found
      for (const imageUrl of images) {
        try {
          await this.processImage(imageUrl, domain, scanJobId, refPhotoFaceIds, confidenceThreshold);
        } catch (error) {
          console.error(`Error processing image ${imageUrl}:`, error);
        }
      }

    } catch (error) {
      console.error(`Error crawling domain ${domain}:`, error);
    }
  }

  /**
   * Process a single image URL
   */
  async processImage(imageUrl, sourceUrl, scanJobId, refPhotoFaceIds, confidenceThreshold) {
    try {
      // Download the image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024 // 10MB limit
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
              contentType: response.headers['content-type']
            }
          });

          console.log(`Match found! URL: ${sourceUrl}, Confidence: ${match.similarity}%`);
        }
      }

      // Clean up temporary S3 file
      await awsService.deleteFromS3(s3Key);

      // Update scan job progress
      await ScanJob.increment('totalImagesScanned', { where: { id: scanJobId } });

    } catch (error) {
      console.error(`Error processing image ${imageUrl}:`, error);
    }
  }
}

module.exports = new WebCrawlerService();
