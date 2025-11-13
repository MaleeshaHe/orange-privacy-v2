# OAuth Setup Guide for Social Media Connections

This guide explains how to set up OAuth authentication for Facebook and Instagram in OrangePrivacy.

## Overview

OrangePrivacy supports two methods for connecting social media accounts:

1. **OAuth 2.0 Flow** (Recommended) - Secure, user-friendly popup authentication
2. **Manual Access Token** - For advanced users with existing tokens

## Prerequisites

- Facebook Developer Account
- Facebook App with appropriate permissions
- For Instagram: Facebook App with Instagram Basic Display enabled

## Step-by-Step Setup

### 1. Create a Facebook App

1. Go to [Facebook for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as the app type
4. Fill in app details:
   - **App Name**: OrangePrivacy (or your preferred name)
   - **App Contact Email**: Your email
5. Click "Create App"

### 2. Configure Facebook Login

1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" as the platform
4. Enter your site URL: `http://localhost:3000` (for development)
5. Go to **Settings** → **Basic**:
   - Note your **App ID**
   - Note your **App Secret**
6. Go to **Facebook Login** → **Settings**:
   - Add Valid OAuth Redirect URIs:
     ```
     http://localhost:5000/api/social-media/facebook/callback
     http://localhost:3000/dashboard/social
     ```
   - Save changes

### 3. Configure Facebook Permissions

1. Go to **App Review** → **Permissions and Features**
2. Request access to:
   - `public_profile` (usually approved by default)
   - `email` (usually approved by default)
   - `user_photos` (requires app review for production)

**Note**: For development and testing, you can use **Development Mode** which allows testing with accounts that have roles in your app (Admin, Developer, Tester).

### 4. Setup Instagram Basic Display (Optional)

If you want Instagram support:

1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Go to **Instagram Basic Display** → **Basic Display**
4. Click "Create New App"
5. Fill in:
   - **Display Name**: OrangePrivacy
   - **Valid OAuth Redirect URIs**:
     ```
     http://localhost:5000/api/social-media/instagram/callback
     http://localhost:3000/dashboard/social
     ```
   - **Deauthorize Callback URL**: `http://localhost:5000/api/social-media/instagram/callback`
   - **Data Deletion Request URL**: `http://localhost:5000/api/social-media/instagram/delete`
6. Save and note your **Instagram App ID** and **Instagram App Secret**

### 5. Configure Backend Environment Variables

Edit `backend/.env` and add your app credentials:

```env
# Social Media OAuth - Fill with your app credentials
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/social-media/facebook/callback

INSTAGRAM_CLIENT_ID=your_instagram_app_id_here
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret_here
INSTAGRAM_CALLBACK_URL=http://localhost:5000/api/social-media/instagram/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 6. Add Test Users (For Development)

Since user_photos permission requires app review, you'll need to add test users:

1. Go to your Facebook App Dashboard
2. Navigate to **Roles** → **Test Users**
3. Click "Add" to create test users
4. Use these test accounts to connect to OrangePrivacy

### 7. Restart Backend Server

After updating `.env`, restart your backend:

```bash
cd backend
npm run dev
```

## Testing OAuth Flow

### Test Facebook Connection

1. Start both backend and frontend servers:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Navigate to `http://localhost:3000/dashboard/social`
3. Click "Connect Facebook" button
4. A popup window will open with Facebook's OAuth dialog
5. Login with your test user account
6. Authorize the app
7. You'll be redirected back and see your connected account

### Test Instagram Connection

Same process as Facebook, but click "Connect Instagram" instead.

## OAuth Flow Architecture

### How It Works

1. **User clicks "Connect Facebook/Instagram"**
   - Frontend calls `/api/social-media/facebook/oauth` or `/api/social-media/instagram/oauth`
   - Backend generates a secure random state token for CSRF protection
   - Backend stores state token with user ID (expires in 10 minutes)
   - Backend returns OAuth authorization URL

2. **Frontend opens OAuth popup**
   - Opens Facebook/Instagram authorization page in popup window
   - User logs in and authorizes permissions

3. **OAuth provider redirects to callback**
   - Facebook/Instagram redirects to `/api/social-media/facebook/callback`
   - Backend receives authorization code and state
   - Backend verifies state token matches
   - Backend exchanges authorization code for access token

4. **Backend creates social account**
   - Fetches user profile from Facebook/Instagram API
   - Creates/updates SocialAccount record
   - Stores encrypted access token in OAuthToken table
   - Redirects user to frontend with success message

5. **Frontend shows connected account**
   - User sees their newly connected account
   - Can now sync photos and run facial recognition scans

### Security Features

- **CSRF Protection**: Random state tokens prevent cross-site request forgery
- **Token Encryption**: Access tokens are stored encrypted in database
- **Short-lived States**: OAuth states expire after 10 minutes
- **Secure Callbacks**: Validates all callback parameters before processing
- **User Isolation**: Each user can only access their own social accounts

## Troubleshooting

### "OAuth not configured" Error

**Problem**: Backend .env is missing Facebook/Instagram credentials

**Solution**: Add your app credentials to `backend/.env` (see step 5)

### "Popup was blocked" Error

**Problem**: Browser is blocking popups

**Solution**:
- Allow popups for localhost:3000
- Or use "Manual Token" option instead

### "Invalid OAuth redirect URI" Error

**Problem**: Callback URL not registered with Facebook/Instagram

**Solution**:
- Add `http://localhost:5000/api/social-media/facebook/callback` to your app settings
- Make sure the URL exactly matches (no trailing slash)

### "User denied permission" Error

**Problem**: User clicked "Cancel" in OAuth dialog

**Solution**: This is normal - user chose not to connect. Try again if desired.

### "Failed to fetch profile" Error

**Problem**: Access token is invalid or expired

**Solution**:
- Reconnect the account
- Check if app is still in Development Mode
- Verify app permissions are granted

## Production Deployment

### Before Going Live

1. **Submit for App Review**:
   - Facebook requires app review for `user_photos` permission
   - Instagram requires app review for basic access
   - Prepare detailed explanations of why you need these permissions

2. **Update Environment Variables**:
   ```env
   FACEBOOK_CALLBACK_URL=https://yourdomain.com/api/social-media/facebook/callback
   INSTAGRAM_CALLBACK_URL=https://yourdomain.com/api/social-media/instagram/callback
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Update App Settings**:
   - Add production URLs to Valid OAuth Redirect URIs
   - Switch app from Development Mode to Live Mode
   - Set up proper data deletion callback endpoints

4. **Security Considerations**:
   - Use HTTPS for all endpoints
   - Implement rate limiting
   - Consider using Redis for OAuth state storage instead of in-memory Map
   - Regularly rotate app secrets
   - Monitor for suspicious activity

## Manual Token Fallback

If OAuth is not configured or you prefer manual control:

1. Click "Use Manual Token" button
2. Get access token from:
   - **Facebook**: [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - **Instagram**: Generate via Facebook App's User Token Generator
3. Paste token and click "Connect"

### Getting Manual Tokens

**Facebook**:
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Grant permissions: `public_profile`, `user_photos`
5. Copy the generated token

**Instagram**:
1. Go to your Facebook App Dashboard
2. Navigate to **Instagram Basic Display** → **User Token Generator**
3. Click "Generate Token" for a test user
4. Copy the token

## API Reference

### Backend Endpoints

- `GET /api/social-media/facebook/oauth` - Initiate Facebook OAuth (requires auth)
- `GET /api/social-media/facebook/callback` - Facebook OAuth callback
- `GET /api/social-media/instagram/oauth` - Initiate Instagram OAuth (requires auth)
- `GET /api/social-media/instagram/callback` - Instagram OAuth callback
- `POST /api/social-media/facebook/connect` - Connect via manual token
- `POST /api/social-media/instagram/connect` - Connect via manual token
- `GET /api/social-media` - Get connected accounts
- `POST /api/social-media/:accountId/sync` - Sync photos from account
- `POST /api/social-media/:accountId/disconnect` - Disconnect account

### Frontend API Methods

```typescript
// OAuth flows
socialMediaAPI.getFacebookOAuthUrl() // Returns { authUrl }
socialMediaAPI.getInstagramOAuthUrl() // Returns { authUrl }

// Manual token connections
socialMediaAPI.connectFacebook({ accessToken, refreshToken? })
socialMediaAPI.connectInstagram({ accessToken, refreshToken? })

// Account management
socialMediaAPI.getAll() // List connected accounts
socialMediaAPI.sync(accountId) // Sync photos
socialMediaAPI.disconnect(accountId) // Disconnect account
```

## Support

For issues or questions:
- Check Facebook Developer documentation: https://developers.facebook.com/docs
- Check Instagram Basic Display docs: https://developers.facebook.com/docs/instagram-basic-display-api
- Review backend logs for detailed error messages
- Open an issue on GitHub

## Next Steps

After connecting accounts:
1. Click "Sync" to fetch photos from connected accounts
2. Upload reference photos of yourself
3. Run a scan to find matches across your social media photos
4. Review scan results in the Results page
