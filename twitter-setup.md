# 🐦 Twitter OAuth Setup Guide

## Step 1: Create Twitter Developer App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter account
3. Click "Create App" or "New Project"
4. Fill in app details:
   - **App Name**: "Paco Jump Contest"
   - **Description**: "A fun jumping game with competitive leaderboards"
   - **Website**: Your domain (or `http://localhost:3000` for testing)
   - **Callback URLs**: `http://localhost:3000/auth/callback`

## Step 2: Get Your Credentials

1. After creating the app, go to "Keys and Tokens"
2. Copy your **Client ID** and **Client Secret**
3. Enable "OAuth 2.0" if not already enabled

## Step 3: Create Environment File

Create a file named `.env` in your project root with:

```env
# Twitter OAuth Configuration
TWITTER_CLIENT_ID=your_actual_client_id_here
TWITTER_CLIENT_SECRET=your_actual_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:3000/auth/callback

# Development
NODE_ENV=development
PORT=3000
```

## Step 4: Update App Permissions

In Twitter Developer Portal:
1. Go to "Settings" tab
2. Set **App Permissions** to "Read and Write" 
3. Enable "Request email from users" (optional)

## Step 5: Test Authentication

1. Start your server: `npm run start`
2. Visit `http://localhost:3000`
3. Click "Connect Twitter" button
4. Should redirect to Twitter auth and back

## Production Setup

For production, update:
- `TWITTER_REDIRECT_URI=https://yourdomain.com/auth/callback`
- Add your production domain to Twitter app settings
- Use environment variables in your hosting platform

## 🎯 Benefits for Contest

✅ **Real Twitter Integration** - Players connect actual accounts
✅ **Viral Sharing** - Easy sharing of high scores and trophies  
✅ **Social Proof** - Real usernames and profile pictures
✅ **Leaderboard Authenticity** - Verified Twitter users
✅ **Contest Marketing** - Players share achievements organically