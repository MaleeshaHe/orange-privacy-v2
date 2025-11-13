# Backend Setup Guide

## Quick Setup (5 minutes)

### Step 1: Check if MySQL is Running

```powershell
# Check if MySQL service is running
Get-Service -Name MySQL* | Select-Object Name, Status

# Or try to connect
mysql -u root -p
```

If MySQL is not installed, download from: https://dev.mysql.com/downloads/mysql/

### Step 2: Update Database Password in .env

The `.env` file has been created for you. Update the MySQL password:

**Open `backend\.env` and change this line:**
```env
DB_PASSWORD=
```

**To your MySQL root password:**
```env
DB_PASSWORD=your_actual_mysql_password
```

If you don't have a password, leave it blank:
```env
DB_PASSWORD=
```

### Step 3: Create Database

```powershell
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE orangeprivacy_dev;

# Exit
exit;
```

### Step 4: Install Dependencies

```powershell
npm install
```

### Step 5: Run Migrations

```powershell
npm run migrate
```

### Step 6: Start Server

```powershell
npm run dev
```

---

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution:** Update `DB_PASSWORD` in `.env` with correct MySQL password

```env
DB_PASSWORD=your_correct_password
```

### Error: "Unknown database 'orangeprivacy_dev'"

**Solution:** Create the database first

```powershell
mysql -u root -p -e "CREATE DATABASE orangeprivacy_dev;"
```

### Error: "Cannot find module 'dotenv'"

**Solution:** Install dependencies

```powershell
npm install
```

### Error: "ECONNREFUSED ::1:3306"

**Solution:** MySQL is not running. Start MySQL service:

```powershell
# Start MySQL service
net start MySQL80

# Or if using XAMPP
# Start from XAMPP Control Panel
```

---

## What Should Work Without AWS

✅ Server starts successfully
✅ Database connection
✅ User registration
✅ User login
✅ JWT authentication
✅ Profile management
✅ Admin endpoints

❌ Photo upload (needs AWS)
❌ Facial recognition (needs AWS)
❌ Scan jobs (needs AWS)

---

## Test if It's Working

```powershell
# 1. Check server is running
curl http://localhost:5000/health

# 2. Register a user
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"Password123\",\"firstName\":\"Test\",\"lastName\":\"User\"}'

# 3. Login
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"Password123\"}'
```

If these work, your backend is configured correctly! ✅
