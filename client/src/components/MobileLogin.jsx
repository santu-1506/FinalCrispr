import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  PhoneIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { parsePhoneNumber, isValidPhoneNumber } from 'react-phone-number-input';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MobileLogin = ({ onBack }) => {
  // State management
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const location = useLocation();

  // Timer effect for OTP resend countdown
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(timer => {
          if (timer === 1) {
            setCanResend(true);
          }
          return timer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Validate mobile number
  const validateMobileNumber = (phone) => {
    try {
      if (!phone || phone.trim() === '') {
        return 'Mobile number is required';
      }
      
      // Add country code if not present (assuming India +91)
      const phoneWithCountryCode = phone.startsWith('+') ? phone : `+91${phone}`;
      
      if (!isValidPhoneNumber(phoneWithCountryCode)) {
        return 'Please enter a valid mobile number';
      }
      
      return null;
    } catch (error) {
      return 'Please enter a valid mobile number';
    }
  };

  // Format mobile number for display (masked)
  const formatMobileForDisplay = (phone) => {
    if (!phone) return '';
    try {
      const phoneWithCountryCode = phone.startsWith('+') ? phone : `+91${phone}`;
      const parsed = parsePhoneNumber(phoneWithCountryCode);
      if (parsed) {
        const national = parsed.formatNational();
        // Mask middle digits: +91 98XXX XXX45
        return national.replace(/(\d{2})(\d{3})(\d{3})(\d{2})/, '$1XXX XXX$4');
      }
    } catch (error) {
      // Fallback masking
      return phone.replace(/(\d{2})(\d{6})(\d{2})/, '$1XXXXXX$3');
    }
    return phone;
  };

  // Send OTP API call
  const handleSendOTP = async () => {
    const validationError = validateMobileNumber(mobileNumber);
    if (validationError) {
      setErrors({ mobile: validationError });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Format phone number for API
      const phoneWithCountryCode = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        mobileNumber: phoneWithCountryCode
      });

      if (response.data.success) {
        const { smsDelivery, fallbackOptions } = response.data.data;
        
        // Handle SMS delivery status
        if (smsDelivery.sent) {
          // Real SMS sent - no OTP display for security
          toast.success(`📱 SMS sent successfully! Check your phone.`, { 
            duration: 6000,
            style: { background: '#059669', color: 'white' }
          });
          toast.success(`${smsDelivery.method}`, { duration: 4000 });
        } else {
          // SMS failed - show support message
          toast.error('📱 SMS delivery failed', { duration: 4000 });
          
          if (fallbackOptions?.support) {
            toast.error(fallbackOptions.support.message, { duration: 8000 });
          }
        }
        
        setStep('otp');
        setTimer(60); // 60 second countdown
        setCanResend(false);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      
      if (error.response?.data?.code === 'TOO_MANY_REQUESTS') {
        toast.error('Too many OTP requests. Please try again later.');
      } else if (error.response?.data?.code === 'INVALID_MOBILE_NUMBER') {
        setErrors({ mobile: 'Invalid mobile number format' });
      } else {
        toast.error(error.response?.data?.message || 'Failed to generate OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP API call
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const phoneWithCountryCode = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        mobileNumber: phoneWithCountryCode,
        otp: otp
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store authentication data (consistent with existing login flow)
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email || user.mobileNumber);
        localStorage.setItem('userName', user.fullName || user.mobileNumber);
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        toast.success(`Welcome, ${user.fullName || 'User'}!`);
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      if (error.response?.data?.code === 'INVALID_OTP') {
        setErrors({ otp: 'Invalid OTP. Please check and try again.' });
      } else if (error.response?.data?.code === 'OTP_EXPIRED') {
        setErrors({ otp: 'OTP has expired. Please request a new one.' });
        setCanResend(true);
        setTimer(0);
      } else if (error.response?.data?.code === 'TOO_MANY_ATTEMPTS') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        setErrors({ otp: error.response?.data?.message || 'OTP verification failed. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setOtp('');
    setErrors({});

    try {
      const phoneWithCountryCode = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        mobileNumber: phoneWithCountryCode
      });

      if (response.data.success) {
        const { smsDelivery, fallbackOptions } = response.data.data;
        
        toast.success('New OTP generated!');
        
        // Handle SMS delivery for resend
        if (smsDelivery.sent) {
          toast.success(`📱 New SMS sent! Check your phone.`, { 
            duration: 5000,
            style: { background: '#059669', color: 'white' }
          });
        } else {
          toast.error('📱 SMS resend failed', { duration: 4000 });
          
          if (fallbackOptions?.support) {
            toast.error(fallbackOptions.support.message, { duration: 8000 });
          }
        }
        
        setTimer(60);
        setCanResend(false);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to phone number entry
  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setTimer(0);
    setCanResend(false);
    setErrors({});
  };

  // Handle mobile number input change
  const handleMobileChange = (value) => {
    setMobileNumber(value);
    if (errors.mobile) {
      setErrors({ ...errors, mobile: null });
    }
  };

  // Handle OTP input change
  const handleOTPChange = (value) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtp(numericValue);
    if (errors.otp) {
      setErrors({ ...errors, otp: null });
    }
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="relative bg-[#1f2937]/50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center">
          <motion.div 
            whileHover={{ scale: 1.1 }} 
            className="inline-block mb-4"
          >
            <PhoneIcon className="w-10 h-10 text-blue-400" />
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-3xl font-bold tracking-tight">
                {step === 'phone' ? 'Mobile OTP Sign In' : 'Verify SMS Code'}
              </h1>
              <p className="text-gray-400 mt-2">
                {step === 'phone' 
                  ? 'Enter your mobile number to receive OTP via SMS'
                  : `Enter the 6-digit code sent to ${formatMobileForDisplay(mobileNumber)}`
                }
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-0">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Mobile Number Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <PhoneIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="Enter mobile number"
                      className={`w-full bg-gray-900/50 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                        errors.mobile 
                          ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                          : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500'
                      }`}
                      maxLength="10"
                    />
                  </div>
                  {errors.mobile && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {errors.mobile}
                    </motion.p>
                  )}
                  <p className="text-xs text-gray-500">
                    We'll send a 6-digit verification code via SMS to your mobile
                  </p>
                </div>

                {/* Send OTP Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendOTP}
                  disabled={isLoading}
                  className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                    isLoading
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  } text-white`}
                >
                  {isLoading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      <span>Send SMS OTP</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Back Button */}
                <button
                  onClick={handleBackToPhone}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>Change number</span>
                </button>

                {/* OTP Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => handleOTPChange(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className={`w-full bg-gray-900/50 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 text-center text-2xl tracking-widest ${
                      errors.otp 
                        ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' 
                        : 'border-gray-700 focus:ring-blue-500/50 focus:border-blue-500'
                    }`}
                    maxLength="6"
                    autoComplete="one-time-code"
                  />
                  {errors.otp && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {errors.otp}
                    </motion.p>
                  )}
                </div>

                {/* SMS Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm">
                  <p className="text-blue-400 font-medium mb-1">📱 SMS Verification:</p>
                  <p className="text-gray-300 text-xs">
                    1. <strong>Check your SMS:</strong> Look for message from CRISPR Predict<br/>
                    2. <strong>Enter the code:</strong> Type the 6-digit number above<br/>
                    3. <strong>Development mode:</strong> OTP shown in notifications<br/>
                    4. <strong>Not received?</strong> Wait for timer and click resend
                  </p>
                </div>

                {/* Timer and Resend */}
                <div className="flex items-center justify-between text-sm">
                  {timer > 0 ? (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>Resend SMS OTP in {formatTimer(timer)}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={isLoading || !canResend}
                      className={`text-blue-400 hover:text-blue-300 transition-colors ${
                        isLoading || !canResend ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Resend SMS OTP
                    </button>
                  )}
                </div>

                {/* Verify OTP Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length !== 6}
                  className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                    isLoading || otp.length !== 6
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-green-600 hover:bg-green-500 shadow-green-600/20'
                  } text-white`}
                >
                  {isLoading ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Email Login */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <button
              onClick={onBack}
              className="w-full text-center text-gray-400 hover:text-white transition-colors text-sm"
            >
              Back to Email Sign In
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MobileLogin;
