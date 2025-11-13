# Web Scanning Implementation Guide

This guide explains how to implement and use facial recognition scanning across the public web in OrangePrivacy.

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Implementation Approaches](#implementation-approaches)
4. [Using the API](#using-the-api)
5. [Configuration](#configuration)
6. [Legal & Ethical Considerations](#legal--ethical-considerations)
7. [Performance Optimization](#performance-optimization)

## Overview

OrangePrivacy scans the public web to find where users' photos appear online using AWS Rekognition facial recognition. The system consists of:

- **Reference Photo Management**: Users upload 1-3 photos of themselves
- **Face Indexing**: AWS Rekognition indexes faces from reference photos
- **Web Scanning**: System searches for similar faces across the web
- **Results Dashboard**: Users view matches with confidence scores

## Current Implementation

### What's Built

✅ **Core Infrastructure**
- Scan job queue system (Redis + Bull)
- AWS Rekognition integration
- Face indexing and comparison
- Results storage and API
- Social media scanning (Facebook, Instagram)

✅ **API Endpoints**
- `POST /api/scan-jobs` - Create new scan
- `GET /api/scan-jobs/:id` - Get scan status
- `GET /api/scan-results/scan/:scanJobId` - Get results

### What Needs Implementation

⚠️ **Web Crawler** (`backend/src/services/webCrawler.service.js`)

The web crawler service is implemented but requires configuration and API keys for actual web scanning.

## Implementation Approaches

### Approach 1: Image Search APIs (Recommended for MVP)

**Best for**: Quick MVP deployment, legal compliance, cost-effective

Use existing image search APIs to find similar images:

#### Option A: Google Custom Search API

```bash
# Set up:
1. Go to https://console.cloud.google.com/
2. Enable Custom Search API
3. Create API key
4. Create Custom Search Engine
```

Add to `.env`:
```env
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**Pricing**: $5 per 1000 queries (first 100/day free)

#### Option B: Bing Image Search API

```bash
# Set up:
1. Go to https://azure.microsoft.com/
2. Create Cognitive Services resource
3. Get API key for Bing Image Search
```

Add to `.env`:
```env
BING_SEARCH_API_KEY=your_bing_api_key
```

**Pricing**: $3 per 1000 transactions (free tier: 1000/month)

#### Option C: TinEye API

```bash
# Set up:
1. Go to https://tineye.com/
2. Sign up for API access
3. Get API key
```

**Best for**: Reverse image search
**Pricing**: Varies by plan

### Approach 2: Custom Web Crawler

**Best for**: Full control, specific domains, advanced features

Crawl specific domains for images:

```javascript
// Example: Crawl a specific domain
const domains = [
  'https://photo-sharing-site.com',
  'https://portfolio-site.com'
];

// The crawler will:
1. Check robots.txt
2. Respect crawl delays
3. Extract images
4. Compare faces
5. Store results
```

**Important**: Must respect:
- robots.txt
- Terms of Service
- Rate limits
- Legal requirements

## Using the API

### 1. Upload Reference Photos

```bash
curl -X POST http://localhost:5000/api/ref-photos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/photo.jpg" \
  -F "photoType=frontal"
```

### 2. Create Scan Job

```bash
curl -X POST http://localhost:5000/api/scan-jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "web",
    "confidenceThreshold": 80
  }'
```

**Scan Types:**
- `web` - Public web only
- `social` - Social media only (requires connected accounts)
- `combined` - Both web and social media

**Response:**
```json
{
  "message": "Scan job created successfully",
  "scanJob": {
    "id": "uuid",
    "status": "queued",
    "scanType": "web",
    "confidenceThreshold": 80,
    "progress": 0
  }
}
```

### 3. Check Scan Progress

```bash
curl -X GET http://localhost:5000/api/scan-jobs/SCAN_JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "scanJob": {
    "id": "uuid",
    "status": "processing",
    "progress": 45,
    "totalImagesScanned": 150,
    "totalMatchesFound": 3
  }
}
```

### 4. Get Scan Results

```bash
curl -X GET "http://localhost:5000/api/scan-results/scan/SCAN_JOB_ID?minConfidence=80" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "sourceUrl": "https://example.com/page",
      "imageUrl": "https://example.com/image.jpg",
      "confidence": 92.5,
      "sourceType": "web",
      "isConfirmedByUser": null
    }
  ],
  "total": 3
}
```

### 5. Confirm or Reject Results

```bash
curl -X PATCH http://localhost:5000/api/scan-results/RESULT_ID/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isConfirmedByUser": true}'
```

## Configuration

### Environment Variables

Add to `backend/.env`:

```env
# Web Scanning Configuration
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
BING_SEARCH_API_KEY=your_bing_api_key
TINEYE_API_KEY=your_tineye_api_key

# Scanning Limits
MAX_IMAGES_PER_SCAN=1000
SCAN_TIMEOUT_MINUTES=30
CRAWL_DELAY_MS=1000
MAX_CONCURRENT_REQUESTS=5

# User Agent
CRAWLER_USER_AGENT=OrangePrivacyBot/1.0 (Privacy Scanner; +https://orangeprivacy.com/bot)
```

### Database Configuration

Ensure MySQL is running and migrations are applied:

```bash
cd backend
npm install
npm run migrate
```

## Legal & Ethical Considerations

### ⚠️ IMPORTANT: Legal Compliance

Before deploying web scanning, ensure compliance with:

#### 1. robots.txt Compliance
- Always check and respect robots.txt
- Implement crawl delays
- Identify your bot in User-Agent

#### 2. Terms of Service
- Read and comply with website ToS
- Some sites prohibit automated scraping
- Get permission for commercial use

#### 3. Privacy Laws
- GDPR (EU)
- CCPA (California)
- Other regional privacy laws

#### 4. Copyright
- Don't store copyrighted images
- Only store metadata and URLs
- Get permission for image hosting

#### 5. Rate Limiting
- Implement polite crawling
- Use exponential backoff
- Don't overwhelm servers

### Ethical Guidelines

```javascript
// Example: Ethical crawler configuration
const ETHICAL_CRAWLER_CONFIG = {
  respectRobotsTxt: true,
  crawlDelay: 1000, // 1 second between requests
  maxRequestsPerDomain: 100,
  userAgent: 'OrangePrivacyBot/1.0 (Privacy Scanner; contact@orangeprivacy.com)',
  followRedirects: true,
  timeout: 10000
};
```

### User Consent

Users must:
- ✅ Give explicit biometric consent
- ✅ Understand what data is collected
- ✅ Agree to terms of service
- ✅ Have right to deletion

## Performance Optimization

### 1. Caching

```javascript
// Cache search results
const cacheKey = `search:${imageHash}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### 2. Batch Processing

```javascript
// Process multiple images in batches
const batchSize = 10;
for (let i = 0; i < images.length; i += batchSize) {
  const batch = images.slice(i, i + batchSize);
  await Promise.all(batch.map(processImage));
}
```

### 3. Priority Queue

```javascript
// Prioritize recent scans
scanQueue.add(jobData, {
  priority: isPremiumUser ? 1 : 10,
  attempts: 3
});
```

### 4. Resource Limits

```javascript
// Limit concurrent scans per user
const activeScanCount = await ScanJob.count({
  where: {
    userId,
    status: ['queued', 'processing']
  }
});

if (activeScanCount >= MAX_CONCURRENT_SCANS) {
  throw new Error('Too many active scans');
}
```

## Monitoring & Logging

### Track Scan Metrics

```javascript
// Log scan events
console.log({
  event: 'scan_started',
  scanJobId,
  userId,
  scanType,
  timestamp: new Date()
});

// Monitor performance
const scanDuration = Date.now() - startTime;
console.log({
  event: 'scan_completed',
  scanJobId,
  duration: scanDuration,
  imagesScanned: totalImages,
  matchesFound: totalMatches
});
```

### Error Handling

```javascript
try {
  await webCrawlerService.scanWeb(scanJobId, ...);
} catch (error) {
  // Log error
  console.error('Scan error:', {
    scanJobId,
    error: error.message,
    stack: error.stack
  });

  // Update scan job
  await scanJob.update({
    status: 'failed',
    errorMessage: error.message
  });

  // Notify user (optional)
  // await notificationService.sendScanFailedEmail(user);
}
```

## Cost Estimation

### API-Based Scanning (Recommended)

**Google Custom Search:**
- First 100 queries/day: Free
- Additional: $5 per 1000 queries
- **Example**: 1000 scans/month = ~$5-10

**Bing Image Search:**
- First 1000 transactions/month: Free
- Additional: $3 per 1000 transactions
- **Example**: 5000 scans/month = $12

**AWS Rekognition:**
- Face indexing: $1 per 1000 images
- Face search: $1 per 1000 searches
- **Example**: 1000 scans = $2-3

**Total Estimated Cost**: $20-30/month for 1000 scans

### Custom Crawler

**Infrastructure:**
- EC2 instances: $20-50/month
- S3 storage: $5-10/month
- Data transfer: $10-20/month

**Total**: $35-80/month + development time

## Testing

### Test Web Scanning

```bash
# 1. Start services
docker-compose up -d

# 2. Create test user and upload photo
# 3. Create scan job

# 4. Monitor logs
docker-compose logs -f backend

# 5. Check results
curl http://localhost:5000/api/scan-results/scan/SCAN_JOB_ID \
  -H "Authorization: Bearer TOKEN"
```

### Test with Mock Data

```javascript
// For testing, use mock image URLs
const mockImages = [
  'https://picsum.photos/200/300',
  'https://via.placeholder.com/150'
];
```

## Troubleshooting

### Common Issues

**1. No results found**
- Check API keys are configured
- Verify reference photos have faces indexed
- Lower confidence threshold
- Check scan logs for errors

**2. Scan gets stuck**
- Check Redis is running
- Verify queue worker is processing
- Check AWS Rekognition quotas
- Review error logs

**3. Too many false positives**
- Increase confidence threshold (85-95%)
- Use higher quality reference photos
- Ensure frontal + side photos

**4. API rate limits**
- Implement caching
- Use multiple API providers
- Add exponential backoff
- Monitor usage quotas

## Next Steps

1. **Configure APIs**: Choose and set up image search APIs
2. **Test scanning**: Start with small batches
3. **Monitor costs**: Track API usage and costs
4. **Optimize**: Implement caching and batching
5. **Scale**: Add more workers as needed

## Support

For questions or issues:
- Check logs: `docker-compose logs backend`
- Review queue: Redis CLI `redis-cli`
- GitHub Issues: [repository-url]/issues

## Resources

- [AWS Rekognition Documentation](https://docs.aws.amazon.com/rekognition/)
- [Google Custom Search API](https://developers.google.com/custom-search)
- [Bing Image Search API](https://www.microsoft.com/en-us/bing/apis/bing-image-search-api)
- [robots.txt Parser](https://github.com/samclarke/robots-parser)
- [Web Scraping Best Practices](https://benbernardblog.com/web-scraping-and-crawling-are-perfectly-legal-right/)
