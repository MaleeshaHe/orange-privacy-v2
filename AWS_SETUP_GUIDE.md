# AWS Setup Guide for OrangePrivacy

Complete guide to configure AWS S3 and Rekognition for OrangePrivacy facial recognition features.

## 📋 Prerequisites

- AWS Account (create at https://aws.amazon.com if you don't have one)
- Credit card for AWS billing (most usage will be within free tier)
- Backend setup completed

## 🎯 Overview

OrangePrivacy uses two AWS services:
1. **Amazon S3** - Store reference photos
2. **Amazon Rekognition** - Facial recognition and comparison

**Estimated Monthly Cost:**
- Development/Testing: $0 - $5 (within free tier)
- Production (100 users): $10 - $50
- Production (1000 users): $50 - $200

---

## 📝 Step 1: Create AWS Account

If you don't have an AWS account:

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the registration process
4. Provide payment information (required even for free tier)
5. Verify your identity (phone verification)
6. Choose "Basic Support - Free" plan

**Note:** AWS offers a free tier for 12 months with limited usage.

---

## 🪣 Step 2: Create S3 Bucket

### 2.1 Navigate to S3

1. Sign in to AWS Console: https://console.aws.amazon.com
2. Search for "S3" in the top search bar
3. Click "Amazon S3"

### 2.2 Create Bucket

1. Click **"Create bucket"** button

2. **Bucket name:** `orangeprivacy-photos-[your-unique-id]`
   - Must be globally unique
   - Example: `orangeprivacy-photos-john-2025`
   - Use lowercase, numbers, and hyphens only

3. **AWS Region:** Choose closest to your users
   - US East (N. Virginia): `us-east-1`
   - Europe (Ireland): `eu-west-1`
   - Asia Pacific (Singapore): `ap-southeast-1`
   - **Note down this region!**

4. **Block Public Access settings:**
   - ✅ **Keep all checkboxes CHECKED**
   - We don't want photos to be publicly accessible

5. **Bucket Versioning:**
   - Select "Disable" (saves costs)

6. **Default encryption:**
   - Select "Server-side encryption with Amazon S3 managed keys (SSE-S3)"

7. Click **"Create bucket"**

### 2.3 Configure CORS (Important!)

1. Click on your newly created bucket
2. Go to **"Permissions"** tab
3. Scroll down to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

6. Click **"Save changes"**

**Note:** Update `AllowedOrigins` with your production domain when deploying.

---

## 👁️ Step 3: Set Up AWS Rekognition

### 3.1 Enable Rekognition

AWS Rekognition is enabled by default in most regions. Just ensure your chosen region supports it.

**Supported Regions:**
- US East (N. Virginia) - `us-east-1` ✅
- US West (Oregon) - `us-west-2` ✅
- Europe (Ireland) - `eu-west-1` ✅
- Asia Pacific (Singapore) - `ap-southeast-1` ✅

### 3.2 No Additional Setup Required

The backend will automatically:
- Create a Rekognition collection named `orangeprivacy-faces`
- Index faces from uploaded photos
- Compare faces during scans

---

## 🔐 Step 4: Create IAM User

### 4.1 Navigate to IAM

1. In AWS Console, search for **"IAM"**
2. Click **"Identity and Access Management (IAM)"**

### 4.2 Create New User

1. Click **"Users"** in left sidebar
2. Click **"Create user"** button
3. **User name:** `orangeprivacy-app`
4. Click **"Next"**

### 4.3 Set Permissions

1. Select **"Attach policies directly"**

2. Search and select these policies:
   - ✅ **`AmazonS3FullAccess`** (for photo storage)
   - ✅ **`AmazonRekognitionFullAccess`** (for facial recognition)

   **Security Note:** In production, create a custom policy with minimal permissions (see Step 6).

3. Click **"Next"**

4. Review and click **"Create user"**

### 4.4 Create Access Key

1. Click on the newly created user (`orangeprivacy-app`)
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **"Next"**
7. (Optional) Add description: "OrangePrivacy Backend"
8. Click **"Create access key"**

### 4.5 Save Credentials

**⚠️ IMPORTANT:** You can only see the secret key once!

```
Access Key ID: AKIAXXXXXXXXXXXXXXXX
Secret Access Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy both immediately and save them securely!**

---

## ⚙️ Step 5: Configure Backend

### 5.1 Update .env File

Open `backend/.env` and update:

```env
# AWS Configuration
AWS_REGION=us-east-1                    # Your chosen region
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX  # From Step 4.5
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # From Step 4.5
AWS_S3_BUCKET=orangeprivacy-photos-john-2025  # Your bucket name from Step 2.2

# Rekognition Collection (automatically created)
REKOGNITION_COLLECTION_ID=orangeprivacy-faces
```

### 5.2 Restart Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
🚀 Server is running on port 5000
✓ Database connection established successfully
✓ AWS Rekognition initialized successfully
✓ Rekognition collection 'orangeprivacy-faces' ready
```

If you see the AWS success messages, you're good to go! ✅

---

## 🧪 Step 6: Test AWS Integration

### 6.1 Test Photo Upload

1. Start backend and frontend
2. Register/login to OrangePrivacy
3. Navigate to **Reference Photos** page
4. Upload a photo with your face

**What happens:**
```
1. Photo uploaded to backend
2. Backend uploads to S3: s3://your-bucket/reference-photos/user-id/photo.jpg
3. Rekognition analyzes the photo
4. Face indexed in 'orangeprivacy-faces' collection
5. Face ID stored in database
```

### 6.2 Verify in AWS Console

**Check S3:**
1. Go to S3 Console
2. Open your bucket
3. Navigate to `reference-photos/[user-id]/`
4. You should see your uploaded photo

**Check Rekognition:**
1. Go to Rekognition Console
2. Click "Collections" (left sidebar)
3. Find `orangeprivacy-faces`
4. You should see 1 indexed face

### 6.3 Test with curl

```bash
# Get a JWT token first (login)
TOKEN="your-jwt-token-here"

# Upload a photo
curl -X POST http://localhost:5000/api/ref-photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photo=@/path/to/your/photo.jpg" \
  -F "photoType=frontal"
```

**Expected response:**
```json
{
  "message": "Reference photo uploaded successfully",
  "refPhoto": {
    "id": "...",
    "photoUrl": "https://orangeprivacy-photos-john-2025.s3.us-east-1.amazonaws.com/...",
    "rekognitionFaceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "isActive": true
  }
}
```

---

## 🔒 Step 7: Production Security (Recommended)

### 7.1 Create Custom IAM Policy

Instead of using full access policies, create a minimal permission policy:

1. Go to IAM → Policies → Create policy
2. Select JSON and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3PhotoAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::orangeprivacy-photos-*/*",
                "arn:aws:s3:::orangeprivacy-photos-*"
            ]
        },
        {
            "Sid": "RekognitionFaceAccess",
            "Effect": "Allow",
            "Action": [
                "rekognition:CreateCollection",
                "rekognition:IndexFaces",
                "rekognition:SearchFacesByImage",
                "rekognition:CompareFaces",
                "rekognition:DeleteFaces",
                "rekognition:DescribeCollection",
                "rekognition:ListCollections"
            ],
            "Resource": "*"
        }
    ]
}
```

3. Name it: `OrangePrivacyMinimalAccess`
4. Create policy
5. Attach to your IAM user (remove the full access policies)

### 7.2 Enable MFA for IAM User

1. Go to IAM → Users → `orangeprivacy-app`
2. Security credentials tab
3. Assign MFA device
4. Follow the setup wizard

### 7.3 Rotate Access Keys Regularly

Set a reminder to rotate your access keys every 90 days:

1. Create new access key
2. Update .env with new credentials
3. Test the application
4. Delete old access key

---

## 💰 Cost Estimation

### AWS Free Tier (First 12 Months)

**S3:**
- 5 GB storage: **FREE**
- 20,000 GET requests: **FREE**
- 2,000 PUT requests: **FREE**

**Rekognition:**
- 1,000 images per month for face detection: **FREE**
- 1,000 face searches per month: **FREE**

### After Free Tier

**S3 Storage:**
- $0.023 per GB/month
- 1000 photos (~5GB): **$0.12/month**

**S3 Requests:**
- $0.0004 per 1,000 PUT requests
- $0.0004 per 1,000 GET requests
- 10,000 operations: **$0.004/month**

**Rekognition:**
- Face detection: $0.001 per image
- Face search: $0.001 per search
- 1,000 operations: **$1.00/month**

**Total Monthly Cost (After Free Tier):**
- Small app (100 users): **$2 - $10/month**
- Medium app (1,000 users): **$10 - $50/month**

---

## 🚨 Troubleshooting

### Error: "Access Denied"

**Problem:** IAM user doesn't have required permissions

**Solution:**
1. Check IAM policies attached to user
2. Ensure `AmazonS3FullAccess` and `AmazonRekognitionFullAccess` are attached
3. Wait 5 minutes for changes to propagate

### Error: "Bucket does not exist"

**Problem:** Bucket name in .env doesn't match actual bucket

**Solution:**
1. Check S3 console for exact bucket name
2. Update `AWS_S3_BUCKET` in .env
3. Restart backend

### Error: "InvalidSignatureException"

**Problem:** Wrong AWS credentials

**Solution:**
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in .env
2. Ensure no extra spaces or quotes
3. Recreate access key if needed

### Error: "Region not supported"

**Problem:** Rekognition not available in chosen region

**Solution:**
1. Use supported regions: `us-east-1`, `us-west-2`, `eu-west-1`
2. Update `AWS_REGION` in .env
3. Consider moving S3 bucket to supported region

### Photos Upload But Rekognition Fails

**Problem:** Rekognition policy missing

**Solution:**
1. Check IAM user has `AmazonRekognitionFullAccess`
2. Verify region supports Rekognition
3. Check backend logs for specific error

---

## 📊 Monitoring AWS Usage

### CloudWatch

1. Go to CloudWatch console
2. Click "Dashboards"
3. Monitor:
   - S3 storage usage
   - Rekognition API calls
   - Request errors

### Cost Explorer

1. Go to Billing console
2. Click "Cost Explorer"
3. View costs by service
4. Set up billing alerts

### Set Budget Alert

1. AWS Console → Billing → Budgets
2. Create budget
3. Set alert at $10/month
4. Get email notifications when exceeded

---

## ✅ Verification Checklist

- [ ] AWS account created and verified
- [ ] S3 bucket created with unique name
- [ ] CORS configured on S3 bucket
- [ ] IAM user created (`orangeprivacy-app`)
- [ ] S3 and Rekognition policies attached
- [ ] Access key and secret key generated
- [ ] Credentials saved securely
- [ ] Backend `.env` updated with AWS credentials
- [ ] Backend restarted successfully
- [ ] Backend logs show "AWS Rekognition initialized"
- [ ] Test photo upload works
- [ ] Photo visible in S3 console
- [ ] Face indexed in Rekognition collection

---

## 🎓 Additional Resources

- **AWS Free Tier:** https://aws.amazon.com/free/
- **S3 Documentation:** https://docs.aws.amazon.com/s3/
- **Rekognition Documentation:** https://docs.aws.amazon.com/rekognition/
- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **AWS Pricing Calculator:** https://calculator.aws/

---

## 🆘 Need Help?

**Backend Logs:**
```bash
cd backend
npm run dev
# Watch for AWS-related errors
```

**Test AWS Credentials:**
```bash
# Install AWS CLI (optional)
aws configure
aws s3 ls s3://your-bucket-name/
```

**Common Issues:**
1. Wrong region in .env
2. Typo in bucket name
3. Missing IAM permissions
4. Access key not active
5. CORS not configured

---

## 🎉 Success!

Once you see these messages in your backend logs:
```
✓ AWS Rekognition initialized successfully
✓ Rekognition collection 'orangeprivacy-faces' ready
```

Your AWS setup is complete! Users can now:
- ✅ Upload reference photos
- ✅ Create scan jobs
- ✅ Get facial recognition matches
- ✅ Use all OrangePrivacy features

---

**Setup Complete! 🚀**

Your OrangePrivacy application is now fully integrated with AWS services and ready for facial recognition!
