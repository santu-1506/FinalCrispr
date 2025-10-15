const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TOTPService {
  /**
   * Generate a secret for a new user
   * @param {string} userName - User's name or email
   * @param {string} serviceName - Your app name
   * @returns {Object} Secret and QR code data
   */
  static generateSecret(userName, serviceName = 'CRISPR Predict') {
    const secret = speakeasy.generateSecret({
      name: userName,
      issuer: serviceName,
      length: 32
    });

    return {
      secret: secret.base32, // Store this in database
      otpAuthUrl: secret.otpauth_url, // Use this for QR code
      manualEntryKey: secret.base32 // User can manually enter this
    };
  }

  /**
   * Generate QR code image for user to scan
   * @param {string} otpAuthUrl - The OTP auth URL from generateSecret
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateQRCode(otpAuthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpAuthUrl);
      return qrCodeDataURL; // Returns "data:image/png;base64,..."
    } catch (error) {
      throw new Error('Failed to generate QR code: ' + error.message);
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} userSecret - User's secret (from database)
   * @param {string} userToken - 6-digit code from user's app
   * @param {number} window - Number of time steps to check (default: 2)
   * @returns {boolean} True if valid, false if invalid
   */
  static verifyToken(userSecret, userToken, window = 2) {
    return speakeasy.totp.verify({
      secret: userSecret,
      encoding: 'base32',
      token: userToken,
      window: window // Allows for slight time differences
    });
  }

  /**
   * Generate a token (for testing purposes)
   * @param {string} userSecret - User's secret
   * @returns {string} 6-digit TOTP code
   */
  static generateToken(userSecret) {
    return speakeasy.totp({
      secret: userSecret,
      encoding: 'base32'
    });
  }

  /**
   * Check if user has TOTP enabled
   * @param {Object} user - User object from database
   * @returns {boolean} True if TOTP is enabled
   */
  static isTOTPEnabled(user) {
    return !!(user.totpSecret && user.totpEnabled);
  }

  /**
   * Get backup codes for user (in case they lose their phone)
   * @returns {Array} Array of 10 backup codes
   */
  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character backup codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}

module.exports = TOTPService;
