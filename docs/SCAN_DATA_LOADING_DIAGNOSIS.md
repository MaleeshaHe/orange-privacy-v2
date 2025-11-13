# Scan Data Loading Diagnosis Guide

## Problem Statement

Users report that when a scan runs, data doesn't load to the frontend. This document provides a step-by-step diagnostic approach to identify and fix the issue.

---

## How Scan Data Flow Works

### Expected Flow

```
1. User creates scan → Frontend calls POST /api/scan-jobs
2. Backend creates ScanJob (status: 'queued') → Returns to frontend
3. Background worker picks up job → Updates status to 'processing'
4. Worker executes scan:
   - Demo Mode: Creates 5 sample ScanResults
   - Real Mode: Calls Google/Bing API, matches faces, saves ScanResults
5. Worker completes → Updates ScanJob (status: 'completed', totalMatchesFound: X)
6. Frontend polls /api/scan-jobs → Sees status='completed'
7. Frontend calls /api/scan-results/scan/{scanJobId} → Gets results
8. Results displayed to user
```

### Common Failure Points

| Step | Symptom | Diagnostic Logs |
|------|---------|-----------------|
| **Worker not running** | Scan stays 'queued' forever | No `🚀 STARTING SCAN JOB` log |
| **Redis connection issue** | Queue not processing | `❌ Redis Queue Error` on startup |
| **Results not saving** | Scan completes but 0 matches | `💾 Creating X demo scan results` missing |
| **Database save failure** | Results not persisted | `✓ Result X saved (ID: ...)` missing |
| **Status not updating** | Scan status not 'completed' | `✅ Scan job X completed` missing |
| **Frontend not polling** | Results exist but not shown | `📤 Fetching results` log missing |

---

## Diagnostic Steps

### Step 1: Check Backend Logs During Scan

Start the backend in development mode to see detailed logs:

```bash
cd backend
npm run dev
```

Look for the following log sequence when a scan runs:

```
🚀 STARTING SCAN JOB: <scan-job-id>
   User ID: <user-id>
   Scan Type: web
   Confidence Threshold: 75%
   Status updated to: processing

Starting web scan for job <scan-job-id>

💾 Creating 5 demo scan results...
   ✓ Result 1/5 saved (ID: abc123, Confidence: 92.5%)
   ✓ Result 2/5 saved (ID: def456, Confidence: 88.3%)
   ✓ Result 3/5 saved (ID: ghi789, Confidence: 85.7%)
   ✓ Result 4/5 saved (ID: jkl012, Confidence: 78.9%)
   ✓ Result 5/5 saved (ID: mno345, Confidence: 72.1%)
✅ Demo scan created 5 sample results

📊 SCAN COMPLETION SUMMARY:
   Job ID: <scan-job-id>
   Total Matches Found: 5
   Saving to database...
✅ Scan job <scan-job-id> completed successfully
   Status: completed
   Matches: 5
   Results should now be visible in frontend
```

**If you see this complete sequence**: The backend is working correctly. Issue is on frontend.

**If logs stop partway**: Note where they stop to identify the failure point.

### Step 2: Check Redis Connection

On backend startup, verify Redis is connected:

```
✅ Redis connected: localhost:6379
   Queue status: X total jobs (Y waiting, Z active)
```

**If Redis connection fails**:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
redis-server
```

**If using hosted Redis** (Upstash, Redis Cloud):
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env`
- Check TLS settings (`REDIS_TLS=true`)

### Step 3: Verify Database Has Results

After a scan completes, check the database directly:

```bash
# Using MySQL client
mysql -u <username> -p <database>

# Query scan jobs
SELECT id, status, totalMatchesFound, createdAt, completedAt
FROM ScanJobs
ORDER BY createdAt DESC
LIMIT 5;

# Query scan results for a specific job
SELECT id, scanJobId, confidence, sourceUrl, createdAt
FROM ScanResults
WHERE scanJobId = '<scan-job-id>';
```

**Expected**:
- ScanJob status = 'completed'
- ScanJob totalMatchesFound > 0
- ScanResults table has matching rows

**If no results in database**: Backend issue (results not saving)
**If results exist but frontend doesn't show**: Frontend issue (not fetching)

### Step 4: Monitor Frontend API Calls

Open browser DevTools → Network tab:

1. **After scan completes**, verify frontend makes these calls:
   - `GET /api/scan-jobs?status=completed` (should return your scan)
   - `GET /api/scan-results/scan/<scan-job-id>` (should return results)

2. **Check Response**:
   - Status: 200 OK
   - Response body:
     ```json
     {
       "results": [...],  // Array of results
       "total": 5,        // Total count
       "scanJob": {...}   // Scan job details
     }
     ```

**If API not called**: Frontend polling issue
**If API returns empty results**: Backend not saving correctly
**If API returns 404**: Scan job not found (auth issue or wrong ID)

### Step 5: Check Frontend Console

Open browser DevTools → Console tab:

Look for:
- Error messages during result fetching
- "Failed to load results" alerts
- Network errors or timeouts

**Common issues**:
- CORS errors → Backend CORS config
- 401 Unauthorized → Auth token expired
- Network timeout → API timeout too short
- Empty results array → Backend saved 0 results

---

## Common Issues and Solutions

### Issue 1: Scan Stays 'queued' Forever

**Cause**: Queue worker not processing jobs

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# Restart backend to restart worker
cd backend
npm run dev
```

### Issue 2: Scan Completes with 0 Matches

**Cause**: Demo mode not creating results OR confidence threshold too high

**Solution**:
- Check logs for `💾 Creating X demo scan results`
- Verify confidence threshold in scan (default: 75%)
- Lower threshold if needed: Create scan with confidenceThreshold: 50

### Issue 3: Results Not Saving to Database

**Cause**: Database connection issue or ScanResult.create() failing

**Solution**:
```bash
# Check database connection
npm run db:test

# Check for database errors in logs
grep -i "error" backend/logs/*.log

# Verify ScanResult model is properly synced
npm run db:migrate
```

### Issue 4: Frontend Shows "No results found"

**Cause**: Frontend not fetching or API returning empty

**Solution**:
1. Open DevTools → Network
2. Find `GET /api/scan-results/scan/<id>` request
3. Check response:
   - If 200 with empty results → Backend issue
   - If 404 → Scan job not found
   - If no request → Frontend polling issue

### Issue 5: Results Exist but Not Displayed

**Cause**: Frontend filtering out results OR UI rendering issue

**Solution**:
```javascript
// Check browser console for actual API response
// Navigate to: Dashboard → Results → Select scan
// In console, check:
console.log('Results fetched:', results);
console.log('Filtered results:', filteredResults);

// Disable filters temporarily
setFilters({ confidence: 'all', sourceType: 'all', confirmationStatus: 'all' });
```

---

## Manual Test Procedure

### 1. Create a Test Scan

```bash
# Frontend
1. Login to dashboard
2. Navigate to "Scans" page
3. Click "New Scan"
4. Select scan type: Web
5. Set confidence: 70%
6. Click "Create Scan"
```

### 2. Monitor Backend Logs

Watch terminal running `npm run dev`:
- Should see `🚀 STARTING SCAN JOB`
- Should see `💾 Creating 5 demo scan results`
- Should see `✅ Scan job completed successfully`

### 3. Check Frontend Updates

1. **Scans page** should auto-refresh (every 10s)
2. Progress bar should update: 10% → 90% → 100%
3. Status should change: queued → processing → completed
4. Toast notification: "Scan Completed! Found 5 matches"

### 4. View Results

1. Click on completed scan
2. Should navigate to Results page
3. Should see 5 demo matches displayed
4. Each match should show:
   - Placeholder image
   - Confidence percentage
   - Source URL
   - Confirm/Reject buttons

---

## Debugging Checklist

Use this checklist to systematically diagnose the issue:

- [ ] Backend server is running
- [ ] Redis is running and connected
- [ ] Database is connected
- [ ] Queue worker started (check logs for `✅ Redis connection established`)
- [ ] Can create scan job (frontend → backend)
- [ ] Scan job appears in ScanJobs table (database)
- [ ] Scan job status updates to 'processing' (logs)
- [ ] Web crawler service executes (logs show `💾 Creating...`)
- [ ] Results saved to ScanResults table (logs show `✓ Result X saved`)
- [ ] Scan job completes (logs show `✅ Scan job X completed`)
- [ ] ScanJob status = 'completed' (database)
- [ ] ScanJob totalMatchesFound > 0 (database)
- [ ] Frontend polls scan jobs API (DevTools Network tab)
- [ ] Frontend fetches results API (DevTools Network tab)
- [ ] Results API returns data (check response body)
- [ ] Frontend displays results (UI shows matches)

---

## Advanced Diagnostics

### Enable Detailed SQL Logging

Edit `backend/src/models/index.js`:

```javascript
const sequelize = new Sequelize(config.database, config.username, config.password, {
  ...config,
  logging: console.log, // Enable SQL query logging
});
```

This will show all SQL queries, helping identify database issues.

### Monitor Queue Status

Create a script to monitor queue status:

```javascript
// backend/scripts/check-queue.js
const Queue = require('bull');
const scanQueue = new Queue('scan-jobs', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }
});

async function checkQueue() {
  const waiting = await scanQueue.getWaiting();
  const active = await scanQueue.getActive();
  const completed = await scanQueue.getCompleted();
  const failed = await scanQueue.getFailed();

  console.log('Queue Status:');
  console.log(`  Waiting: ${waiting.length}`);
  console.log(`  Active: ${active.length}`);
  console.log(`  Completed: ${completed.length}`);
  console.log(`  Failed: ${failed.length}`);

  process.exit(0);
}

checkQueue();
```

Run: `node backend/scripts/check-queue.js`

### Test Direct API Calls

Use `curl` to test API directly:

```bash
# Get scan jobs
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/scan-jobs?status=completed

# Get scan results
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/scan-results/scan/<scan-job-id>
```

---

## Resolution Steps

Once you identify the issue, apply the appropriate fix:

### If Worker Not Running
```bash
# Restart backend to restart worker
cd backend
npm run dev
```

### If Redis Issues
```bash
# Install and start Redis locally
brew install redis  # macOS
redis-server

# Or use Docker
docker run -p 6379:6379 redis
```

### If Database Issues
```bash
# Run migrations
npm run db:migrate

# Verify connection
npm run db:test
```

### If Frontend Issues
```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Restart frontend
cd frontend
npm run dev
```

---

## Expected Backend Logs (Complete Scan)

Here's what a successful scan looks like in logs:

```
🚀 STARTING SCAN JOB: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   User ID: user-123
   Scan Type: web
   Confidence Threshold: 75%
   Status updated to: processing

Starting web scan for job a1b2c3d4-e5f6-7890-abcd-ef1234567890

💾 Creating 5 demo scan results...
   ✓ Result 1/5 saved (ID: res-001, Confidence: 92.5%)
   ✓ Result 2/5 saved (ID: res-002, Confidence: 88.3%)
   ✓ Result 3/5 saved (ID: res-003, Confidence: 85.7%)
   ✓ Result 4/5 saved (ID: res-004, Confidence: 78.9%)
   ✓ Result 5/5 saved (ID: res-005, Confidence: 72.1%)
✅ Demo scan created 5 sample results

📊 SCAN COMPLETION SUMMARY:
   Job ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Total Matches Found: 5
   Saving to database...
✅ Scan job a1b2c3d4-e5f6-7890-abcd-ef1234567890 completed successfully
   Status: completed
   Matches: 5
   Results should now be visible in frontend

📤 Fetching results for scan job a1b2c3d4-e5f6-7890-abcd-ef1234567890:
   Total results found: 5
   Returning 5 results (limit: 50, offset: 0)
   Scan status: completed
```

---

## Summary

The enhanced logging provides visibility into every step of the scan data flow. By following this diagnostic guide and checking logs at each step, you can pinpoint exactly where the data loading breaks and apply the appropriate fix.

**Key Diagnostic Logs to Watch:**
- 🚀 Scan starts
- 💾 Results being saved
- ✅ Scan completes
- 📤 Results fetched by frontend

**Most Likely Issues:**
1. Queue worker not running (Redis not connected)
2. Results saving but totalMatchesFound not updating
3. Frontend not polling or fetching results correctly
4. Auth/permission issues preventing result access

---

## Next Steps

1. **Run a test scan** while monitoring backend logs
2. **Share the complete log output** if issue persists
3. **Check database** to verify results are saved
4. **Monitor frontend Network tab** to verify API calls

This will help identify the exact failure point and guide the fix.
