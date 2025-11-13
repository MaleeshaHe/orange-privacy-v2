# Web Scanning Diagnostics Guide

This guide helps you diagnose and fix web scanning issues.

## Quick Diagnostic Checklist

Run through this checklist to identify what's not working:

### ✅ 1. Check Service Configuration (On Startup)

When you start the backend server, you should see:

```
========================================
🔍 Web Crawler Service Configuration
========================================
Mode: 🌐 GOOGLE API MODE  (or 🎭 DEMO MODE)
Google API Key: ✅ Configured  (or ❌ Missing)
  → Key preview: AIzaSyABC1...xyz4
Google Search Engine ID: ✅ Configured  (or ❌ Missing)
  → ID: a1b2c3d4e5f6g7h8i
========================================
```

**Issue:** Shows "DEMO MODE" or "❌ Missing"
**Fix:** Configure Google API credentials in `backend/.env`

---

### ✅ 2. Check Scan Job Execution

When you create a web scan, check the backend logs:

```
╔════════════════════════════════════════╗
║  WEB SCAN STARTED - Job: 12345678...  ║
╚════════════════════════════════════════╝
Mode: 🌐 GOOGLE API MODE
Confidence Threshold: 80%
Reference Face IDs: 2
```

**Issue:** Not seeing this at all
**Fix:** Check if Redis is running and connected

---

### ✅ 3. Check Google API Connection

During scan, you should see:

```
🔎 Attempting Google Custom Search API connection...
📡 Sending request to Google Custom Search API...
   API Key: AIzaSyABC1...xyz4
   Search Engine ID: a1b2c3d4e5f6g7h8i
   Query: "John Doe"

✅ Google API Response received!
   Status: 200
   Images found: 10
   Queries used: 10
```

**Issues and Fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `❌ Missing` | No API key/ID in .env | Add credentials to `.env` |
| `Status: 403` | Invalid API key | Generate new key in Google Cloud Console |
| `Status: 403` | API not enabled | Enable "Custom Search API" in Google Cloud |
| `Status: 400` | Invalid Search Engine ID | Check ID in Programmable Search Engine |
| `Images found: 0` | No results for query | Check Search Engine configuration |

---

### ✅ 4. Check AWS Configuration

During scan, you should see:

```
⚠️  WARNING: AWS credentials not configured!
   → Images will be found but cannot be matched
   → Configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
```

**Issue:** Seeing this warning
**Fix:** Configure AWS credentials in `backend/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=orangeprivacy-uploads
AWS_REKOGNITION_COLLECTION_ID=orangeprivacy-faces
AWS_REGION=eu-west-1
```

---

### ✅ 5. Check Image Processing

For each found image, you should see:

```
[1/10] Processing image...
Source: https://example.com/page.html...
   📥 Downloading image: https://example.com/photo.jpg...
   ✓ Downloaded (245.67 KB)
   ☁️  Uploading to S3: temp/web-scan/uuid.jpg
   🔍 Searching for faces with Rekognition...
   → Found 1 face matches
     Checking match: faceId=abc123, similarity=95.5%
   ✅ MATCH FOUND! URL: https://example.com..., Confidence: 95.5%
   🗑️  Cleaning up S3: temp/web-scan/uuid.jpg
```

**Common Issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| `❌ Error downloading` | Image URL blocked | Normal - skip and continue |
| `❌ Error uploading S3` | AWS not configured | Configure AWS credentials |
| `❌ Error: AccessDeniedException` | No S3 permissions | Add S3 permissions to IAM user |
| `❌ Error: ResourceNotFoundException` | Collection doesn't exist | Create Rekognition collection |
| `✗ No face matches` | No faces in image | Normal - not all images have faces |
| `✗ Face not in reference photos` | Face doesn't match | Normal - found different person |

---

### ✅ 6. Check Scan Completion

At the end of scan:

```
═══════════════════════════════════════
📊 Scan Summary:
   Total images found: 30
   Total images scanned: 30

✅ Web scan completed successfully
═══════════════════════════════════════
```

---

## Common Problems & Solutions

### Problem 1: "Still in Demo Mode"

**Symptoms:**
- Always shows "🎭 DEMO MODE"
- Gets placeholder images

**Diagnosis:**
```bash
cd backend
grep "GOOGLE_API_KEY=" .env
grep "GOOGLE_SEARCH_ENGINE_ID=" .env
```

**Solution:**
Both values must be non-empty:
```env
GOOGLE_API_KEY=AIzaSyABC123XYZ_actual_key_here
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f6g7h8i
```

Then restart backend:
```bash
npm run dev
```

---

### Problem 2: "Google API Returns 0 Images"

**Symptoms:**
- API connection successful
- `Images found: 0`

**Possible Causes:**

1. **Search Engine not configured for image search**
   - Go to https://programmablesearchengine.google.com/
   - Edit your search engine
   - Enable "Image search" under Settings

2. **Search restricted to specific sites**
   - Ensure "Search the entire web" is enabled
   - Remove any site restrictions

3. **Query has no results**
   - Check user's first name and last name are set
   - Try manually searching Google Images for the same query

---

### Problem 3: "Images Found But No Matches"

**Symptoms:**
- Images are being downloaded and processed
- Always shows `✗ No face matches found`

**Possible Causes:**

1. **Reference photos not indexed**
   - Check if reference photos have `rekognitionFaceId`
   - Re-upload reference photos if needed

2. **No faces detected in found images**
   - Normal - not all web images contain faces
   - Try different search queries

3. **Confidence threshold too high**
   - Lower the confidence threshold (try 70% instead of 80%)

---

### Problem 4: "AWS Errors"

**Error: `AccessDeniedException`**
```
Solution: Add these permissions to your IAM user:
- AmazonS3FullAccess (or custom S3 policy)
- AmazonRekognitionFullAccess (or custom Rekognition policy)
```

**Error: `ResourceNotFoundException: Collection not found`**
```bash
# Create collection manually:
aws rekognition create-collection \
    --collection-id orangeprivacy-faces \
    --region eu-west-1
```

**Error: `InvalidS3ObjectException`**
```
Solution: Check S3 bucket exists and region matches:
- Bucket: orangeprivacy-uploads
- Region: eu-west-1 (or your configured region)
```

---

### Problem 5: "Scan Stuck in 'Processing'"

**Symptoms:**
- Scan status never changes to "completed"
- No errors in logs

**Diagnosis:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check queue status
cd backend
npm run queue:status  # If you have this script
```

**Solution:**
1. Restart Redis:
   ```bash
   sudo systemctl restart redis
   ```

2. Restart backend:
   ```bash
   cd backend
   npm run dev
   ```

---

## Testing Checklist

Before reporting an issue, test these scenarios:

### Scenario 1: Demo Mode (No APIs)
1. Empty Google API keys in `.env`
2. Restart backend
3. Create web scan
4. Should see 5 demo results

**Expected:** ✅ Works immediately with placeholder images

---

### Scenario 2: Google API Only (No AWS)
1. Add Google API credentials
2. Leave AWS credentials empty
3. Restart backend
4. Create web scan

**Expected:**
- ✅ Google finds images
- ⚠️  Warning about AWS not configured
- ❌ No matches found (can't analyze images)

---

### Scenario 3: Full Setup (Google + AWS)
1. Add both Google and AWS credentials
2. Restart backend
3. Upload reference photo
4. Create web scan

**Expected:**
- ✅ Google finds images
- ✅ AWS analyzes faces
- ✅ Matches are found (if person appears in results)

---

## Required Configuration Summary

### Minimum for Testing (Demo Mode)
```env
# Nothing required - works out of the box
```

### For Real Web Search (No Face Matching)
```env
GOOGLE_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

### For Full Functionality (Web Search + Face Matching)
```env
# Google Custom Search API
GOOGLE_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id

# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=orangeprivacy-uploads
AWS_REKOGNITION_COLLECTION_ID=orangeprivacy-faces
```

---

## Getting Help

When reporting an issue, include:

1. **Configuration status** (from startup logs)
2. **Scan job ID**
3. **Complete backend logs** from scan start to finish
4. **Browser console errors** (if frontend issue)
5. **Which scenario you're testing** (Demo/Google only/Full)

---

## Quick Commands

```bash
# View backend logs
cd backend
npm run dev

# Check .env configuration
cat backend/.env | grep -E "(GOOGLE|AWS)"

# Test Google API manually
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_KEY&cx=YOUR_CX&searchType=image&q=test&num=1"

# Check Redis
redis-cli ping

# Restart everything
pkill -f "node.*backend"
cd backend && npm run dev
```
