# Web Scanning Setup Guide

This guide explains how to set up and use the web scanning functionality in OrangePrivacy.

## Overview

The web scanning feature allows you to search for your photos across the internet using facial recognition. The system supports three modes:

1. **Demo Mode** (Default) - Creates sample results for testing without requiring API keys
2. **Google Custom Search API** - Uses Google's search engine for finding images
3. **Bing Image Search API** - Uses Microsoft's Bing for finding images

## Quick Start (Demo Mode)

**The web scanning works out of the box in Demo Mode!**

No configuration required - just create a web scan and it will generate sample results for testing.

### How to Use:
1. Go to **Dashboard** → **Scans**
2. Click **"New Scan"**
3. Select **"Web Scan"** as scan type
4. Set confidence threshold (50-100)
5. Click **"Create Scan"**
6. Wait for the scan to complete (2-3 seconds)
7. View results in the **Results** page

### Demo Mode Features:
- Creates 5 sample results with varying confidence scores
- Filters results based on your confidence threshold
- Shows placeholder images with colored badges
- Includes metadata indicating it's a demo result
- Perfect for testing the UI and workflow

---

## Production Setup (Real Web Scanning)

For production use with real web scanning, configure one of the following APIs:

### Option 1: Google Custom Search API (Recommended)

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Custom Search API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Custom Search API"
   - Click **Enable**

#### Step 2: Get API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key
4. (Optional) Restrict the key to Custom Search API only

#### Step 3: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **Add** to create a new search engine
3. Configure:
   - **Sites to search**: `www.google.com` (or specific sites you want to search)
   - **Name**: "OrangePrivacy Image Search"
   - **Search entire web**: Enable this option
4. Create and note your **Search Engine ID** (cx parameter)

#### Step 4: Configure Environment Variables

Add to `backend/.env`:
```env
# Google Custom Search API
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

#### Pricing:
- **Free Tier**: 100 search queries per day
- **Paid**: $5 per 1,000 queries (up to 10,000 queries/day)
- [Pricing Details](https://developers.google.com/custom-search/v1/overview#pricing)

---

### Option 2: Bing Image Search API

#### Step 1: Create Azure Account

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign up or log in to your Azure account

#### Step 2: Create Bing Search Resource

1. Click **Create a resource**
2. Search for **"Bing Search v7"**
3. Click **Create**
4. Configure:
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Region**: Choose closest region
   - **Pricing tier**: F1 (Free) or S1 (Paid)
5. Click **Review + create** → **Create**

#### Step 3: Get API Key

1. Go to your Bing Search resource
2. Click **Keys and Endpoint** in the left menu
3. Copy **Key 1**

#### Step 4: Configure Environment Variables

Add to `backend/.env`:
```env
# Bing Image Search API
BING_SEARCH_API_KEY=your_bing_api_key_here
```

#### Pricing:
- **Free Tier (F1)**: 1,000 transactions per month
- **Standard (S1)**: 1,000 transactions for $3
- [Pricing Details](https://www.microsoft.com/en-us/bing/apis/pricing)

---

## How Web Scanning Works

### 1. Demo Mode Flow
```
User creates web scan
  ↓
System detects no API keys configured
  ↓
Generates 5 sample results with placeholder images
  ↓
Filters by confidence threshold
  ↓
Saves results to database
  ↓
User views results
```

### 2. Production Mode Flow (with APIs)
```
User creates web scan
  ↓
System retrieves user's active reference photos
  ↓
For each reference photo:
  ├─ Search Google/Bing for similar images
  ├─ Download found images
  ├─ Upload to AWS S3 temporarily
  ├─ Compare faces using AWS Rekognition
  ├─ Save matches above confidence threshold
  └─ Clean up temporary files
  ↓
Mark scan as completed
  ↓
User views real matches
```

## Configuration Reference

### Environment Variables

All web scanning configuration goes in `backend/.env`:

```env
# Google Custom Search API (Option 1)
GOOGLE_API_KEY=                      # Your Google API key
GOOGLE_SEARCH_ENGINE_ID=             # Your Custom Search Engine ID

# Bing Image Search API (Option 2)
BING_SEARCH_API_KEY=                 # Your Bing API key

# Note: If both are configured, Google will be used by default
# If neither is configured, Demo Mode is automatically enabled
```

### Scanning Modes

The system automatically selects the mode based on configuration:

| Configuration | Mode Used |
|--------------|-----------|
| No API keys | **Demo Mode** |
| `GOOGLE_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` | **Google Custom Search** |
| `BING_SEARCH_API_KEY` only | **Bing Image Search** |
| Both configured | **Google Custom Search** (priority) |

## Testing

### Test Demo Mode
```bash
# Start backend (no configuration needed)
cd backend
npm run dev

# Create a web scan from the frontend
# Results will be generated automatically
```

### Test Production Mode
```bash
# Add API keys to backend/.env
GOOGLE_API_KEY=your_key_here
GOOGLE_SEARCH_ENGINE_ID=your_cx_here

# Restart backend
cd backend
npm run dev

# Create a web scan
# Real web images will be searched and analyzed
```

## Limitations & Considerations

### Demo Mode
- ✅ Perfect for testing UI/UX
- ✅ No API costs
- ✅ Instant results
- ❌ Not real matches
- ❌ Shows placeholder images only

### Production Mode
- ✅ Real web scanning
- ✅ Actual image matches
- ✅ AWS Rekognition face comparison
- ❌ Requires API keys
- ❌ API costs apply
- ❌ Rate limits from search providers

### Legal & Ethical Considerations
- Respect robots.txt and website terms of service
- Rate limit your requests appropriately
- Handle user data responsibly
- Comply with GDPR and privacy regulations
- Consider image copyright when displaying results

## Troubleshooting

### Issue: "Starting web scan (DEMO MODE)" in logs
**Solution**: This is normal if no API keys are configured. Demo mode is working as expected.

### Issue: "Google Custom Search not configured"
**Solution**: Check that both `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set in `.env`

### Issue: "Bing Image Search not configured"
**Solution**: Check that `BING_SEARCH_API_KEY` is set in `.env`

### Issue: No results found
**Possible causes**:
1. Confidence threshold too high - try lowering it
2. No active reference photos - upload and activate photos first
3. API quota exceeded - check your API usage dashboard
4. AWS Rekognition not configured - set up AWS credentials

### Issue: Scan stays in "processing" status
**Possible causes**:
1. Redis not running - check Redis connection
2. Background job processing failed - check backend logs
3. AWS credentials invalid - verify AWS setup

## Advanced Configuration

### Customize Demo Results

Edit `backend/src/services/webCrawler.service.js` to customize demo results:

```javascript
const sampleResults = [
  {
    sourceUrl: 'https://example.com/photo1',
    imageUrl: 'https://your-custom-image-url.com/image1.jpg',
    confidence: 95.0,
  },
  // Add more custom results...
];
```

### Adjust Search Parameters

**Google Custom Search:**
```javascript
// In searchGoogleImages() method
params: {
  q: 'person face',        // Search query
  imgSize: 'large',        // Image size: small, medium, large
  num: 10,                 // Results per query (max 10)
  searchType: 'image'
}
```

**Bing Image Search:**
```javascript
// In searchBingImages() method
params: {
  q: 'person face',        // Search query
  count: 10,               // Results per query
  imageType: 'Photo',      // Image type filter
  size: 'Large'           // Image size filter
}
```

## API Quotas & Costs

### Google Custom Search
- Free: 100 queries/day
- Paid: $5 per 1,000 queries
- Max: 10,000 queries/day

### Bing Image Search
- Free: 1,000 transactions/month (F1 tier)
- Paid: From $3 per 1,000 transactions

### Optimization Tips
1. Set appropriate confidence thresholds to reduce false positives
2. Limit number of active reference photos
3. Cache search results when possible
4. Use demo mode for development/testing
5. Monitor API usage regularly

## Support

For issues or questions:
1. Check backend logs: `cd backend && npm run dev`
2. Check Redis connection: `curl http://localhost:5000/health`
3. Verify AWS credentials are configured
4. Review this documentation
5. Check environment variables in `.env` file

## Next Steps

1. **For Testing**: Use Demo Mode (default) - no setup required
2. **For Development**: Set up Google Custom Search API
3. **For Production**: Configure both AWS Rekognition and Google/Bing APIs
4. **Scale Up**: Consider API quotas and upgrade to paid tiers as needed
