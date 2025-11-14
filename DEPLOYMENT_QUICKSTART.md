# 🚀 OrangePrivacy MVP - Quick Deployment Guide

Deploy your OrangePrivacy MVP in 15 minutes!

## Quick Start (Railway + Vercel)

### Prerequisites
```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel
```

### Option 1: Automated Deployment (Recommended)

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

The script will guide you through:
1. ✅ Backend deployment to Railway
2. ✅ Database setup (MySQL)
3. ✅ Redis setup
4. ✅ Database migrations
5. ✅ Frontend deployment to Vercel

### Option 2: Manual Deployment

#### 1. Deploy Backend to Railway

```bash
cd backend

# Login to Railway
railway login

# Initialize new project (or link existing)
railway init

# Add MySQL database
# Go to Railway dashboard → New → Database → MySQL

# Add Redis
# Go to Railway dashboard → New → Database → Redis

# Configure environment variables in Railway dashboard
# See .env.example for required variables

# Deploy backend
railway up

# Run migrations
railway run npm run db:migrate
```

#### 2. Deploy Frontend to Vercel

```bash
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Add environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

#### 3. Update CORS

Update `FRONTEND_URL` in Railway backend environment to your Vercel URL.

---

## Environment Variables

### Backend (Railway)

Required variables (add in Railway dashboard):

```bash
# Auto-provided by Railway
DATABASE_URL=${MYSQL_URL}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}

# You must provide these
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
FRONTEND_URL=https://your-app.vercel.app
REDIS_TLS=true
```

### Frontend (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Post-Deployment

### 1. Test Backend Health
```bash
curl https://your-backend.railway.app/health
```

Expected response:
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
Visit: `https://your-app.vercel.app`

### 3. Create First User
1. Visit your app
2. Click "Register"
3. Create account
4. Upload reference photo
5. Start first scan!

---

## Troubleshooting

### Backend won't start
- Check Railway logs: Dashboard → Backend → Logs
- Verify all environment variables are set
- Check database is connected

### Frontend shows connection error
- Verify `NEXT_PUBLIC_API_URL` in Vercel
- Check CORS settings in backend (`FRONTEND_URL`)
- Redeploy backend after updating env vars

### Scans not processing
- Check Redis is connected (backend logs)
- Verify AWS credentials are correct
- Check S3 bucket exists and is accessible

---

## Cost Estimate

**Monthly costs for small-scale deployment:**

- **Railway**: $5-10/month (Hobby plan)
  - Includes MySQL database
  - Includes Redis
  - Backend hosting

- **Vercel**: Free (Hobby plan)
  - Frontend hosting
  - Free for personal projects

- **AWS S3**: $1-5/month
  - Storage for photos
  - Pay per use

- **AWS Rekognition**: ~$0.001 per image
  - Face detection/matching
  - Pay per use

**Total: $6-15/month** for small-scale deployment

---

## Production Checklist

Before going live:

- [ ] Change all default secrets (JWT_SECRET, etc.)
- [ ] Configure AWS credentials properly
- [ ] Set up custom domain (optional)
- [ ] Enable HTTPS (auto with Vercel/Railway)
- [ ] Configure email notifications (future feature)
- [ ] Set up monitoring/alerts
- [ ] Test all features thoroughly
- [ ] Create admin account
- [ ] Configure backups
- [ ] Review rate limiting settings

---

## Support

Need help? Check the full deployment guide:
- 📖 See `docs/DEPLOYMENT.md` for detailed instructions
- 🐛 Report issues on GitHub
- 💬 Contact support

---

**Ready to deploy? Run `./deploy.sh` to get started! 🚀**
