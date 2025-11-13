# AWS Setup Guide for OrangePrivacy MVP

This guide will help you set up the required AWS services for OrangePrivacy MVP.

## Prerequisites

- AWS Account
- AWS CLI installed and configured
- Appropriate IAM permissions

## Required AWS Services

1. **Amazon S3** - For storing reference photos
2. **Amazon Rekognition** - For facial recognition
3. **RDS PostgreSQL** (Production) - For database
4. **ElastiCache Redis** (Production) - For job queue
5. **EC2 or ECS** (Production) - For hosting

## Step 1: Create S3 Bucket

```bash
# Create S3 bucket in EU region
aws s3 mb s3://orangeprivacy-uploads --region eu-west-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket orangeprivacy-uploads \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket orangeprivacy-uploads \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket orangeprivacy-uploads \
  --versioning-configuration Status=Enabled

# Set lifecycle policy to delete temp files after 1 day
aws s3api put-bucket-lifecycle-configuration \
  --bucket orangeprivacy-uploads \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteTempFiles",
      "Status": "Enabled",
      "Prefix": "temp/",
      "Expiration": {
        "Days": 1
      }
    }]
  }'
```

## Step 2: Set up Rekognition Collection

The application will automatically create the Rekognition collection on startup. However, you can create it manually:

```bash
# Create Rekognition collection
aws rekognition create-collection \
  --collection-id orangeprivacy-faces \
  --region eu-west-1

# List collections to verify
aws rekognition list-collections --region eu-west-1
```

## Step 3: Create IAM User with Required Permissions

Create an IAM user with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::orangeprivacy-uploads",
        "arn:aws:s3:::orangeprivacy-uploads/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateCollection",
        "rekognition:ListCollections",
        "rekognition:DescribeCollection",
        "rekognition:IndexFaces",
        "rekognition:SearchFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces",
        "rekognition:DetectFaces",
        "rekognition:CompareFaces"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
# Create IAM user
aws iam create-user --user-name orangeprivacy-app

# Create and attach policy
aws iam create-policy \
  --policy-name OrangePrivacyAppPolicy \
  --policy-document file://iam-policy.json

aws iam attach-user-policy \
  --user-name orangeprivacy-app \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/OrangePrivacyAppPolicy

# Create access key
aws iam create-access-key --user-name orangeprivacy-app
```

Save the Access Key ID and Secret Access Key for your `.env` file.

## Step 4: Set up RDS MySQL (Production)

```bash
# Create RDS MySQL instance
aws rds create-db-instance \
  --db-instance-identifier orangeprivacy-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --vpc-security-group-ids sg-XXXXXXXX \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --region eu-west-1
```

## Step 5: Set up ElastiCache Redis (Production)

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id orangeprivacy-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name your-subnet-group \
  --security-group-ids sg-XXXXXXXX \
  --region eu-west-1
```

## Step 6: Configure CORS for S3 (if serving images directly)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

```bash
aws s3api put-bucket-cors \
  --bucket orangeprivacy-uploads \
  --cors-configuration file://cors.json
```

## Step 7: Update Environment Variables

Update your `.env` files with the AWS credentials and resource names:

```env
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=orangeprivacy-uploads
AWS_REKOGNITION_COLLECTION_ID=orangeprivacy-faces
```

## Cost Estimation (Monthly)

For MVP with moderate usage:

- **S3**: ~$5-10 (storage + requests)
- **Rekognition**: ~$20-50 (based on number of face operations)
- **RDS db.t3.micro**: ~$15-20
- **ElastiCache cache.t3.micro**: ~$12-15
- **Data Transfer**: ~$5-10

**Total Estimated**: $60-105/month

## Security Best Practices

1. Enable MFA on AWS root account
2. Use IAM roles instead of access keys when possible
3. Rotate access keys regularly
4. Enable CloudTrail for audit logging
5. Set up CloudWatch alarms for unusual activity
6. Enable S3 bucket versioning and encryption
7. Use VPC for RDS and ElastiCache
8. Implement least privilege access

## Monitoring

Set up CloudWatch alarms for:

- Rekognition API throttling
- S3 bucket size
- RDS CPU/Memory usage
- ElastiCache connections

## Backup Strategy

- RDS: Automated daily backups (7-day retention)
- S3: Versioning enabled
- Regular snapshots of RDS before major updates

## Data Retention

According to GDPR requirements:

- Reference photos: Retain as long as user consents
- Scan results: 30 days (configurable)
- Logs: 30 days maximum
- Delete user data within 30 days of account deletion request
