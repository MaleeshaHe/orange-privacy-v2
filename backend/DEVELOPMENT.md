# OrangePrivacy Backend

## Quick Start for Local Development

### Without AWS (Basic Testing)

If you just want to test the API without AWS services:

1. **Create `.env` file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure only database (leave AWS blank for now):**
   ```env
   # Database Configuration (MySQL)
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=orangeprivacy_dev
   DB_USER=root
   DB_PASSWORD=your_mysql_password

   # JWT Authentication
   JWT_SECRET=your_secure_random_string_here

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start MySQL and Redis:**
   ```bash
   # Using Docker
   docker-compose up -d mysql redis

   # Or use local installations
   ```

4. **Run migrations:**
   ```bash
   npm install
   npm run migrate
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```

The server will start without AWS features. You can test authentication, user management, and database operations.

### With Full AWS Integration

To enable photo uploads and facial recognition:

1. **Set up AWS (see ../aws-setup.md for details)**

2. **Add AWS credentials to `.env`:**
   ```env
   AWS_REGION=eu-west-1
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   AWS_S3_BUCKET=orangeprivacy-uploads
   AWS_REKOGNITION_COLLECTION_ID=orangeprivacy-faces
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

## Features Available Without AWS

✅ User registration and login
✅ Profile management
✅ Biometric consent management
✅ Admin panel APIs
✅ Database operations

## Features Requiring AWS

❌ Reference photo upload
❌ Facial recognition
❌ Scan jobs
❌ Web scanning

## Common Issues

### Error: Missing credentials in config

**Solution:** Either configure AWS credentials in `.env` or ignore the warning for local development. The server will still run for non-AWS features.

### Database connection failed

**Solution:** Make sure MySQL is running and credentials in `.env` are correct.

```bash
# Check if MySQL is running
docker ps | grep mysql

# Or connect manually
mysql -u root -p
```

### Redis connection failed

**Solution:** Make sure Redis is running.

```bash
# Check if Redis is running
docker ps | grep redis

# Or test connection
redis-cli ping
```
