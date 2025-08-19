# Email Verification Setup Guide

This guide will help you set up the email verification system for the CRISPR Predict application.

## 🚀 Quick Setup (2 Minutes)

### 1. Environment Configuration

**Option A: Use the template (Recommended)**

```bash
# Copy the template to create your .env file
cp env.template .env
```

**Option B: Create manually**
Create a `.env` file in the root directory with the content from `env.template`, or use these minimal variables:

```bash
# Minimal .env for Ethereal Email setup
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/crispr_prediction
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_change_in_production_make_it_very_long_and_random_123456789
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production_make_it_very_long_and_random_987654321
EMAIL_FROM_NAME=CRISPR Predict
EMAIL_FROM_ADDRESS=noreply@crisprpredict.com
```

> **Note:** Ethereal Email works automatically with these settings - no additional email configuration needed!

## Email Service Setup - Ethereal Email (Default)

### ✅ Ethereal Email (Automatic - No Setup Required)

The system is configured to automatically use **Ethereal Email** for development and testing:

- ✅ **No email credentials needed**
- ✅ **No account setup required**
- ✅ **Automatic configuration**
- ✅ **Professional email previews**
- ✅ **View all sent emails at https://ethereal.email**

**How it works:**

1. When you start the server, it automatically creates a test account
2. All emails are captured and can be viewed online
3. Check the console for email preview URLs
4. Click the URLs to see beautiful email templates

### Alternative Options (Optional)

<details>
<summary>Click to expand other email service options</summary>

#### Gmail Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Update .env:

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

#### SendGrid Setup

1. Create a SendGrid account
2. Generate an API key
3. Update .env:

```bash
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
```

#### Other Services

Supported: Outlook, Yahoo, Mailgun, etc.
Update `EMAIL_SERVICE` and provide appropriate credentials.

</details>

## Frontend Environment Variables

Create a `.env` file in the `client` directory:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
```

## Installation & Setup

### 1. Install Dependencies

**Backend:**

```bash
npm install
```

**Frontend:**

```bash
cd client
npm install
```

### 2. Start the Application

**Backend (Terminal 1):**

```bash
npm run dev
```

**Frontend (Terminal 2):**

```bash
cd client
npm start
```

### 3. MongoDB Setup

Ensure MongoDB is running locally or provide a MongoDB Atlas connection string.

## Features Implemented

### Backend Features

- ✅ **User Model** with email verification fields
- ✅ **JWT Authentication** with refresh tokens
- ✅ **Email Service** with professional templates
- ✅ **Authentication Routes**:
  - `POST /api/auth/signup` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/verify-email` - Email verification
  - `POST /api/auth/resend-verification` - Resend verification
  - `POST /api/auth/refresh-token` - Token refresh
  - `GET /api/auth/me` - Get current user
  - `POST /api/auth/logout` - User logout

### Frontend Features

- ✅ **Updated Auth Component** with API integration
- ✅ **Email Verification Page** with beautiful UI
- ✅ **Protected Routes** with JWT validation
- ✅ **Professional Email Templates**:
  - Email verification
  - Welcome email
  - Password reset (structure ready)

### Security Features

- ✅ **Password Hashing** with bcrypt
- ✅ **JWT Token Validation**
- ✅ **Rate Limiting** on auth endpoints
- ✅ **Account Locking** after failed attempts
- ✅ **Input Validation** with express-validator
- ✅ **CORS Protection**
- ✅ **Helmet Security Headers**

## Email Templates

The system includes professional email templates:

### 1. Verification Email

- Clean, modern design
- Clear call-to-action button
- Expiration warning (24 hours)
- Responsive layout

### 2. Welcome Email

- Congratulatory message
- Feature highlights
- Quick start guide
- Professional branding

### 3. Password Reset (Ready for implementation)

- Security-focused design
- Short expiration time (10 minutes)
- Clear instructions

## User Flow

1. **User signs up** → Account created, verification email sent
2. **User clicks verification link** → Email verified, automatic login
3. **User receives welcome email** → Onboarding complete
4. **Future logins** → JWT-based authentication

## Testing the System with Ethereal Email

### 🚀 Quick Testing Steps

1. **Start the application:**

   ```bash
   # Terminal 1 - Backend
   npm run dev

   # Terminal 2 - Frontend
   cd client && npm start
   ```

2. **Test the email verification:**

   - Navigate to `http://localhost:3000/auth`
   - Create a new account with any email (e.g., `test@example.com`)
   - Watch the console for the email preview URL
   - Click the URL to see the beautiful verification email
   - Click "Verify Email Address" in the email preview
   - Get automatically logged in and receive welcome email

3. **View all emails:**
   - Go to https://ethereal.email
   - All sent emails are captured and viewable
   - Professional HTML templates with beautiful design

### 📧 What You'll See

**Console Output:**

```
📧 Development email setup - Ethereal Email
📧 View emails at: https://ethereal.email
✅ Email service ready
📧 Email sent: https://ethereal.email/message/XXX...
```

**Email Features:**

- ✅ Professional HTML design
- ✅ Responsive layout
- ✅ Clear call-to-action buttons
- ✅ Security warnings and expiration times
- ✅ Beautiful branding and colors

## Troubleshooting

### Common Issues

1. **Email not sending**

   - Check email service credentials
   - Verify SMTP settings
   - Check console for error messages

2. **JWT Token Issues**

   - Ensure JWT_SECRET is set
   - Check token expiration settings
   - Verify client-side token storage

3. **MongoDB Connection**
   - Ensure MongoDB is running
   - Check connection string format
   - Verify database permissions

### Debug Mode

Set `NODE_ENV=development` to enable:

- Detailed error messages
- Console logging
- Ethereal email testing

## Security Considerations

### Production Checklist

- [ ] Change default JWT secrets
- [ ] Use environment-specific email credentials
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure proper CORS origins
- [ ] Set up proper logging
- [ ] Enable rate limiting in production
- [ ] Use strong password policies
- [ ] Set up monitoring and alerts

### Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique JWT secrets** (64+ characters)
3. **Rotate JWT secrets** periodically
4. **Monitor authentication attempts**
5. **Implement proper error handling**
6. **Use HTTPS in production**
7. **Set appropriate token expiration times**

## Next Steps

The email verification system is now complete and ready for use. You can extend it by:

1. Adding password reset functionality
2. Implementing social authentication
3. Adding email notification preferences
4. Creating admin user management
5. Adding account deactivation features

## Support

If you encounter any issues or need assistance, please check:

1. Console error messages
2. Network tab for API responses
3. MongoDB connection status
4. Email service status

The system is designed to be robust and provide clear error messages to help with debugging.
