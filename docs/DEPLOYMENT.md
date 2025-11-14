# OrangePrivacy MVP - Deployment Guide

Complete guide to deploy the OrangePrivacy MVP to production hosting platforms.

## Architecture Overview

```
Frontend (Next.js)     →  Vercel
Backend (Express)      →  Railway / Render
Database (MySQL)       →  Railway / PlanetScale
Redis (Bull Queue)     →  Upstash / Railway Redis
File Storage (S3)      →  AWS S3 (already configured)
Face Recognition       →  AWS Rekognition (already configured)
```

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub repository with your code
- ✅ AWS account with S3 bucket created
- ✅ AWS Rekognition enabled in your region
- ✅ Google Custom Search API key (optional, for real scans)
- ✅ Domain name (optional, for custom domain)

---

## Option 1: Deploy to Vercel (Frontend) + Railway (Backend, DB, Redis)

**Recommended for beginners - Everything in one place**

### Step 1: Deploy Backend to Railway

#### 1.1 Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Create new project

#### 1.2 Add MySQL Database
- Click "New" → "Database" → "Add MySQL"
- Railway will provision a MySQL instance
- Note the connection details (will be in environment variables)

#### 1.3 Add Redis
- Click "New" → "Database" → "Add Redis"
- Railway will provision a Redis instance
- Note the connection details

#### 1.4 Deploy Backend Service
```bash
# In your project root
cd backend

# Create railway.json
```

Create `backend/railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 1.5 Configure Environment Variables in Railway

Add these in Railway dashboard (Backend service → Variables):

```bash
# Server
NODE_ENV=production
PORT=5000

# Database (Railway provides these automatically)
DATABASE_URL=${MYSQL_URL}  # Railway variable
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_NAME=${MYSQL_DATABASE}
DB_USER=${MYSQL_USER}
DB_PASSWORD=${MYSQL_PASSWORD}

# Redis (Railway provides these automatically)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_TLS=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# AWS (from your AWS account)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_S3_REGION=us-east-1

# Google Custom Search (optional)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# CORS - Add your Vercel frontend URL
FRONTEND_URL=https://your-app.vercel.app
```

#### 1.6 Deploy Backend
```bash
# Connect to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

Or use GitHub integration:
- In Railway dashboard: "New" → "GitHub Repo"
- Select your repository
- Select `backend` folder as root directory
- Railway will auto-deploy on push

#### 1.7 Run Migrations
```bash
# After first deployment, run migrations
railway run npm run db:migrate
```

### Step 2: Deploy Frontend to Vercel

#### 2.1 Create Vercel Account
- Go to https://vercel.com
- Sign up with GitHub
- Import your repository

#### 2.2 Configure Vercel Project

**Project Settings:**
- Framework Preset: Next.js
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

#### 2.3 Environment Variables in Vercel

Add these in Vercel dashboard (Settings → Environment Variables):

```bash
# Backend API URL (from Railway)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

#### 2.4 Deploy
- Click "Deploy"
- Vercel will build and deploy automatically
- Your frontend will be live at: `https://your-app.vercel.app`

### Step 3: Update CORS in Backend

After frontend is deployed, update Railway environment variables:

```bash
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy backend to apply changes.

---

## Option 2: Deploy to Render (All-in-One)

**Alternative to Railway**

### Step 1: Create Render Account
- Go to https://render.com
- Sign up with GitHub

### Step 2: Create Services

#### 2.1 Create PostgreSQL Database (or MySQL if available)
- Dashboard → "New" → "PostgreSQL"
- Note the connection string

#### 2.2 Create Redis
- Dashboard → "New" → "Redis"
- Note the connection string

#### 2.3 Create Backend Web Service
- Dashboard → "New" → "Web Service"
- Connect GitHub repository
- Settings:
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm run start`
  - Add environment variables (same as Railway above)

#### 2.4 Deploy Frontend to Vercel
- Same as Option 1, Step 2

---

## Option 3: Deploy Everything to Vercel (Serverless)

**Not Recommended for this app** - Bull Queue doesn't work well with serverless

---

## Option 4: Self-Hosted (DigitalOcean / AWS EC2)

### Quick Setup on Ubuntu Server

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install MySQL
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation

# 4. Install Redis
sudo apt install redis-server
sudo systemctl enable redis-server

# 5. Install PM2 (process manager)
sudo npm install -g pm2

# 6. Clone your repository
git clone https://github.com/yourusername/orange-privacy-v2.git
cd orange-privacy-v2

# 7. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values
nano .env

# Run migrations
npm run db:migrate

# Start with PM2
pm2 start npm --name "orangeprivacy-backend" -- start
pm2 save
pm2 startup

# 8. Setup Frontend
cd ../frontend
npm install
npm run build

# Start with PM2
pm2 start npm --name "orangeprivacy-frontend" -- start
pm2 save

# 9. Setup Nginx
sudo apt install nginx
```

Create `/etc/nginx/sites-available/orangeprivacy`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/orangeprivacy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Database Migration for Production

### Run migrations on Railway/Render:

```bash
# Railway
railway run npm run db:migrate

# Render (via SSH or one-off job)
npm run db:migrate
```

### Seed admin user (optional):

```bash
# Create admin user script
railway run node scripts/createAdmin.js
```

---

## Environment Variables Checklist

### Backend (.env):
- [ ] NODE_ENV=production
- [ ] PORT=5000
- [ ] DATABASE_URL or individual DB vars
- [ ] REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- [ ] REDIS_TLS=true (for hosted Redis)
- [ ] JWT_SECRET (min 32 characters)
- [ ] AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- [ ] AWS_S3_BUCKET, AWS_S3_REGION
- [ ] GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID (optional)
- [ ] FRONTEND_URL (your Vercel URL)

### Frontend (.env.local or Vercel env vars):
- [ ] NEXT_PUBLIC_API_URL (your Railway/Render backend URL)

---

## Post-Deployment Checklist

### 1. Test Backend Health
```bash
curl https://your-backend-url.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "services": {
    "database": { "connected": true },
    "redis": { "connected": true }
  }
}
```

### 2. Test Frontend
- Visit `https://your-app.vercel.app`
- Try registering a new account
- Upload a reference photo
- Start a scan
- Check results

### 3. Monitor Logs
**Railway:**
- Dashboard → Your Service → Logs

**Vercel:**
- Dashboard → Your Project → Deployments → View Logs

### 4. Setup Custom Domain (Optional)

**Vercel:**
- Dashboard → Your Project → Settings → Domains
- Add your domain
- Update DNS records as instructed

**Railway:**
- Dashboard → Your Service → Settings → Custom Domain
- Add your domain
- Update DNS records

---

## Monitoring & Maintenance

### Railway Dashboard
- Check service health
- View logs
- Monitor resource usage
- Set up metrics

### Vercel Dashboard
- View deployment status
- Check analytics
- Monitor performance

### Database Backups

**Railway:**
- Automatic backups included
- Manual backup: Dashboard → Database → Backups

**Render:**
- Automatic daily backups
- Manual backup via dashboard

---

## Troubleshooting

### Issue: "Cannot connect to database"
- Check DATABASE_URL is correct
- Verify database is running in Railway/Render
- Check firewall rules

### Issue: "Redis connection failed"
- Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- Verify REDIS_TLS=true for hosted Redis
- Check Redis service is running

### Issue: "CORS error"
- Update FRONTEND_URL in backend environment
- Redeploy backend

### Issue: "Scans not processing"
- Check Redis is connected (queue worker needs Redis)
- Check backend logs for errors
- Verify AWS credentials are correct

### Issue: "File upload fails"
- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Verify S3 bucket name and region
- Check S3 bucket CORS policy

---

## Cost Estimates

### Recommended Setup (Vercel + Railway):

**Railway:**
- Hobby Plan: $5/month (includes 500 hours, $0.000463/hour after)
- MySQL: Included in hobby plan
- Redis: Included in hobby plan
- Estimated: **$5-10/month**

**Vercel:**
- Hobby Plan: **Free**
- Pro Plan: $20/month (if needed)

**AWS:**
- S3: ~$1-5/month (depending on storage)
- Rekognition: Pay per use (~$0.001 per image)

**Total Estimated Monthly Cost: $6-15/month**

---

## Quick Start Deployment Commands

```bash
# 1. Deploy Backend to Railway
cd backend
railway login
railway init
railway up

# 2. Add environment variables in Railway dashboard

# 3. Run migrations
railway run npm run db:migrate

# 4. Deploy Frontend to Vercel
cd ../frontend
vercel

# 5. Add NEXT_PUBLIC_API_URL environment variable in Vercel

# Done! Your app is live! 🎉
```

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up custom domain
3. ✅ Configure email notifications (future enhancement)
4. ✅ Set up monitoring alerts
5. ✅ Create admin dashboard (future)
6. ✅ Set up automated backups
7. ✅ Configure CDN for faster asset delivery
8. ✅ Implement rate limiting adjustments based on usage
9. ✅ Set up error tracking (Sentry)
10. ✅ Create deployment pipeline (GitHub Actions)

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Render Docs:** https://render.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Express Deployment:** https://expressjs.com/en/advanced/best-practice-performance.html

---

## Security Notes

1. ✅ Always use HTTPS in production
2. ✅ Keep JWT_SECRET secure and random (min 32 chars)
3. ✅ Use environment variables for all secrets
4. ✅ Enable Redis password authentication
5. ✅ Restrict database access to backend only
6. ✅ Keep dependencies updated
7. ✅ Enable rate limiting (already configured)
8. ✅ Regular security audits
9. ✅ Monitor logs for suspicious activity
10. ✅ Implement proper backup strategy

---

**Deployment Complete! Your OrangePrivacy MVP is now live! 🚀**
