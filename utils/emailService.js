const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Create transporter based on email service configuration
      if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        // Real email service setup (Gmail, SendGrid, etc.)
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // App password for Gmail
          },
          secure: true,
          port: 465
        });
        
        console.log(`📧 Real email setup - ${process.env.EMAIL_SERVICE.toUpperCase()}`);
        console.log(`📧 Sending emails from: ${process.env.EMAIL_USER}`);
      } else {
        // Development setup - use Ethereal for testing
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        
        console.log('📧 Development email setup - Ethereal Email');
        console.log('📧 View emails at: https://ethereal.email');
      }

      // Verify transporter
      await this.transporter.verify();
      console.log('✅ Email service ready');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'CRISPR Predict',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@crisprpredict.com'
        },
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Show preview URL only for Ethereal Email (testing)
      const isEthereal = !process.env.EMAIL_SERVICE;
      if (isEthereal) {
        console.log('📧 Email sent (preview):', nodemailer.getTestMessageUrl(info));
      } else {
        console.log(`📧 Email sent to: ${to}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: isEthereal ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const html = this.getVerificationEmailTemplate(user.fullName, verificationUrl);
    
    return await this.sendEmail({
      to: user.email,
      subject: 'Verify Your CRISPR Predict Account',
      html
    });
  }

  async sendWelcomeEmail(user) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth`;
    
    const html = this.getWelcomeEmailTemplate(user.fullName, loginUrl);
    
    return await this.sendEmail({
      to: user.email,
      subject: 'Welcome to CRISPR Predict! 🧬',
      html
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = this.getPasswordResetEmailTemplate(user.fullName, resetUrl);
    
    return await this.sendEmail({
      to: user.email,
      subject: 'Reset Your CRISPR Predict Password',
      html
    });
  }

  getVerificationEmailTemplate(fullName, verificationUrl) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - CRISPR Predict</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🧬 CRISPR Predict</div>
                <p>Verify Your Email Address</p>
            </div>
            
            <div class="content">
                <h2>Hello ${fullName}!</h2>
                
                <p>Welcome to CRISPR Predict! We're excited to have you join our community of researchers pushing the boundaries of gene editing.</p>
                
                <p>To complete your account setup and start predicting CRISPR success rates, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                
                <div class="warning">
                    <strong>⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.
                </div>
                
                <p>If you didn't create an account with CRISPR Predict, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The CRISPR Predict Team</p>
            </div>
            
            <div class="footer">
                <p>This email was sent to ${verificationUrl.split('?')[0].includes('localhost') ? 'you' : user.email}</p>
                <p>CRISPR Predict - Advancing Gene Editing Research</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  getWelcomeEmailTemplate(fullName, loginUrl) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CRISPR Predict</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .feature { display: flex; align-items: center; margin: 15px 0; }
            .feature-icon { margin-right: 15px; font-size: 20px; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🧬 CRISPR Predict</div>
                <h1>Welcome Aboard!</h1>
                <p>Your account has been verified successfully</p>
            </div>
            
            <div class="content">
                <h2>Hello ${fullName}! 🎉</h2>
                
                <p>Congratulations! Your email has been verified and your CRISPR Predict account is now active. You're ready to start exploring the future of gene editing predictions.</p>
                
                <h3>What you can do now:</h3>
                
                <div class="feature">
                    <span class="feature-icon">🔬</span>
                    <span>Predict CRISPR-Cas9 success rates for your target sequences</span>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <span>Analyze detailed results with confidence scores</span>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">💾</span>
                    <span>Save and manage your prediction history</span>
                </div>
                
                <div class="feature">
                    <span class="feature-icon">🚀</span>
                    <span>Access advanced analytics and insights</span>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}" class="button">Start Predicting Now</a>
                </div>
                
                <p>Need help getting started? Check out our documentation or reach out to our support team.</p>
                
                <p>Happy researching!<br>The CRISPR Predict Team</p>
            </div>
            
            <div class="footer">
                <p>CRISPR Predict - Empowering researchers with AI-driven gene editing predictions</p>
                <p>If you have any questions, feel free to contact our support team.</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  getPasswordResetEmailTemplate(fullName, resetUrl) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - CRISPR Predict</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
            .warning { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🧬 CRISPR Predict</div>
                <h1>Password Reset Request</h1>
                <p>Reset your account password</p>
            </div>
            
            <div class="content">
                <h2>Hello ${fullName},</h2>
                
                <p>We received a request to reset the password for your CRISPR Predict account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #ef4444;">${resetUrl}</p>
                
                <div class="warning">
                    <strong>⏰ Important:</strong> This password reset link will expire in 10 minutes for security reasons.
                </div>
                
                <p><strong>If you didn't request this password reset:</strong></p>
                <ul>
                    <li>You can safely ignore this email</li>
                    <li>Your password will remain unchanged</li>
                    <li>Consider securing your account if you're concerned</li>
                </ul>
                
                <p>Best regards,<br>The CRISPR Predict Team</p>
            </div>
            
            <div class="footer">
                <p>CRISPR Predict - Advancing Gene Editing Research</p>
                <p>If you have security concerns, please contact our support team immediately.</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new EmailService();
