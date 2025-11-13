# Google Custom Search API Setup Guide

This guide will help you set up Google Custom Search API for real web scanning in OrangePrivacy.

## Prerequisites

- Google Account
- Credit card (for Google Cloud, though free tier is available)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** dropdown at the top
3. Click **"New Project"**
4. Enter project name: **"OrangePrivacy"**
5. Click **"Create"**
6. Wait for the project to be created (takes ~10 seconds)

## Step 2: Enable Custom Search API

1. In Google Cloud Console, make sure your new project is selected
2. Go to **"APIs & Services"** → **"Library"** (use left sidebar or search)
3. Search for **"Custom Search API"**
4. Click on **"Custom Search API"**
5. Click **"Enable"**
6. Wait for the API to be enabled

## Step 3: Create API Key

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"API Key"**
4. Your API key will be generated and displayed
5. **Copy the API key** and save it somewhere safe
6. (Optional but recommended) Click **"Restrict Key"**:
   - Set **Application restrictions**: None (or HTTP referrers if you want)
   - Set **API restrictions**: Select "Restrict key"
   - Choose **"Custom Search API"** from the dropdown
   - Click **"Save"**

## Step 4: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **"Add"** or **"Get Started"**
3. Fill in the form:
   - **Name your search engine**: "OrangePrivacy Web Scanner"
   - **What to search**:
     - Option 1: Enter `www.google.com` (searches entire web)
     - Option 2: Leave empty and enable "Search the entire web" below
   - **Search settings**:
     - ✅ Enable **"Image search"**
     - ✅ Enable **"Search the entire web"**
4. Click **"Create"**
5. On the next page, you'll see your **Search engine ID** (looks like: `a1b2c3d4e5f6g7h8i`)
6. **Copy the Search engine ID** and save it

### Important Settings

After creating the search engine:
1. Click **"Control Panel"** or **"Customize"**
2. Go to **"Basics"** tab:
   - Make sure **"Search the entire web"** is ON
   - Make sure **"Image search"** is ON
3. Go to **"Setup"** → **"Basics"**:
   - If you see "Sites to search", you can remove all specific sites to search the entire web
4. Click **"Update"** to save changes

## Step 5: Configure OrangePrivacy

1. Open `backend/.env` file
2. Add your credentials:

```env
# Web Scanning - Google Custom Search API
GOOGLE_API_KEY=AIzaSyABC123XYZ_your_actual_api_key_here
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f6g7h8i
```

3. Save the file

## Step 6: Restart Backend

```bash
cd backend
# Stop the backend (Ctrl+C if running)
npm run dev
```

You should see in the logs:
```
🔍 Running with Google Custom Search API
```

Instead of:
```
💡 Running in Demo Mode
```

## Step 7: Test Web Scanning

1. Go to http://localhost:3000/dashboard/scans
2. Click **"New Scan"**
3. Select **"Web Scan"**
4. Set confidence threshold (e.g., 80%)
5. Click **"Create Scan"**
6. Wait for the scan to complete
7. View real results from Google Search!

## Pricing

### Free Tier
- **100 search queries per day** - FREE
- Perfect for testing and development

### Paid Tier
- **$5 per 1,000 queries** (above free tier)
- Maximum **10,000 queries per day**
- [View Pricing Details](https://developers.google.com/custom-search/v1/overview#pricing)

### Cost Estimation
- 1 scan with 3 reference photos = ~3 queries
- Free tier = ~33 scans per day
- If you need more, costs are very reasonable ($5 per 1,000 queries)

## Troubleshooting

### Issue: "Google Custom Search not configured"

**Check:**
1. Both `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are set in `.env`
2. No extra spaces or quotes around the values
3. Backend has been restarted after adding the values

**Fix:**
```env
# ✅ Correct
GOOGLE_API_KEY=AIzaSyABC123XYZ
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5

# ❌ Wrong (has quotes)
GOOGLE_API_KEY="AIzaSyABC123XYZ"

# ❌ Wrong (has spaces)
GOOGLE_API_KEY= AIzaSyABC123XYZ
```

### Issue: "API key not valid" or 403 error

**Possible causes:**
1. API key is incorrect - copy it again from Google Cloud Console
2. Custom Search API not enabled - go back to Step 2
3. API key restrictions too strict - check restriction settings

**Fix:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Check that Custom Search API is in the allowed APIs
4. Try creating a new unrestricted API key for testing

### Issue: "Search engine ID not found"

**Possible causes:**
1. Search engine ID is incorrect
2. Search engine not properly created

**Fix:**
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click on your search engine
3. Copy the **"Search engine ID"** from the Basics or Setup page
4. Make sure it matches what's in your `.env` file

### Issue: "Quota exceeded"

**Fix:**
1. You've hit the 100 queries/day free limit
2. Wait until tomorrow (quota resets daily)
3. OR upgrade to paid tier in Google Cloud Console

### Issue: No results found

**Possible causes:**
1. Search returned no matching images
2. No faces detected in found images
3. Confidence threshold too high

**Fix:**
1. Lower the confidence threshold (try 70% instead of 85%)
2. Make sure you have active reference photos uploaded
3. Check backend logs for more details

### Issue: Still seeing "Demo Mode" in logs

**Check:**
1. `.env` file is in the correct location (`backend/.env`)
2. Both API key AND search engine ID are set
3. Backend has been restarted after changes
4. No typos in environment variable names

## Verify Configuration

Run this to check if variables are loaded:

```bash
cd backend
node -e "require('dotenv').config(); console.log('API Key:', process.env.GOOGLE_API_KEY ? 'SET ✓' : 'NOT SET ✗'); console.log('Search Engine ID:', process.env.GOOGLE_SEARCH_ENGINE_ID ? 'SET ✓' : 'NOT SET ✗');"
```

Should output:
```
API Key: SET ✓
Search Engine ID: SET ✓
```

## How It Works

Once configured, the web scanning process:

1. **User creates a web scan**
2. **System retrieves active reference photos**
3. **For each reference photo:**
   - Queries Google Custom Search API
   - Gets up to 10 similar images from the web
   - Downloads each found image
   - Uploads to AWS S3 temporarily
   - Compares faces using AWS Rekognition
   - Saves matches above confidence threshold
   - Cleans up temporary files
4. **Displays real matches to user**

## Security Best Practices

1. **Never commit `.env` file** - it's in `.gitignore` by default
2. **Restrict API keys** - limit to Custom Search API only
3. **Set up billing alerts** - get notified if costs exceed limits
4. **Rotate keys regularly** - create new keys every few months
5. **Monitor usage** - check Google Cloud Console regularly

## Additional Resources

- [Custom Search JSON API Documentation](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine Help](https://support.google.com/programmable-search/)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all steps were completed correctly
3. Check backend console logs for detailed error messages
4. Review Google Cloud Console for API errors
5. Make sure AWS Rekognition is also configured (required for face matching)

## Demo Mode vs Production Mode

| Feature | Demo Mode | Google API Mode |
|---------|-----------|-----------------|
| Setup Required | None | Google Cloud + API Keys |
| Cost | Free | Free tier: 100/day, Paid: $5/1000 |
| Results | Sample placeholders | Real web images |
| Face Matching | N/A | AWS Rekognition |
| Perfect For | Testing UI/UX | Production use |

---

**Quick Summary:**
1. Create Google Cloud project
2. Enable Custom Search API
3. Create API key
4. Create Custom Search Engine
5. Add both to `backend/.env`
6. Restart backend
7. Test with a web scan!

That's it! You're now ready to scan the real web for face matches. 🎉
