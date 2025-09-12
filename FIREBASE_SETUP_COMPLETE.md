# Firebase Setup Guide

## Overview
This project uses Firebase for authentication (Email, Phone, Google OAuth) and backend integration.

## Required Configuration

### 1. Firebase Console Setup
1. **Enable Authentication:**
   - Email/Password
   - Phone Authentication (requires Blaze plan)
   - Google OAuth

2. **Add Authorized Domains:**
   - `localhost` (for development)
   - Your production domain

3. **Billing:**
   - Phone Auth requires Blaze plan (pay-as-you-go)
   - Enable billing in Firebase Console

### 2. Google Cloud Console
1. **API Configuration:**
   - Enable Identity Toolkit API
   - Enable Firebase Authentication API
   - Check API key restrictions if issues occur

2. **Service Account:**
   - Create service account key for backend
   - Add to backend as environment variable or file

### 3. Environment Configuration

**Frontend (.env.local):**
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
```

**Backend (.env):**
```env
FIREBASE_SERVICE_ACCOUNT_KEY=path_to_service_account.json
FIREBASE_PROJECT_ID=your-project-id
```

## Common Issues

### Phone Authentication Errors
- **auth/invalid-app-credential**: Enable billing and check API restrictions
- **auth/app-not-authorized**: Add localhost to authorized domains
- **Billing required**: Upgrade to Blaze plan

### API Key Issues
- Check Google Cloud Console → API & Services → Credentials
- Ensure Identity Toolkit API is enabled and allowed
- Temporarily remove API restrictions for testing

## Testing
- Use Firebase test phone numbers for development
- Test with: `+1 555-555-5555` | Code: `123456`

## Files Structure
- `client/src/firebase.js` - Frontend Firebase config
- `routes/auth.js` - Backend Firebase integration
- `middleware/auth.js` - JWT token handling
