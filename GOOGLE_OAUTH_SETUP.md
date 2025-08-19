# Google OAuth Setup Guide

## Current Error: "Error 401: invalid_client"

This error occurs because the Google Cloud Console project needs proper configuration for localhost development.

## Quick Fix Steps:

### 1. Configure Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project** or create a new one
3. **Navigate to: APIs & Services > Credentials**
4. **Click on your OAuth 2.0 Client ID**
5. **Add these Authorized redirect URIs:**
   ```
   http://localhost:3000
   http://localhost:3000/auth
   http://localhost:3000/login
   ```
6. **Add these Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```
7. **Click Save**

### 2. Alternative: Create New OAuth Client

If you don't have access to the current client, create a new one:

1. **In Google Cloud Console > Credentials**
2. **Click "Create Credentials" > "OAuth client ID"**
3. **Choose "Web application"**
4. **Add the redirect URIs and origins from above**
5. **Copy the new Client ID**
6. **Replace the Client ID in `client/src/index.js`**

### 3. Environment Variable Setup (Optional)

Create a `.env` file in the `client` folder:

```env
REACT_APP_GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
```

## Current Client ID in Code:

```
997303148296-0jbo5khvg1vqm7fo7cmqdij00j710oel.apps.googleusercontent.com
```

## Testing Without Google OAuth

For now, you can test the app using the email/password login:

- **Email:** kmit@example.com
- **Password:** kmit

The app has a beautiful dark theme and all features work without Google OAuth!
