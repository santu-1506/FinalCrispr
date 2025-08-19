const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'fallback_secret_key_change_in_production', 
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'crispr-predict-app'
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' }, 
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_in_production', 
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'crispr-predict-app'
    }
  );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production'
    );

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production'
    );

    const user = await User.findById(decoded.userId).select('-password');
    req.user = user;
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

// Verify email required middleware
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({ 
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      data: {
        email: req.user.email
      }
    });
  }

  next();
};

// Admin role middleware (for future use)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

// Refresh token verification
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token, 
      process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_in_production'
    );
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  authenticateToken,
  optionalAuth,
  requireEmailVerification,
  requireAdmin,
  verifyRefreshToken
};
