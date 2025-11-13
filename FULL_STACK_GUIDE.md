# OrangePrivacy - Full Stack Quick Start Guide

Complete guide to run the OrangePrivacy MVP with integrated frontend and backend.

## 🚀 Quick Start (3 Steps)

### Step 1: Install MySQL and Create Database

**Option A: Using the automated script** ⚡
```bash
cd backend
chmod +x setup-mysql.sh
./setup-mysql.sh
```

**Option B: Manual setup**
```bash
# Install MySQL (Ubuntu/Debian)
sudo apt install mysql-server -y
sudo systemctl start mysql

# Create database
mysql -u root -proot -e "CREATE DATABASE orangeprivacy_dev;"
```

### Step 2: Start Backend

```bash
cd backend
npm install          # First time only
npm run migrate      # First time only
npm run dev          # Starts on http://localhost:5000
```

**Expected output:**
```
🚀 Server is running on port 5000
✓ Database connection established successfully
⚠️  AWS credentials not configured - AWS features disabled (OK for now)
```

### Step 3: Start Frontend

**Open a new terminal:**
```bash
cd frontend
npm install          # First time only
npm run dev          # Starts on http://localhost:3000
```

**Open browser:**
```
http://localhost:3000
```

---

## 📋 Complete Setup Checklist

### Prerequisites
- [x] Node.js 18+ installed
- [x] npm installed
- [ ] MySQL 8.0 installed and running
- [ ] MySQL database created

### Backend Setup
- [ ] Navigate to `backend/` directory
- [ ] Run `npm install`
- [ ] Configure `.env` file (already created)
- [ ] Create MySQL database
- [ ] Run migrations: `npm run migrate`
- [ ] Start server: `npm run dev`
- [ ] Verify: `curl http://localhost:5000/health`

### Frontend Setup
- [ ] Navigate to `frontend/` directory
- [ ] Run `npm install`
- [ ] Verify `.env.local` exists
- [ ] Start dev server: `npm run dev`
- [ ] Open `http://localhost:3000`

---

## 🎯 Test the Integration

### 1. Register a New User

1. Open http://localhost:3000
2. Click "Sign up" or navigate to `/register`
3. Fill in the form:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Password: `Password123`
4. Click "Create account"
5. **Expected**: Redirect to dashboard

### 2. Give Biometric Consent

1. Click "Profile" in sidebar
2. Scroll to "Privacy & Consent" section
3. Click "Give Consent" button
4. **Expected**: Green checkmark "Consent given"

### 3. Upload Reference Photo

1. Click "Reference Photos" in sidebar
2. Drag and drop a photo or click to select
3. **Expected**: Photo appears in gallery

**Note**: Without AWS credentials, the photo will be stored locally but won't process facial recognition. This is OK for frontend testing.

### 4. Create a Scan Job

1. Click "Scans" in sidebar
2. Click "New Scan" button
3. Configure:
   - Scan Type: `Web Scan`
   - Confidence Threshold: `85`
4. Click "Create Scan"
5. **Expected**: Scan appears in list with status "queued"

### 5. View Results

1. Click "Results" in sidebar
2. Select your scan from dropdown
3. **Expected**: Shows "No matches found" (normal without AWS)

---

## 🎨 Feature Overview

### What Works WITHOUT AWS:
✅ User registration and authentication
✅ Login/logout with session persistence
✅ Profile management
✅ Settings configuration
✅ Dashboard statistics
✅ Navigation and UI
✅ Form validation
✅ Error handling

### What Requires AWS:
❌ Photo upload to S3
❌ Facial recognition (Rekognition)
❌ Scan job processing
❌ Finding actual matches

---

## 🔧 Environment Configuration

### Backend `.env` (backend/.env)
```env
# Already configured with defaults
NODE_ENV=development
PORT=5000

# UPDATE THIS to match your MySQL password
DB_PASSWORD=root

# Optional AWS (leave blank for now)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Frontend `.env.local` (frontend/.env.local)
```env
# Already configured
NEXT_PUBLIC_API_URL=http://localhost:5000
NODE_ENV=development
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `Access denied for user 'root'@'localhost'`

**Solution**: Update `DB_PASSWORD` in `backend/.env` to match your MySQL password
```bash
# Test your MySQL password
mysql -u root -p

# Update .env with the working password
DB_PASSWORD=your_password_here
```

---

**Error**: `Unknown database 'orangeprivacy_dev'`

**Solution**: Create the database
```bash
mysql -u root -p -e "CREATE DATABASE orangeprivacy_dev;"
```

---

**Error**: `Cannot find module`

**Solution**: Install dependencies
```bash
cd backend
npm install
```

---

**Error**: `Table doesn't exist`

**Solution**: Run migrations
```bash
cd backend
npm run migrate
```

---

### Frontend Won't Start

**Error**: `Port 3000 already in use`

**Solution**: Kill the process or use a different port
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

---

**Error**: `Cannot connect to backend`

**Solution**: Verify backend is running
```bash
# Check backend health
curl http://localhost:5000/health

# Should return: {"status":"healthy",...}
```

---

### API Integration Issues

**Error**: Login works but other API calls fail with 401

**Solution**: Clear browser storage
```javascript
// Open browser console (F12)
localStorage.clear()
// Refresh page and login again
```

---

**Error**: Can't upload photos (403 Forbidden)

**Solution**: Give biometric consent
1. Go to Profile page
2. Click "Give Consent" button
3. Try upload again

---

### Database Issues

**Error**: Connection timeout

**Solution**: Check MySQL is running
```bash
# Ubuntu/Debian
sudo systemctl status mysql
sudo systemctl start mysql

# macOS
brew services start mysql
```

---

## 📊 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:5000/health
```
**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T...",
  "environment": "development"
}
```

### Test Registration API
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Password123",
    "firstName": "API",
    "lastName": "Test"
  }'
```
**Expected**: Returns user object and JWT token

### Frontend Health Check
Open browser to:
- http://localhost:3000 → Should redirect to login/register
- http://localhost:3000/login → Should show login form
- http://localhost:3000/register → Should show registration form

---

## 🎬 Demo User Flow

1. **Register** (`/register`)
   - Create account with email/password
   - Auto-login and redirect to dashboard

2. **Dashboard** (`/dashboard`)
   - View statistics (photos, scans, matches)
   - Access quick actions

3. **Profile** (`/dashboard/profile`)
   - Give biometric consent
   - Update personal information
   - Change password

4. **Photos** (`/dashboard/photos`)
   - Upload reference photos
   - View photo gallery
   - Activate/deactivate photos

5. **Scans** (`/dashboard/scans`)
   - Create new scan jobs
   - Monitor scan progress
   - View scan history

6. **Results** (`/dashboard/results`)
   - Browse scan results
   - Confirm/reject matches
   - View confidence scores

7. **Settings** (`/dashboard/settings`)
   - Configure privacy mode
   - Set confidence thresholds
   - Manage notifications

---

## 🔐 Security Notes

### For Development:
- JWT secret is in `.env` (OK for dev, change for production)
- CORS allows `localhost:3000` only
- Rate limiting: 100 requests per 15 minutes
- Passwords hashed with bcrypt
- SQL injection protected by Sequelize ORM

### For Production:
- [ ] Change `JWT_SECRET` to strong random value
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Enable HTTPS
- [ ] Set stronger rate limits
- [ ] Enable MySQL replication
- [ ] Add monitoring and logging
- [ ] Configure AWS IAM roles properly

---

## 📚 Documentation

- **Backend Setup**: `backend/SETUP.md`
- **Frontend Docs**: `frontend/README.md`
- **API Integration**: `API_INTEGRATION.md`
- **Web Scanning**: `WEB_SCANNING_GUIDE.md`
- **Development**: `backend/DEVELOPMENT.md`

---

## 🚀 Production Deployment

### Backend
```bash
cd backend
npm run build        # If using TypeScript
npm start           # Production mode
```

### Frontend
```bash
cd frontend
npm run build       # Creates optimized production build
npm start          # Serves production build
```

### Environment Variables for Production
```env
# Backend
NODE_ENV=production
DB_PASSWORD=<strong-password>
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=https://your-domain.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## 💡 Development Tips

### Hot Reload
Both frontend and backend support hot reload. Just save files and see changes immediately.

### Database Reset
```bash
cd backend
npm run migrate:undo:all  # Undo all migrations
npm run migrate           # Re-run migrations
```

### View Database
```bash
mysql -u root -p orangeprivacy_dev

# Useful commands:
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM ref_photos;
SELECT * FROM scan_jobs;
```

### Browser DevTools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API calls
- **Application** > Storage: View localStorage (auth token)

---

## 🎉 Success Indicators

You know everything is working when:

✅ Backend responds to health check
✅ Frontend loads without console errors
✅ You can register a new user
✅ Login redirects to dashboard
✅ Dashboard shows statistics (even if zeros)
✅ Sidebar navigation works
✅ Profile page loads
✅ Can give biometric consent
✅ Settings page loads
✅ No 404 or 500 errors in Network tab

---

## 📞 Support

### Check Logs
- **Backend**: Check terminal where `npm run dev` is running
- **Frontend**: Check browser console (F12)
- **MySQL**: `mysql -u root -p` then `SHOW PROCESSLIST;`

### Common Questions

**Q: Can I use PostgreSQL instead of MySQL?**
A: Yes, but you'll need to update the Sequelize configuration and install `pg` instead of `mysql2`.

**Q: Do I need AWS to test the app?**
A: No! The frontend and most backend features work without AWS. You just won't be able to process actual facial recognition.

**Q: Can I run frontend and backend on different ports?**
A: Yes, just update `NEXT_PUBLIC_API_URL` in frontend `.env.local` and `FRONTEND_URL` in backend `.env`.

**Q: How do I add a new API endpoint?**
A:
1. Add route in `backend/src/routes/`
2. Add controller in `backend/src/controllers/`
3. Add API call in `frontend/src/lib/api.ts`
4. Use in component with `await apiName.method()`

---

## 🎯 Next Steps

1. ✅ Get the stack running
2. ✅ Test user registration and login
3. ✅ Explore all pages
4. [ ] Configure AWS (optional)
5. [ ] Add custom features
6. [ ] Deploy to production

---

**Full Stack Status**: ✅ Ready for Development

**Last Updated**: 2025-01-13
**Version**: 1.0.0
