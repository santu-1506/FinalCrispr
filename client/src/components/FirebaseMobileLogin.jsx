import React, { useState, useEffect, useRef } from 'react';
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
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth, initializeRecaptcha, isFirebaseReady, getFirebaseConfig } from '../firebase';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FirebaseMobileLogin = ({ onBack }) => {
  // State management
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const recaptchaRef = useRef(null);

  // Initialize reCAPTCHA on component mount
  useEffect(() => {
    const initRecaptcha = async () => {
      try {
        // Check if Firebase is ready
        if (!isFirebaseReady()) {
          console.error('Firebase not ready for reCAPTCHA initialization');
          return;
        }

        // Only initialize if we don't have a verifier and the container exists
        if (!recaptchaVerifier && document.getElementById('recaptcha-container')) {
          console.log('Initializing reCAPTCHA...');
          const verifier = initializeRecaptcha('recaptcha-container');
          setRecaptchaVerifier(verifier);
          console.log('reCAPTCHA initialized successfully');
        }
      } catch (error) {
        console.error('reCAPTCHA initialization error:', error);
        toast.error('Failed to initialize verification system. Please refresh the page.');
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initRecaptcha, 100);
    return () => clearTimeout(timer);
  }, [recaptchaVerifier]);

  // Firebase readiness check on mount
  useEffect(() => {
    if (!isFirebaseReady()) {
      console.error('Firebase configuration issue:', getFirebaseConfig());
      toast.error('Authentication system not ready. Please refresh the page.');
    } else {
      console.log('Firebase is ready:', getFirebaseConfig());
    }
  }, []);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
          console.log('reCAPTCHA cleaned up');
        } catch (error) {
          console.warn('Error clearing reCAPTCHA:', error);
        }
      }
    };
  }, [recaptchaVerifier]);

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
    if (!phone || phone.trim() === '') {
      return 'Mobile number is required';
    }
    
    // Add country code if not present (assuming India +91)
    const phoneWithCountryCode = phone.startsWith('+') ? phone : `+91${phone}`;
    
    // Basic phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneWithCountryCode)) {
      return 'Please enter a valid mobile number with country code';
    }
    
    return null;
  };

  // Format mobile number for display (masked)
  const formatMobileForDisplay = (phone) => {
    if (!phone) return '';
    try {
      const phoneWithCountryCode = phone.startsWith('+') ? phone : `+91${phone}`;
      // Mask middle digits: +91 98XXX XXX45
      return phoneWithCountryCode.replace(/(\+\d{2})(\d{3})(\d{3})(\d{2})/, '$1 $2XXX $3$4');
    } catch (error) {
      return phone;
    }
  };

  // Send OTP using Firebase
  const handleSendOTP = async () => {
    const validationError = validateMobileNumber(mobileNumber);
    if (validationError) {
      setErrors({ mobile: validationError });
      return;
    }

    if (!isFirebaseReady()) {
      toast.error('Firebase authentication not ready. Please refresh the page.');
      return;
    }

    if (!recaptchaVerifier) {
      toast.error('Verification system not ready. Please wait or refresh the page.');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Format phone number for Firebase
      const phoneWithCountryCode = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      console.log('Sending OTP to:', phoneWithCountryCode);
      console.log('Firebase Config Check:', getFirebaseConfig());
      console.log('reCAPTCHA Verifier:', recaptchaVerifier);
      
      // Send OTP using Firebase
      const confirmation = await signInWithPhoneNumber(auth, phoneWithCountryCode, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      toast.success('📱 OTP sent successfully! Check your phone for the verification code.', { 
        duration: 6000,
        style: { background: '#059669', color: 'white' }
      });
      
      setStep('otp');
      setTimer(60); // 60 second countdown
      setCanResend(false);
      
    } catch (error) {
      console.error('Send OTP error:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          setErrors({ mobile: 'Invalid phone number format' });
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'SMS quota exceeded. Please try again later.';
          break;
        case 'auth/captcha-check-failed':
          errorMessage = 'Verification failed. Please refresh and try again.';
          break;
        case 'auth/invalid-app-credential':
          errorMessage = 'API key restrictions or Identity Toolkit API not enabled. Check Google Cloud Console settings.';
          console.error('🔧 API KEY ISSUE (Blaze Plan Detected):\n\n1. Check API key restrictions in Google Cloud Console\n2. Enable Identity Toolkit API\n3. Temporarily remove API key restrictions to test\n4. Add test phone numbers in Firebase Console\n\nSee FIREBASE_API_KEY_CHECK.md for detailed steps.');
          break;
        case 'auth/app-not-authorized':
          errorMessage = 'Domain not authorized. Please add your domain to authorized domains in Firebase Console.';
          console.error('Domain Authorization Issue - Add localhost and your domain to Firebase Console > Authentication > Settings > Authorized Domains');
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP using Firebase
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit OTP' });
      return;
    }

    if (!confirmationResult) {
      toast.error('Session expired. Please request a new OTP.');
      setStep('phone');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Verify OTP with Firebase
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      console.log('Firebase verification successful:', user.phoneNumber);
      
      // Now create/update user in your backend
      const response = await axios.post(`${API_BASE_URL}/auth/firebase-verify`, {
        firebaseUid: user.uid,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName || null
      });

      if (response.data.success) {
        const { user: backendUser, token, refreshToken } = response.data.data;
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(backendUser));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', backendUser.email || backendUser.mobileNumber);
        localStorage.setItem('userName', backendUser.fullName || backendUser.mobileNumber);
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        toast.success(`Welcome, ${backendUser.fullName || 'User'}!`);
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      let errorMessage = 'OTP verification failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          setErrors({ otp: 'Invalid OTP. Please check and try again.' });
          break;
        case 'auth/code-expired':
          setErrors({ otp: 'OTP has expired. Please request a new one.' });
          setCanResend(true);
          setTimer(0);
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
      }
      
      if (!error.code) {
        toast.error(errorMessage);
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
      // Format phone number for Firebase
      const phoneWithCountryCode = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`;
      
      // Send new OTP using Firebase
      const confirmation = await signInWithPhoneNumber(auth, phoneWithCountryCode, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      toast.success('📱 New OTP sent! Check your phone for the verification code.', { 
        duration: 5000,
        style: { background: '#059669', color: 'white' }
      });
      
      setTimer(60);
      setCanResend(false);
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      let errorMessage = 'Failed to resend OTP. Please try again.';
      
      switch (error.code) {
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/quota-exceeded':
          errorMessage = 'SMS quota exceeded. Please try again later.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
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
    setConfirmationResult(null);
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
                {step === 'phone' ? 'Firebase Mobile OTP' : 'Verify SMS Code'}
              </h1>
              <p className="text-gray-400 mt-2">
                {step === 'phone' 
                  ? 'Enter your mobile number to receive OTP via Firebase SMS'
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
                      placeholder="Enter mobile number (e.g., 9876543210)"
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
                    We'll send a 6-digit verification code via Firebase SMS
                  </p>
                  
                  {/* Test Numbers Info */}
                  <div className="mt-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded text-xs">
                    <p className="text-purple-400 font-medium">🔍 Advanced Troubleshooting (APIs Confirmed Working):</p>
                    <p className="text-gray-300">
                      1. Try removing <strong>all API key restrictions</strong> temporarily<br/>
                      2. Check <strong>Service Account permissions</strong> in IAM<br/>
                      3. Verify <strong>OAuth consent screen</strong> is configured<br/>
                      4. Test with Firebase test numbers first
                    </p>
                    <p className="text-blue-400 text-xs mt-2">
                      🧪 Test numbers: <code className="bg-gray-700 px-1 rounded">+1 555-555-5555</code> | OTP: <code className="bg-gray-700 px-1 rounded">123456</code>
                    </p>
                  </div>
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
                      <span>Send Firebase OTP</span>
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

                {/* Firebase Instructions */}
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm">
                  <p className="text-blue-400 font-medium mb-1">🔥 Firebase SMS Verification:</p>
                  <p className="text-gray-300 text-xs">
                    1. <strong>Check your SMS:</strong> Look for message from Firebase<br/>
                    2. <strong>Enter the code:</strong> Type the 6-digit number above<br/>
                    3. <strong>Secure delivery:</strong> OTP sent via Firebase infrastructure<br/>
                    4. <strong>Not received?</strong> Wait for timer and click resend
                  </p>
                </div>

                {/* Timer and Resend */}
                <div className="flex items-center justify-between text-sm">
                  {timer > 0 ? (
                    <div className="flex items-center space-x-2 text-gray-400">
                      <ClockIcon className="w-4 h-4" />
                      <span>Resend OTP in {formatTimer(timer)}</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleResendOTP}
                      disabled={isLoading || !canResend}
                      className={`text-blue-400 hover:text-blue-300 transition-colors ${
                        isLoading || !canResend ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      Resend Firebase OTP
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
      
      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" ref={recaptchaRef}></div>
    </motion.div>
  );
};

export default FirebaseMobileLogin;
