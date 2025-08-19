import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon,
  ArrowRightIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'already_verified'
  const [userEmail, setUserEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        token: verificationToken
      });

      if (response.data.success) {
        const { user, token: authToken } = response.data.data;
        
        // Store authentication data for automatic login
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        
        setVerificationStatus('success');
        setUserEmail(user.email);
        
        toast.success('Email verified successfully! Welcome to CRISPR Predict!');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      
      if (error.response?.data?.code === 'ALREADY_VERIFIED') {
        setVerificationStatus('already_verified');
        toast.info('Your email is already verified. You can sign in now.');
      } else if (error.response?.data?.code === 'INVALID_TOKEN') {
        setVerificationStatus('error');
        toast.error('Invalid or expired verification link.');
      } else {
        setVerificationStatus('error');
        toast.error('Email verification failed. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsResending(true);
    
    try {
      await axios.post(`${API_BASE_URL}/auth/resend-verification`, {
        email: userEmail
      });
      
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'verifying':
        return (
          <div className="text-center">
            <motion.div
              className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <h1 className="text-3xl font-bold mb-4">Verifying Your Email</h1>
            <p className="text-gray-400">Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircleIcon className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4 text-green-400">Email Verified Successfully!</h1>
            <p className="text-gray-400 mb-6">
              Welcome to CRISPR Predict! Your account has been verified and you're now logged in.
            </p>
            <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-400">
                🎉 Redirecting you to the dashboard in a few seconds...
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/', { replace: true })}
              className="bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg shadow-green-600/20 flex items-center space-x-2 mx-auto"
            >
              <span>Go to Dashboard</span>
              <ArrowRightIcon className="w-5 h-5" />
            </motion.button>
          </div>
        );

      case 'already_verified':
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircleIcon className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4 text-blue-400">Already Verified</h1>
            <p className="text-gray-400 mb-6">
              Your email address is already verified. You can sign in to your account.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/auth', { replace: true })}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg shadow-blue-600/20 flex items-center space-x-2 mx-auto"
            >
              <span>Go to Sign In</span>
              <ArrowRightIcon className="w-5 h-5" />
            </motion.button>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <ExclamationTriangleIcon className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold mb-4 text-red-400">Verification Failed</h1>
            <p className="text-gray-400 mb-6">
              The verification link is invalid or has expired. Please request a new verification email.
            </p>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-400" />
                Resend Verification Email
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isResending ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <span>Resend</span>
                  )}
                </motion.button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/auth', { replace: true })}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Back to Sign In
              </motion.button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='%23374151'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")" }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="relative bg-[#1f2937]/50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          <div className="p-8 text-center">
            <motion.div whileHover={{ scale: 1.1, rotate: -10 }} className="inline-block mb-4">
              <BeakerIcon className="w-10 h-10 text-blue-400" />
            </motion.div>
          </div>

          <div className="p-8 pt-0">
            {renderContent()}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
