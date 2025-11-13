# Backend Setup Guide

## Quick Start (Choose Your Path)

### Option A: Automated Setup (Recommended) ⚡

Run the automated setup script:

```bash
cd backend
chmod +x setup-mysql.sh
./setup-mysql.sh
```

This script will:
- ✓ Check if MySQL is installed
- ✓ Help you install MySQL if needed
- ✓ Create the database
- ✓ Configure the .env file automatically

Then skip to [Step 4: Install Dependencies](#step-4-install-dependencies)

---

### Option B: Manual Setup 🔧

Follow these steps if you prefer manual configuration:

---

## Step 1: Install MySQL

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
```

### RedHat/CentOS/Fedora
```bash
sudo yum install mysql-server -y
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

### macOS
```bash
brew install mysql
brew services start mysql
```

### Windows
Download from: https://dev.mysql.com/downloads/mysql/

---

## Step 2: Verify MySQL is Running

```bash
# Check MySQL service status
sudo systemctl status mysql

# Or try to connect
mysql -u root -p
```

If you can't connect, you may need to set a root password:

```bash
# Set root password to 'root' (or your preferred password)
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
EXIT;
```

---

## Step 3: Configure Database Password

**Edit `backend/.env` and update the MySQL password:**

The `.env` file is already created. Just update this line to match your MySQL root password:

```env
DB_PASSWORD=root
```

**Common passwords:**
- `root` - Most common default
- `password` - Some installations
- `` (blank) - Fresh MySQL install
- `your_custom_password` - If you set a specific password

**Test your connection:**
```bash
mysql -u root -p
# Enter your password when prompted
```

---

## Step 4: Create Database

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE orangeprivacy_dev;

# Verify it was created
SHOW DATABASES;

# Exit
EXIT;
```

**Or create it in one command:**
```bash
mysql -u root -p -e "CREATE DATABASE orangeprivacy_dev;"
```

---

## Step 5: Install Dependencies

```bash
cd backend
npm install
```

**What this installs:**
- Express.js - Web framework
- Sequelize - ORM for MySQL
- mysql2 - MySQL driver
- bcryptjs - Password hashing
- jsonwebtoken - JWT auth
- AWS SDK - For S3 and Rekognition
- And more...

---

## Step 6: Run Database Migrations

```bash
npm run migrate
```

**This will create all database tables:**
- users
- ref_photos
- scan_jobs
- scan_results
- social_accounts
- oauth_tokens
- social_media_items

---

## Step 7: Start the Server

```bash
npm run dev
```

**You should see:**
```
🚀 Server is running on port 5000
✓ Database connection established successfully
⚠️  AWS credentials not configured - AWS features disabled (this is OK for now)
```

---

## Test if Everything Works ✅

### 1. Check Server Health
```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T..."
}
```

### 2. Register a Test User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**If all these work, your backend is configured correctly!** ✅

---

## Troubleshooting Common Issues

### Issue 1: "Access denied for user 'root'@'localhost'"

**Problem:** Wrong MySQL password in .env file

**Solution:**
1. Test which password works:
   ```bash
   mysql -u root -p
   # Try: root, password, or blank
   ```

2. Update `.env` file:
   ```env
   DB_PASSWORD=your_working_password
   ```

3. Restart the server:
   ```bash
   npm run dev
   ```

---

### Issue 2: "Unknown database 'orangeprivacy_dev'"

**Problem:** Database not created

**Solution:**
```bash
mysql -u root -p -e "CREATE DATABASE orangeprivacy_dev;"
```

---

### Issue 3: "Cannot find module 'dotenv'" or similar

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend
npm install
```

---

### Issue 4: "ECONNREFUSED ::1:3306"

**Problem:** MySQL server not running

**Solution:**
```bash
# Ubuntu/Debian
sudo systemctl start mysql

# macOS
brew services start mysql

# Or check if it's running
sudo systemctl status mysql
```

---

### Issue 5: "Error: connect ECONNREFUSED 127.0.0.1:3306"

**Problem:** MySQL not accepting connections on localhost

**Solution:**

1. Check MySQL is running:
   ```bash
   sudo systemctl status mysql
   ```

2. Check MySQL port:
   ```bash
   sudo netstat -tlnp | grep 3306
   ```

3. Verify .env settings:
   ```env
   DB_HOST=localhost  # or 127.0.0.1
   DB_PORT=3306
   ```

---

### Issue 6: "Table doesn't exist"

**Problem:** Migrations not run

**Solution:**
```bash
npm run migrate
```

---

### Issue 7: AWS Credentials Warning

**Message:**
```
⚠️  AWS credentials not configured - AWS features disabled
```

**This is NORMAL for local development!**

Features that work WITHOUT AWS:
- ✅ User registration/login
- ✅ Profile management
- ✅ Database operations
- ✅ API endpoints

Features that need AWS:
- ❌ Photo upload
- ❌ Facial recognition
- ❌ Scan jobs

**To enable AWS features later:**
1. Set up AWS account
2. Create S3 bucket and Rekognition collection
3. Add credentials to `.env`:
   ```env
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## What Features Work Without AWS?

### ✅ Working Features
- User registration and authentication
- Login/logout with JWT
- Profile management
- Password hashing (bcrypt)
- Admin endpoints
- Database CRUD operations
- API rate limiting
- CORS protection
- Request logging

### ❌ Features Requiring AWS
- Reference photo upload (needs S3)
- Face indexing (needs Rekognition)
- Scan jobs (needs Rekognition)
- Web scanning (needs Rekognition)

---

## Environment Variables Explained

```env
# Server
NODE_ENV=development          # development or production
PORT=5000                     # Server port
API_URL=http://localhost:5000 # API base URL

# Database (REQUIRED)
DB_HOST=localhost             # MySQL host
DB_PORT=3306                  # MySQL port
DB_NAME=orangeprivacy_dev     # Database name
DB_USER=root                  # MySQL user
DB_PASSWORD=root              # ⚠️ CHANGE THIS to your MySQL password

# JWT (REQUIRED)
JWT_SECRET=orange_privacy_super_secret_jwt_key_12345_change_in_production
JWT_EXPIRES_IN=7d

# AWS (OPTIONAL for development)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=            # Leave blank for now
AWS_SECRET_ACCESS_KEY=        # Leave blank for now

# Redis (OPTIONAL for development)
REDIS_HOST=localhost
REDIS_PORT=6379

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## Database Schema Overview

After running migrations, you'll have these tables:

### users
- User accounts with hashed passwords
- Biometric consent tracking
- Admin role support

### ref_photos
- User reference photos
- AWS Rekognition face IDs
- Photo types (frontal, side, angled)

### scan_jobs
- Scan job queue
- Progress tracking
- Status: queued, processing, completed, failed

### scan_results
- Face match results
- Confidence scores
- User confirmation status

### social_accounts
- Connected social media accounts
- OAuth integration

### oauth_tokens
- Encrypted access tokens
- Token refresh handling

---

## Next Steps

1. **Test the API** - Use curl or Postman to test endpoints
2. **Start Frontend** - Follow frontend/README.md
3. **Configure AWS** (optional) - See ../aws-setup.md
4. **Read API Docs** - Check docs/ folder for endpoint documentation

---

## Quick Reference

### Common Commands
```bash
# Start server
npm run dev

# Run migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Run seeds
npm run seed

# Run tests
npm test
```

### Database Commands
```bash
# Connect to database
mysql -u root -p orangeprivacy_dev

# Show tables
SHOW TABLES;

# Describe table
DESCRIBE users;

# Count records
SELECT COUNT(*) FROM users;

# Drop database (⚠️ DANGER)
DROP DATABASE orangeprivacy_dev;
```

---

## Need More Help?

1. Check logs: The server prints detailed error messages
2. Test database connection: `mysql -u root -p`
3. Verify .env file: `cat .env | grep DB_`
4. Check migrations: `mysql -u root -p orangeprivacy_dev -e "SHOW TABLES;"`
5. Review documentation: `DEVELOPMENT.md`, `WEB_SCANNING_GUIDE.md`

---

## Support

- **GitHub Issues**: [repository-url]/issues
- **Documentation**: See `/docs` folder
- **AWS Setup**: See `../aws-setup.md`
- **Web Scanning**: See `../WEB_SCANNING_GUIDE.md`
