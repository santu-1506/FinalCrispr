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
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { sendPhoneOTP, verifyPhoneOTP, isSupabaseConfigured } from '../supabase';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SupabaseOTPLogin = ({ onBack, prefillData = {} }) => {
  // State management
  const [step, setStep] = useState('phone'); // 'phone' or 'otp' or 'userDetails'
  // const [isLogin] = useState(true); // true for login, false for signup
  const [formData, setFormData] = useState({
    fullName: prefillData.fullName || '',
    mobileNumber: prefillData.mobileNumber || '',
    password: prefillData.password || '',
    otp: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState(null);
  
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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

  const validateInputs = () => {
    const newErrors = {};
    
    const mobileError = validateMobileNumber(formData.mobileNumber);
    if (mobileError) {
      newErrors.mobileNumber = mobileError;
    }

    if (step === 'userDetails') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      }
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long';
      }
    }

    if (step === 'otp') {
      if (!formData.otp || formData.otp.length !== 6) {
        newErrors.otp = 'Please enter a valid 6-digit OTP';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  // Check if user exists with this phone number
  const checkExistingUser = async (phoneNumber) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/check-phone`, {
        mobileNumber: phoneNumber
      });
      return response.data.data.userExists ? response.data.data.user : null;
    } catch (error) {
      console.error('Check user error:', error);
      return null;
    }
  };

  // Send OTP using Supabase
  const handleSendOTP = async () => {
    if (!validateInputs()) {
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Supabase authentication not configured. Please check your environment variables.');
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Format phone number for Supabase
      const phoneWithCountryCode = formData.mobileNumber.startsWith('+') 
        ? formData.mobileNumber 
        : `+91${formData.mobileNumber}`;
      
      console.log('Sending OTP to:', phoneWithCountryCode);
      
      // Check if user exists
      const user = await checkExistingUser(phoneWithCountryCode);
      setExistingUser(user);
      
      if (user) {
        // For existing users, they need to enter password along with OTP
        toast.info('Account found! You\'ll need to verify both OTP and password to login.');
      } else {
        toast.info('New number detected! After OTP verification, please set up your account.');
      }

      // Send OTP via Supabase
      const result = await sendPhoneOTP(phoneWithCountryCode);
      
      if (result.success) {
        toast.success('📱 OTP sent successfully! Check your phone for the verification code.', { 
          duration: 6000,
          style: { background: '#059669', color: 'white' }
        });
        
        setStep('otp');
        setTimer(60); // 60 second countdown
        setCanResend(false);
      } else {
        throw new Error(result.error || 'Failed to send OTP');
      }
      
    } catch (error) {
      console.error('Send OTP error:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.message?.includes('SMS')) {
        errorMessage = 'SMS service temporarily unavailable. Please try again later.';
      } else if (error.message?.includes('rate')) {
        errorMessage = 'Too many requests. Please wait before trying again.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      }
      
      toast.error(errorMessage);
      setErrors({ mobileNumber: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP using Supabase
  const handleVerifyOTP = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const phoneWithCountryCode = formData.mobileNumber.startsWith('+') 
        ? formData.mobileNumber 
        : `+91${formData.mobileNumber}`;

      console.log('Verifying OTP for:', phoneWithCountryCode);

      // Verify OTP with Supabase
      const result = await verifyPhoneOTP(phoneWithCountryCode, formData.otp);
      
      if (result.success) {
        if (existingUser) {
          // Existing user - proceed to password verification
          if (!formData.password) {
            setStep('userDetails');
            return;
          }
          
          // Verify password for existing user
          await handleExistingUserLogin(existingUser, formData.password);
        } else {
          // New user - proceed to account setup
          setStep('userDetails');
        }
      } else {
        throw new Error(result.error || 'Invalid OTP');
      }
      
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.message?.includes('expired')) {
        errorMessage = 'OTP has expired. Please request a new one.';
        setCanResend(true);
      } else if (error.message?.includes('rate')) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      }
      
      toast.error(errorMessage);
      setErrors({ otp: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle existing user login
  const handleExistingUserLogin = async (user, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/phone-login`, {
        mobileNumber: formData.mobileNumber.startsWith('+') 
          ? formData.mobileNumber 
          : `+91${formData.mobileNumber}`,
        password,
        supabaseVerified: true
      });

      if (response.data.success) {
        const { user: userData, token, refreshToken } = response.data.data;
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', userData.email || '');
        localStorage.setItem('userName', userData.fullName);
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        toast.success(`Welcome back, ${userData.fullName}!`);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.code === 'INVALID_PASSWORD') {
        toast.error('Invalid password. Please try again.');
        setErrors({ password: 'Invalid password' });
      } else {
        toast.error('Login failed. Please try again.');
      }
    }
  };

  // Handle new user signup
  const handleNewUserSignup = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/phone-signup`, {
        fullName: formData.fullName,
        mobileNumber: formData.mobileNumber.startsWith('+') 
          ? formData.mobileNumber 
          : `+91${formData.mobileNumber}`,
        password: formData.password,
        supabaseVerified: true
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email || '');
        localStorage.setItem('userName', user.fullName);
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        toast.success(`Welcome to CRISPR Predict, ${user.fullName}!`);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || 'Account creation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = () => {
    setCanResend(false);
    setFormData(prev => ({ ...prev, otp: '' }));
    handleSendOTP();
  };

  // Go back to previous step
  const handleGoBack = () => {
    if (step === 'otp') {
      setStep('phone');
      setTimer(0);
      setCanResend(false);
    } else if (step === 'userDetails') {
      setStep('otp');
    } else {
      onBack();
    }
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderPhoneStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <PhoneIcon className="w-5 h-5" />
          </div>
          <input
            type="tel"
            name="mobileNumber"
            placeholder="Mobile Number (+91XXXXXXXXXX)"
            value={formData.mobileNumber}
            onChange={handleInputChange}
            className={`w-full bg-gray-900/50 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
              errors.mobileNumber ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.mobileNumber && (
            <p className="text-red-400 text-sm mt-1">{errors.mobileNumber}</p>
          )}
        </div>
      </div>

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
            <span>Send OTP</span>
            <ArrowRightIcon className="w-5 h-5" />
          </>
        )}
      </motion.button>
    </motion.div>
  );

  const renderOTPStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            name="otp"
            placeholder="Enter 6-digit OTP"
            value={formData.otp}
            onChange={handleInputChange}
            maxLength={6}
            className={`w-full bg-gray-900/50 border rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
              errors.otp ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          {errors.otp && (
            <p className="text-red-400 text-sm mt-1">{errors.otp}</p>
          )}
        </div>

        {/* Password field for existing users */}
        {existingUser && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <LockClosedIcon className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full bg-gray-900/50 border rounded-lg pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
                errors.password ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>
        )}

        {/* Timer and resend */}
        <div className="flex items-center justify-between text-sm">
          {timer > 0 ? (
            <div className="flex items-center space-x-2 text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>Resend in {formatTimer(timer)}</span>
            </div>
          ) : (
            <button
              onClick={handleResendOTP}
              disabled={!canResend}
              className="text-blue-400 hover:text-blue-300 disabled:text-gray-500"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleVerifyOTP}
        disabled={isLoading}
        className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
          isLoading
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
            <span>Verify & Continue</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );

  const renderUserDetailsStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        {/* New user needs to fill details */}
        {!existingUser && (
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`w-full bg-gray-900/50 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
                errors.fullName ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {errors.fullName && (
              <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
            )}
          </div>
        )}

        {/* Password field for both existing (if not entered) and new users */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <LockClosedIcon className="w-5 h-5" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder={existingUser ? "Enter your password" : "Create a password"}
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full bg-gray-900/50 border rounded-lg pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
              errors.password ? 'border-red-500' : 'border-gray-700'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">{errors.password}</p>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={existingUser ? () => handleExistingUserLogin(existingUser, formData.password) : handleNewUserSignup}
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
            <span>{existingUser ? 'Sign In' : 'Create Account'}</span>
            <ArrowRightIcon className="w-5 h-5" />
          </>
        )}
      </motion.button>
    </motion.div>
  );

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
                {step === 'phone' && 'Phone Authentication'}
                {step === 'otp' && 'Verify OTP Code'}
                {step === 'userDetails' && (existingUser ? 'Welcome Back!' : 'Complete Setup')}
              </h1>
              <p className="text-gray-400 mt-2">
                {step === 'phone' && 'Enter your mobile number to receive verification code'}
                {step === 'otp' && `Code sent to ${formatMobileForDisplay(formData.mobileNumber)}`}
                {step === 'userDetails' && (existingUser 
                  ? `Welcome back! Please enter your password to continue.`
                  : 'Set up your account to complete registration'
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-0">
          <AnimatePresence mode="wait">
            {step === 'phone' && renderPhoneStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'userDetails' && renderUserDetailsStep()}
          </AnimatePresence>

          {/* Back button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoBack}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>
              {step === 'phone' ? 'Back to Login Options' : 'Go Back'}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default SupabaseOTPLogin;
