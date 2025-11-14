#!/bin/bash

# OrangePrivacy MVP - Quick Deployment Script
# This script helps deploy the application to Railway + Vercel

echo "🚀 OrangePrivacy MVP Deployment Script"
echo "======================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "📦 Install it with: npm install -g @railway/cli"
    echo "   Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Install it with: npm install -g vercel"
    echo "   Or visit: https://vercel.com/download"
    exit 1
fi

echo "✅ All required CLIs are installed"
echo ""

# Deploy Backend to Railway
echo "📦 Step 1: Deploying Backend to Railway..."
echo "==========================================="
cd backend

echo "🔐 Logging into Railway..."
railway login

echo "🔗 Linking to Railway project..."
railway link

echo "⚠️  IMPORTANT: Configure environment variables in Railway dashboard:"
echo "   - JWT_SECRET"
echo "   - AWS credentials"
echo "   - Database connection (Railway will provide)"
echo "   - Redis connection (Railway will provide)"
echo "   - FRONTEND_URL (update after Vercel deployment)"
echo ""
read -p "Have you configured environment variables? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please configure environment variables first"
    echo "   Visit: https://railway.app/dashboard"
    exit 1
fi

echo "🚀 Deploying backend..."
railway up

echo "📊 Running database migrations..."
railway run npm run db:migrate

echo "✅ Backend deployed successfully!"
BACKEND_URL=$(railway status --json | grep "url" | cut -d '"' -f 4)
echo "   Backend URL: $BACKEND_URL"
echo ""

cd ..

# Deploy Frontend to Vercel
echo "📦 Step 2: Deploying Frontend to Vercel..."
echo "==========================================="
cd frontend

echo "🔐 Logging into Vercel..."
vercel login

echo "⚠️  IMPORTANT: Configure environment variable in Vercel:"
echo "   NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo ""
read -p "Ready to deploy frontend? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🚀 Deploying frontend..."
vercel --prod

echo "✅ Frontend deployed successfully!"
FRONTEND_URL=$(vercel inspect --prod | grep "URL:" | awk '{print $2}')
echo "   Frontend URL: $FRONTEND_URL"
echo ""

cd ..

# Final steps
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📝 Next Steps:"
echo "1. Update FRONTEND_URL in Railway backend environment:"
echo "   FRONTEND_URL=$FRONTEND_URL"
echo ""
echo "2. Redeploy backend with updated CORS settings:"
echo "   cd backend && railway up"
echo ""
echo "3. Test your application:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "4. Check health endpoint:"
echo "   curl $BACKEND_URL/health"
echo ""
echo "✅ All done! Your OrangePrivacy MVP is live! 🚀"
