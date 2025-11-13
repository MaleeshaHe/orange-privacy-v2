# OrangePrivacy - Quick Start Guide

## 🔧 The Issue You Were Having

The `.env` file wasn't working because **MySQL is not installed** on your system.

The backend requires a MySQL database to run, but your system doesn't have MySQL installed yet.

---

## ✅ Solution: Install and Configure MySQL

### **Option 1: Automated Setup (Easiest)** ⚡

Run this single command to set everything up automatically:

```bash
cd backend
./setup-mysql.sh
```

This script will:
- Check if MySQL is installed
- Help you install it if needed
- Create the database automatically
- Configure your .env file
- Test the connection

Then continue with:

```bash
npm install
npm run migrate
npm run dev
```

---

### **Option 2: Manual Setup** 🔧

If you prefer to do it manually:

#### Step 1: Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server -y
sudo systemctl start mysql
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
Download from https://dev.mysql.com/downloads/mysql/

#### Step 2: Set MySQL Password

```bash
sudo mysql
```

Then in MySQL:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root';
FLUSH PRIVILEGES;
EXIT;
```

#### Step 3: Create Database

```bash
mysql -u root -proot -e "CREATE DATABASE orangeprivacy_dev;"
```

#### Step 4: Update .env File

The `.env` file already exists at `backend/.env`.

Check that `DB_PASSWORD` matches your MySQL password:

```env
DB_PASSWORD=root
```

If your MySQL password is different (blank, "password", etc.), update it accordingly.

#### Step 5: Install Dependencies and Run

```bash
cd backend
npm install
npm run migrate
npm run dev
```

---

## 🧪 Test Everything is Working

Once the server starts, test it:

```bash
# In a new terminal
curl http://localhost:5000/health
```

You should see:
```json
{"status":"ok","timestamp":"..."}
```

Register a test user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","firstName":"Test","lastName":"User"}'
```

---

## 📁 What's Been Fixed

✅ **backend/.env** - Updated with correct MySQL password (DB_PASSWORD=root)
✅ **backend/setup-mysql.sh** - Automated setup script
✅ **backend/SETUP.md** - Comprehensive manual setup guide
✅ **Dependencies installed** - All npm packages ready

---

## Common MySQL Passwords

Try these common passwords if you're not sure:

1. `root` (most common)
2. `password`
3. `` (blank - no password)
4. `mysql`

Test which one works:
```bash
mysql -u root -p
# Enter password when prompted
```

Then update `backend/.env`:
```env
DB_PASSWORD=your_working_password
```

---

## ⚠️ Expected Warnings

When you run `npm run dev`, you'll see this warning:

```
⚠️  AWS credentials not configured - AWS features disabled
```

**This is NORMAL!** You don't need AWS for basic development.

### What Works Without AWS:
- ✅ User registration and login
- ✅ Profile management
- ✅ JWT authentication
- ✅ All database operations

### What Needs AWS:
- ❌ Photo upload (S3)
- ❌ Facial recognition (Rekognition)
- ❌ Scan jobs

---

## 📚 Full Documentation

For more detailed information:

- **Backend Setup**: `backend/SETUP.md`
- **Development Guide**: `backend/DEVELOPMENT.md`
- **Web Scanning**: `WEB_SCANNING_GUIDE.md`
- **AWS Setup**: `aws-setup.md` (when you're ready)

---

## 🆘 Still Having Issues?

### Issue: "Access denied for user 'root'@'localhost'"

**Solution:** Wrong password in .env file

1. Test connection:
   ```bash
   mysql -u root -p
   ```

2. Note which password works

3. Update `backend/.env`:
   ```env
   DB_PASSWORD=your_working_password
   ```

### Issue: "Unknown database 'orangeprivacy_dev'"

**Solution:** Database not created

```bash
mysql -u root -p -e "CREATE DATABASE orangeprivacy_dev;"
```

### Issue: "ECONNREFUSED ::1:3306"

**Solution:** MySQL not running

```bash
sudo systemctl start mysql
# or
brew services start mysql
```

### Issue: "Table doesn't exist"

**Solution:** Run migrations

```bash
cd backend
npm run migrate
```

---

## 🚀 Quick Command Reference

```bash
# Setup (first time)
cd backend
./setup-mysql.sh                 # Automated setup
npm install                      # Install dependencies
npm run migrate                  # Create database tables

# Daily development
npm run dev                      # Start server
npm run migrate                  # Run new migrations
npm run migrate:undo             # Undo last migration

# Testing
curl http://localhost:5000/health  # Check server
mysql -u root -p orangeprivacy_dev # Connect to DB
```

---

## Summary

**The problem:** MySQL wasn't installed, so the `.env` file couldn't connect to a database.

**The solution:** Install MySQL, create the database, and ensure the password in `.env` matches your MySQL root password.

**Current status:**
- ✅ .env file updated (DB_PASSWORD=root)
- ✅ Setup script created (setup-mysql.sh)
- ✅ Dependencies installed
- ⏳ Waiting for you to install MySQL

**Next step:** Run `./backend/setup-mysql.sh` or follow the manual setup steps above.
