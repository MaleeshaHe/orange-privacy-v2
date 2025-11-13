# Redis Setup Guide for OrangePrivacy

Redis is required for background job processing (scanning social media, processing images, etc.) in OrangePrivacy.

## Quick Start

### Option 1: Hosted Redis (Recommended - No Installation)

#### Using Upstash (Free Tier)

1. **Create Account**
   - Go to https://upstash.com/
   - Sign up (free, no credit card required)

2. **Create Redis Database**
   - Click "Create Database"
   - Choose a region close to you
   - Select "Free" plan (10,000 commands/day)

3. **Get Connection Details**
   - After creation, you'll see your database dashboard
   - Copy these values:
     - **Endpoint** (e.g., `us1-caring-sheep-12345.upstash.io`)
     - **Port** (e.g., `33626`)
     - **Password/Token** (click "show" to reveal)

4. **Update `.env` File**
   ```env
   REDIS_HOST=us1-caring-sheep-12345.upstash.io
   REDIS_PORT=33626
   REDIS_PASSWORD=your_token_here
   ```

5. **Restart Backend**
   ```bash
   cd backend
   npm run dev
   ```

#### Using Redis Cloud

1. **Create Account**
   - Go to https://app.redislabs.com/
   - Sign up (free tier available)

2. **Create Database**
   - Click "New Database"
   - Choose "Fixed" plan (30MB free)
   - Select a cloud provider and region

3. **Get Connection Details**
   - Go to Configuration tab
   - Copy:
     - **Public endpoint** (e.g., `redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com`)
     - **Port**
     - **Default user password**

4. **Update `.env` File**
   ```env
   REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_PASSWORD=your_password_here
   ```

### Option 2: Local Redis Installation

#### Ubuntu/Debian
```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server  # Auto-start on boot

# Verify it's running
redis-cli ping
# Should return: PONG
```

#### macOS
```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

#### Docker (All Platforms)
```bash
# Run Redis container
docker run -d --name orangeprivacy-redis -p 6379:6379 redis:latest

# Verify it's running
docker ps | grep redis
redis-cli ping
# Should return: PONG

# To stop: docker stop orangeprivacy-redis
# To start: docker start orangeprivacy-redis
```

#### Local Redis `.env` Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Verifying Connection

### Method 1: Check Server Logs
When you start the backend, look for:

**✅ Success:**
```
✅ Redis connection established - Queue is ready
✅ Redis connected: your-host:port
   Queue status: 0 total jobs (0 waiting, 0 active)
```

**❌ Failed:**
```
❌ Redis Queue Error: connect ECONNREFUSED
⚠️  Redis connection failed: connect ECONNREFUSED
   Background job processing will not work
   Configure Redis in .env file or use a hosted Redis service
   Current config: localhost:6379 (no auth)
```

### Method 2: Health Check Endpoint
```bash
# With curl
curl http://localhost:5000/health

# Or open in browser
http://localhost:5000/health
```

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T...",
  "environment": "development",
  "services": {
    "database": {
      "connected": true,
      "type": "MySQL"
    },
    "redis": {
      "connected": true,
      "host": "localhost",
      "port": 6379,
      "jobCounts": {
        "waiting": 0,
        "active": 0,
        "completed": 2,
        "failed": 0,
        "delayed": 0
      }
    }
  }
}
```

## Advanced Configuration

### TLS Configuration
TLS is automatically enabled for common hosted Redis providers (Upstash, Redis Cloud, AWS).

To explicitly control TLS, uncomment in `.env`:
```env
REDIS_TLS=true
```

### Setting a Password on Local Redis

1. **Edit Redis Config**
   ```bash
   sudo nano /etc/redis/redis.conf
   ```

2. **Find and uncomment/add:**
   ```conf
   requirepass your_secure_password_here
   ```

3. **Restart Redis**
   ```bash
   sudo systemctl restart redis-server
   ```

4. **Update `.env`**
   ```env
   REDIS_PASSWORD=your_secure_password_here
   ```

## Troubleshooting

### Connection Refused Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**
- Redis is not running - start Redis service
- Wrong host/port - check `.env` configuration
- Firewall blocking connection - allow Redis port

### Authentication Error
```
Error: NOAUTH Authentication required
```

**Solutions:**
- Add password to `.env` file
- Check if password/token is correct
- Make sure no extra spaces in password

### TLS/SSL Error
```
Error: socket hang up
Error: ECONNRESET
```

**Solutions:**
- Hosted Redis may require TLS - it's auto-detected
- Manually set `REDIS_TLS=true` in `.env`
- Check if port number is correct

### Timeout Errors
```
Error: Connection timeout
```

**Solutions:**
- Check network connectivity
- Verify host and port are accessible
- Check if Redis service is running
- For hosted Redis, check if your IP is allowed (some services have IP restrictions)

## What Redis is Used For

In OrangePrivacy, Redis powers:

1. **Background Job Queue** - Processing scan jobs asynchronously
2. **Social Media Scanning** - Fetching and analyzing photos from Facebook/Instagram
3. **Image Processing** - Face detection and comparison with AWS Rekognition
4. **Rate Limiting** - Managing API rate limits for external services
5. **Job Monitoring** - Tracking progress and status of long-running tasks

## Performance Tips

### For Development
- Local Redis or free hosted tier is sufficient
- Default configuration works fine

### For Production
- Use hosted Redis with Redis Cloud, AWS ElastiCache, or Upstash Pro
- Enable persistence (RDB + AOF)
- Set up monitoring and alerts
- Consider Redis Cluster for high availability
- Use connection pooling (already configured in the app)

## Comparison: Local vs Hosted

| Feature | Local Redis | Hosted Redis (Upstash/Cloud) |
|---------|-------------|------------------------------|
| Setup Time | 5-10 minutes | 2 minutes |
| Cost | Free (uses your machine) | Free tier available |
| Maintenance | Manual updates/backups | Automatic |
| Performance | Depends on machine | Optimized infrastructure |
| Scalability | Limited | Easy to scale |
| Availability | When your machine is on | 24/7 uptime |
| Best For | Development | Development + Production |

## Support

If you encounter issues:
1. Check server startup logs
2. Test connection with `/health` endpoint
3. Verify `.env` configuration
4. Check Redis service status
5. Review troubleshooting section above

For hosted Redis services:
- **Upstash**: https://docs.upstash.com/redis
- **Redis Cloud**: https://docs.redis.com/latest/rc/
