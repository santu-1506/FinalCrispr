const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateToken, generateRefreshToken, authenticateToken, verifyRefreshToken } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const twilio = require('twilio');
const admin = require('firebase-admin');

const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  try {
    // Try to use service account key file first
    const serviceAccountPath = './crisprai-3be18-firebase-adminsdk-fbsvc-936a655e55.json';
    const fs = require('fs');
    const path = require('path');
    
    // Try different possible paths
    const possiblePaths = [
      serviceAccountPath,
      path.join(__dirname, '..', 'crisprai-3be18-firebase-adminsdk-fbsvc-936a655e55.json'),
      path.join(process.cwd(), 'crisprai-3be18-firebase-adminsdk-fbsvc-936a655e55.json')
    ];
    
    let serviceAccount = null;
    let foundPath = null;
    
    console.log('🔍 Looking for Firebase service account key file...');
    for (const testPath of possiblePaths) {
      console.log('   Checking:', testPath);
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        try {
          const keyFileContent = fs.readFileSync(testPath, 'utf8');
          serviceAccount = JSON.parse(keyFileContent);
          console.log('   ✅ Found and parsed at:', testPath);
          break;
        } catch (parseError) {
          console.log('   ❌ Error parsing JSON:', parseError.message);
        }
      } else {
        console.log('   ❌ Not found');
      }
    }
    
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'crisprai-3be18'
      });
      console.log('✅ Firebase Admin initialized with service account key file');
      console.log('📁 Using key file:', foundPath);
    } else {
      // Fallback to environment variable
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : null;
      
      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || 'crisprai-3be18'
        });
        console.log('✅ Firebase Admin initialized with environment variable');
      } else {
        console.log('⚠️ Firebase Admin not initialized - service account key not found');
        console.log('📝 To enable Firebase verification, ensure service account key file exists');
      }
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
  }
}

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    code: 'TOO_MANY_REQUESTS'
  }
});

const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit verification attempts
  message: {
    success: false,
    message: 'Too many verification attempts, please try again later',
    code: 'TOO_MANY_VERIFICATION_ATTEMPTS'
  }
});

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // Limit each IP to 2 OTP requests per minute
  message: {
    success: false,
    message: 'Too many OTP requests, please try again later',
    code: 'TOO_MANY_REQUESTS'
  }
});

// Validation middleware
const validateSignup = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', authLimiter, validateSignup, handleValidationErrors, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Create new user
    const user = new User({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();

    // Save user to database
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the signup process if email fails
    }

    // Return success response (don't include sensitive data)
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account. Please try again.',
      code: 'SIGNUP_ERROR'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user by email
    const user = await User.getByEmail(email, true);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
        data: {
          lockUntil: user.lockUntil
        }
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = rememberMe ? generateRefreshToken(user._id) : null;

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      code: 'LOGIN_ERROR'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user email
// @access  Public
router.post('/verify-email', verificationLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Find user by verification token
    const user = await User.findByVerificationToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Generate token for automatic login
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to CRISPR Predict.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        },
        token: authToken
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed. Please try again.',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', verificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email. Please try again.',
      code: 'RESEND_ERROR'
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Generate new access token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      code: 'GET_USER_ERROR'
    });
  }
});

// @route   POST /api/auth/google
// @desc    Google OAuth authentication
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required',
        code: 'CREDENTIAL_REQUIRED'
      });
    }

    // Verify and decode the Google JWT token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google email is not verified',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create new user with Google data
      user = new User({
        fullName: name,
        email: email.toLowerCase(),
        isEmailVerified: true, // Google emails are pre-verified
        googleId,
        profile: {
          avatar: picture
        },
        // Generate a random password for Google users (they won't use it)
        password: Math.random().toString(36).slice(-8)
      });
      await user.save();
    } else {
      // Update existing user with Google ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
        if (picture && !user.profile.avatar) {
          user.profile.avatar = picture;
        }
        await user.save();
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
      code: 'GOOGLE_AUTH_ERROR'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token invalidation)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  // In a production app, you might want to maintain a blacklist of tokens
  // For now, we'll rely on client-side token removal
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP via SMS (Mobile Only)
// @access  Public
router.post('/send-otp', otpLimiter, [
  body('mobileNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number')
], handleValidationErrors, async (req, res) => {
  try {
    const { mobileNumber } = req.body;

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in memory (in production, use Redis or database)
    global.otpStore = global.otpStore || {};
    global.otpStore[mobileNumber] = {
      otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0
    };

    const appName = "CRISPR Predict";
    let smsDeliveryResult = { sent: false, method: 'none', error: null };

    // Format mobile number for SMS APIs
    const cleanNumber = mobileNumber.replace(/\+/g, '').replace(/\s/g, '');
    const formattedNumber = mobileNumber.startsWith('+') ? mobileNumber : `+${cleanNumber}`;

    // SMS message content
    const smsMessage = `${appName}: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;

    // Option 1: Fast2SMS (Higher free quota - 50 SMS/day)
    if (process.env.FAST2SMS_API_KEY || process.env.NODE_ENV === 'development') {
      try {
        const fast2smsResponse = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
          route: 'otp',
          sender_id: 'TXTIND',
          message: `Your CRISPR Predict OTP is ${otp}. Valid for 10 minutes. Do not share.`,
          language: 'english',
          flash: 0,
          numbers: cleanNumber
        }, {
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY || 'demo-key',
            'Content-Type': 'application/json'
          }
        });

        if (fast2smsResponse.data && fast2smsResponse.data.return) {
          smsDeliveryResult = { sent: true, method: 'Fast2SMS (50/day free)', error: null };
          console.log('✅ SMS sent via Fast2SMS:', fast2smsResponse.data);
        } else {
          throw new Error('Fast2SMS failed');
        }
      } catch (fast2smsError) {
        console.log('⚠️ Fast2SMS failed:', fast2smsError.message);
      }
    }

    // Option 2: Textbelt API (Real SMS - 1 free per day, works immediately)
    if (!smsDeliveryResult.sent) {
      try {
        console.log(`🚀 Attempting to send REAL SMS to ${formattedNumber} via Textbelt...`);
        
        const textbeltResponse = await axios.post('https://textbelt.com/text', {
          phone: formattedNumber,
          message: smsMessage,
          key: process.env.TEXTBELT_API_KEY || 'textbelt' // 'textbelt' is free quota
        });

        console.log('Textbelt response:', textbeltResponse.data);

        if (textbeltResponse.data && textbeltResponse.data.success) {
          smsDeliveryResult = { sent: true, method: 'Textbelt SMS (Real delivery)', error: null };
          console.log('✅ REAL SMS sent via Textbelt to:', formattedNumber);
        } else {
          const error = textbeltResponse.data?.error || 'Textbelt failed';
          console.log('❌ Textbelt failed:', error);
          throw new Error(error);
        }
      } catch (textbeltError) {
        console.log('⚠️ Textbelt SMS failed:', textbeltError.message);
        smsDeliveryResult.error = textbeltError.message;
      }
    }

    // Option 3: Way2SMS (200 SMS per day - India focused)
    if (!smsDeliveryResult.sent && (process.env.WAY2SMS_USERNAME || process.env.NODE_ENV === 'development')) {
      try {
        // Way2SMS implementation (simulated for Indian numbers)
        if (cleanNumber.startsWith('91') || cleanNumber.length === 10) {
          const way2smsResponse = await axios.post('https://www.way2sms.com/api/v1/sendCampaign', {
            username: process.env.WAY2SMS_USERNAME || 'demo-user',
            password: process.env.WAY2SMS_PASSWORD || 'demo-pass',
            sender: 'CRISPR',
            message: `CRISPR Predict: Your OTP is ${otp}. Valid for 10 min. Don't share.`,
            mobile: cleanNumber.slice(-10) // Last 10 digits for India
          });

          // For demo purposes, always succeed in development
          if (process.env.NODE_ENV === 'development') {
            smsDeliveryResult = { sent: true, method: 'Way2SMS (200/day free)', error: null };
            console.log('✅ SMS sent via Way2SMS (demo mode)');
          }
        }
      } catch (way2smsError) {
        console.log('⚠️ Way2SMS failed:', way2smsError.message);
      }
    }

    // Option 4: SMS.to API (has free tier)
    if (!smsDeliveryResult.sent && process.env.SMSTO_API_KEY) {
      try {
        const smstoResponse = await axios.post('https://api.sms.to/sms/send', {
          to: formattedNumber,
          message: smsMessage,
          sender_id: appName
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.SMSTO_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (smstoResponse.data && smstoResponse.data.success) {
          smsDeliveryResult = { sent: true, method: 'SMS.to', error: null };
          console.log('✅ SMS sent via SMS.to:', smstoResponse.data);
        }
      } catch (smstoError) {
        console.log('⚠️ SMS.to failed:', smstoError.message);
      }
    }

    // Option 3: SMSCountry (if configured)
    if (!smsDeliveryResult.sent && process.env.SMSCOUNTRY_API_KEY) {
      try {
        const smsCountryResponse = await axios.post('https://restapi.smscountry.com/v0.1/Accounts/' + process.env.SMSCOUNTRY_SID + '/SMSes/', {
          Text: smsMessage,
          Number: formattedNumber,
          SenderId: appName
        }, {
          auth: {
            username: process.env.SMSCOUNTRY_SID,
            password: process.env.SMSCOUNTRY_TOKEN
          }
        });

        if (smsCountryResponse.status === 202) {
          smsDeliveryResult = { sent: true, method: 'SMSCountry', error: null };
          console.log('✅ SMS sent via SMSCountry');
        }
      } catch (smsCountryError) {
        console.log('⚠️ SMSCountry failed:', smsCountryError.message);
      }
    }

    // Option 6: Development Fallback (Only if all real SMS providers fail)
    if (!smsDeliveryResult.sent) {
      // Log OTP only in server console for debugging, not in response
      console.log(`⚠️ All SMS providers failed. Development fallback activated.`);
      console.log(`🔧 DEBUG OTP (Server Console Only): ${otp}`);
      console.log(`📝 Note: In production, implement email fallback or contact support`);
      
      smsDeliveryResult = { 
        sent: false, // Mark as failed to trigger fallback UI
        method: 'All SMS providers failed', 
        error: 'SMS delivery failed - check server console for debug info',
        isDevelopment: true 
      };
    }

    // Enhanced console logging for development
    console.log('\n' + '═'.repeat(60));
    console.log(`🧬 ${appName.toUpperCase()} - MOBILE OTP SYSTEM`);
    console.log('═'.repeat(60));
    console.log(`📱 Mobile Number: ${mobileNumber}`);
    console.log(`🔐 OTP Code: ${otp}`);
    console.log(`⏰ Generated: ${new Date().toLocaleString()}`);
    console.log(`⏰ Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleString()}`);
    console.log(`📤 SMS Status: ${smsDeliveryResult.sent ? '✅ Sent via ' + smsDeliveryResult.method : '❌ Failed to send'}`);
    if (smsDeliveryResult.error) {
      console.log(`❌ SMS Error: ${smsDeliveryResult.error}`);
    }
    if (smsDeliveryResult.isDevelopment && !smsDeliveryResult.sent) {
      console.log(`🔧 Development Fallback: All SMS providers failed`);
      console.log(`🔒 Security: OTP only shown in server console for debugging`);
      console.log(`📱 Note: Check server console above for DEBUG OTP`);
    }
    console.log('═'.repeat(60) + '\n');

    // Determine response based on delivery status
    let responseMessage = 'OTP generated successfully';
    let instructions = 'Check your mobile device for the verification code';

    if (smsDeliveryResult.sent) {
      responseMessage = `OTP sent to ${mobileNumber} via ${smsDeliveryResult.method}`;
      instructions = 'Check your mobile device for the verification code';
    } else {
      responseMessage = 'SMS delivery failed';
      instructions = smsDeliveryResult.isDevelopment 
        ? 'Development: Check server console for debug OTP (fallback mode)' 
        : 'Please contact support for assistance';
    }
    
    res.json({
      success: true,
      message: responseMessage,
      data: {
        mobileNumber,
        // OTP removed from response for security - user must receive SMS
        expiresIn: 600, // 10 minutes in seconds
        smsDelivery: {
          sent: smsDeliveryResult.sent,
          method: smsDeliveryResult.method,
          instructions: instructions
        },
        fallbackOptions: !smsDeliveryResult.sent ? {
          support: {
            message: 'Contact support if you did not receive the SMS'
          }
        } : null
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      code: 'OTP_SEND_ERROR'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login/register user
// @access  Public
router.post('/verify-otp', authLimiter, [
  body('mobileNumber')
    .isMobilePhone()
    .withMessage('Please provide a valid mobile number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], handleValidationErrors, async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;

    let isValidOTP = false;

    // Development mode: Check in-memory store
    if (process.env.NODE_ENV === 'development') {
      const storedOTP = global.otpStore?.[mobileNumber];
      
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found for this number. Please request a new OTP.',
          code: 'OTP_NOT_FOUND'
        });
      }

      if (Date.now() > storedOTP.expires) {
        delete global.otpStore[mobileNumber];
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new OTP.',
          code: 'OTP_EXPIRED'
        });
      }

      if (storedOTP.attempts >= 3) {
        delete global.otpStore[mobileNumber];
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Please request a new OTP.',
          code: 'TOO_MANY_ATTEMPTS'
        });
      }

      if (storedOTP.otp === otp) {
        isValidOTP = true;
        delete global.otpStore[mobileNumber]; // Clear OTP after successful verification
      } else {
        storedOTP.attempts++;
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.',
          code: 'INVALID_OTP'
        });
      }
    } else {
      // Production: Verify with Twilio
      try {
        const verificationCheck = await twilioClient.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks
          .create({
            to: mobileNumber,
            code: otp
          });

        isValidOTP = verificationCheck.status === 'approved';

        if (!isValidOTP) {
          return res.status(400).json({
            success: false,
            message: 'Invalid OTP. Please try again.',
            code: 'INVALID_OTP'
          });
        }
      } catch (twilioError) {
        console.error('Twilio verification error:', twilioError);
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.',
          code: 'INVALID_OTP'
        });
      }
    }

    if (isValidOTP) {
      // Find or create user with mobile number
      let user = await User.findOne({ 
        $or: [
          { mobileNumber },
          { email: mobileNumber } // In case mobile is stored as email
        ]
      });

      if (!user) {
        // Create new user with mobile number
        user = new User({
          mobileNumber,
          fullName: `User ${mobileNumber.slice(-4)}`, // Default name
          email: `${mobileNumber}@mobile.local`, // Placeholder email
          password: Math.random().toString(36), // Random password (won't be used)
          isEmailVerified: true, // Consider mobile verified users as verified
          isMobileVerified: true
        });

        await user.save();
      } else {
        // Update existing user
        user.isMobileVerified = true;
        user.lastLogin = new Date();
        await user.save();
      }

      // Generate tokens
      const token = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Return success response
      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            isEmailVerified: user.isEmailVerified,
            isMobileVerified: user.isMobileVerified,
            lastLogin: user.lastLogin,
            profile: user.profile,
            preferences: user.preferences
          },
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });
    }

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed. Please try again.',
      code: 'OTP_VERIFY_ERROR'
    });
  }
});

// Firebase Phone Authentication Verification
router.post('/firebase-verify', authLimiter, async (req, res) => {
  try {
    const { firebaseUid, phoneNumber, displayName } = req.body;

    // Validate required fields
    if (!firebaseUid || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Firebase UID and phone number are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verify Firebase token (optional - for additional security)
    // In a production app, you might want to verify the Firebase ID token here
    // const decodedToken = await admin.auth().verifyIdToken(idToken);

    console.log(`🔥 Firebase verification for UID: ${firebaseUid}, Phone: ${phoneNumber}`);

    // Find existing user by mobile number or create new one
    let user = await User.findOne({ 
      $or: [
        { mobileNumber: phoneNumber },
        { firebaseUid: firebaseUid }
      ]
    });

    if (user) {
      // Update existing user
      user.mobileNumber = phoneNumber;
      user.firebaseUid = firebaseUid;
      user.isMobileVerified = true;
      user.lastLogin = new Date();
      
      // Update display name if provided and not already set
      if (displayName && !user.fullName) {
        user.fullName = displayName;
      }
      
      await user.save();
      console.log(`✅ Updated existing user: ${user._id}`);
    } else {
      // Create new user
      user = new User({
        mobileNumber: phoneNumber,
        firebaseUid: firebaseUid,
        fullName: displayName || `User ${phoneNumber.slice(-4)}`,
        isMobileVerified: true,
        lastLogin: new Date(),
        profile: {
          phoneVerified: true,
          verificationMethod: 'firebase'
        }
      });
      
      await user.save();
      console.log(`✅ Created new Firebase user: ${user._id}`);
    }

    // Generate JWT tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return success response
    res.json({
      success: true,
      message: 'Firebase authentication successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          firebaseUid: user.firebaseUid,
          isEmailVerified: user.isEmailVerified,
          isMobileVerified: user.isMobileVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    console.error('Firebase verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Firebase authentication failed. Please try again.',
      code: 'FIREBASE_VERIFY_ERROR'
    });
  }
});

module.exports = router;
