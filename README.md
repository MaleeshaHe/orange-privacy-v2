# OrangePrivacy MVP

A web-based application that helps users discover where their photos appear on the public web using facial recognition powered by AWS Rekognition.

## Overview

OrangePrivacy allows users to:
- Upload 1-3 reference photos
- Run facial recognition scans across the public web
- Connect social media accounts (Facebook, Instagram) to scan user's media
- View matches with source URLs, confidence scores, and provider information
- Manage privacy settings and biometric consent

## Features

### Core Features
- ✅ Secure user authentication (JWT-based)
- ✅ Reference photo upload and management (up to 3 photos)
- ✅ AWS Rekognition integration for facial recognition
- ✅ Scan job queue system (Redis + Bull)
- ✅ Results dashboard with filtering and confidence scores
- ✅ Biometric consent management (GDPR compliant)
- ✅ Privacy modes (standard vs privacy mode)
- ✅ Admin panel for user and system management

### Social Media Integration
- ✅ Facebook OAuth integration
- ✅ Instagram OAuth integration
- ✅ Automatic media syncing
- ✅ Social media scan results

### Security & Privacy
- ✅ Encrypted storage (AES256)
- ✅ HTTPS/TLS required
- ✅ Rate limiting
- ✅ GDPR compliance
- ✅ EU deployment (AWS eu-west-1)
- ✅ 30-day log retention

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Sequelize
- **Queue**: Redis + Bull
- **Cloud**: AWS (S3, Rekognition)
- **Region**: eu-west-1 (Ireland)

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Charts**: Chart.js + react-chartjs-2

## Project Structure

```
orange-privacy-v2/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/          # Utilities and API client
│   │   ├── hooks/        # Custom React hooks
│   │   ├── styles/       # Global styles
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml     # Docker setup
├── package.json          # Root package.json
├── aws-setup.md         # AWS setup guide
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- AWS Account with:
  - S3 bucket
  - Rekognition access
  - IAM credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd orange-privacy-v2
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**

   Copy example files and fill in your values:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Edit `backend/.env`:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=orangeprivacy_dev
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT
   JWT_SECRET=your_secure_jwt_secret

   # AWS
   AWS_REGION=eu-west-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_S3_BUCKET=orangeprivacy-uploads
   AWS_REKOGNITION_COLLECTION_ID=orangeprivacy-faces

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Social Media OAuth
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   INSTAGRAM_CLIENT_ID=your_instagram_client_id
   INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
   ```

   Edit `frontend/.env`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id
   NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your_instagram_client_id
   ```

4. **Set up AWS resources**

   Follow the [AWS Setup Guide](./aws-setup.md) to create:
   - S3 bucket
   - Rekognition collection
   - IAM user with appropriate permissions

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:3000

### Using Docker

Alternatively, use Docker Compose for easier setup:

```bash
# Create .env file with AWS credentials
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

### Reference Photos Endpoints

#### Upload Reference Photo
```http
POST /api/ref-photos
Authorization: Bearer <token>
Content-Type: multipart/form-data

photo: <file>
photoType: frontal|side|other
```

#### Get All Reference Photos
```http
GET /api/ref-photos
Authorization: Bearer <token>
```

#### Delete Reference Photo
```http
DELETE /api/ref-photos/:photoId
Authorization: Bearer <token>
```

### Scan Jobs Endpoints

#### Create Scan Job
```http
POST /api/scan-jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "scanType": "web|social|combined",
  "confidenceThreshold": 80
}
```

#### Get All Scan Jobs
```http
GET /api/scan-jobs?status=completed&limit=20&offset=0
Authorization: Bearer <token>
```

#### Get Scan Job Details
```http
GET /api/scan-jobs/:jobId
Authorization: Bearer <token>
```

### Scan Results Endpoints

#### Get Results for Scan Job
```http
GET /api/scan-results/scan/:scanJobId?minConfidence=80&limit=50
Authorization: Bearer <token>
```

#### Update Result Confirmation
```http
PATCH /api/scan-results/:resultId/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "isConfirmedByUser": true
}
```

### Social Media Endpoints

#### Connect Facebook
```http
POST /api/social-media/facebook/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "<facebook_access_token>"
}
```

#### Sync Social Account
```http
POST /api/social-media/:accountId/sync
Authorization: Bearer <token>
```

### Admin Endpoints

#### Get System Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin_token>
```

#### Get All Users
```http
GET /api/admin/users?search=john&limit=50
Authorization: Bearer <admin_token>
```

## Database Schema

### Users
- id (UUID, PK)
- email (unique)
- password (hashed)
- firstName, lastName
- role (user/admin)
- biometricConsentGiven
- privacyMode (standard/privacy)
- confidenceThreshold

### RefPhotos
- id (UUID, PK)
- userId (FK)
- s3Key, s3Url
- rekognitionFaceId
- photoType (frontal/side/other)
- qualityScore

### ScanJobs
- id (UUID, PK)
- userId (FK)
- status (queued/processing/completed/failed)
- scanType (web/social/combined)
- confidenceThreshold
- progress

### ScanResults
- id (UUID, PK)
- scanJobId (FK)
- sourceUrl
- confidence
- sourceType (web/social_media)
- isConfirmedByUser

### SocialAccounts
- id (UUID, PK)
- userId (FK)
- provider (facebook/instagram)
- providerId
- username

### OAuthTokens
- id (UUID, PK)
- socialAccountId (FK)
- accessToken (encrypted)
- refreshToken (encrypted)
- expiresAt

### SocialMediaItems
- id (UUID, PK)
- socialAccountId (FK)
- providerId
- mediaUrl
- isUserOwned
- isTagged

## Deployment

### Production Deployment on AWS

1. **Provision infrastructure**:
   - EC2 or ECS for application hosting
   - RDS PostgreSQL for database
   - ElastiCache Redis for queue
   - S3 for file storage
   - Application Load Balancer
   - Route 53 for DNS

2. **Build applications**:
   ```bash
   npm run build
   ```

3. **Set environment variables**:
   - Use AWS Secrets Manager or Parameter Store
   - Never commit credentials to git

4. **Run migrations**:
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

5. **Start applications**:
   ```bash
   # Backend
   cd backend && NODE_ENV=production npm start

   # Frontend
   cd frontend && npm start
   ```

6. **Configure SSL/TLS**:
   - Use AWS Certificate Manager
   - Configure ALB for HTTPS

### Environment-Specific Configuration

**Development**: Local PostgreSQL, Redis, mock AWS services
**Staging**: AWS resources with test data
**Production**: Full AWS setup with encryption, backups

## Security Considerations

### GDPR Compliance
- User consent for biometric scanning
- Right to access personal data
- Right to deletion (within 30 days)
- Data minimization
- 30-day log retention

### Data Protection
- Encrypted at rest (S3 AES256, RDS encryption)
- Encrypted in transit (TLS)
- Hashed passwords (bcrypt)
- JWT tokens for authentication
- Rate limiting on API endpoints

### AWS Security
- IAM least privilege access
- VPC for database and cache
- S3 bucket policies
- CloudTrail audit logs
- Regular security audits

## Troubleshooting

### Common Issues

**1. Database connection failed**
- Check PostgreSQL is running
- Verify connection credentials
- Check network connectivity

**2. AWS Rekognition errors**
- Verify AWS credentials
- Check IAM permissions
- Ensure collection exists
- Verify region (eu-west-1)

**3. Redis connection failed**
- Check Redis is running
- Verify connection settings
- Check firewall rules

**4. File upload fails**
- Check S3 bucket exists
- Verify IAM permissions
- Check file size limits (10MB max)

## Cost Optimization

- Use S3 lifecycle policies for temp files
- Implement caching for frequent queries
- Use RDS reserved instances
- Monitor Rekognition API usage
- Set up billing alerts

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues

---

**Note**: This is an MVP. Some features mentioned in the SRS are partially implemented and require further development for production use, particularly:
- Web crawling implementation (currently simulated)
- Advanced provider consensus scoring
- Comprehensive legal compliance features
- Full production hardening