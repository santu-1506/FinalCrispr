import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TOTPLogin = ({ onBack, prefillData = {} }) => {
  const [formData, setFormData] = useState({
    fullName: prefillData.fullName || '',
    email: prefillData.email || '',
    password: prefillData.password || '',
    totpToken: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle TOTP login
  const handleTOTPLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    if (!formData.totpToken || formData.totpToken.length !== 6) {
      setErrors({ totpToken: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/totp/login`, {
        email: formData.email,
        password: formData.password,
        totpToken: formData.totpToken,
        rememberMe: false
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.fullName);
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        toast.success(`Welcome back, ${user.fullName}!`);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('TOTP login error:', error);
      if (error.response?.data?.code === 'INVALID_TOTP_TOKEN') {
        toast.error('Invalid TOTP code. Please check your authenticator app.');
        setErrors({ totpToken: 'Invalid code' });
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
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
            <ShieldCheckIcon className="w-10 h-10 text-blue-400" />
          </motion.div>
          
          <h1 className="text-3xl font-bold tracking-tight">
            TOTP Login
          </h1>
          <p className="text-gray-400 mt-2">
            Enter your credentials and authenticator code
          </p>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <EnvelopeIcon className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                />
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <LockClosedIcon className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="totpToken"
                  placeholder="Enter 6-digit code from authenticator"
                  value={formData.totpToken}
                  onChange={handleInputChange}
                  maxLength={6}
                  className={`w-full bg-gray-900/50 border rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 ${
                    errors.totpToken ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {errors.totpToken && (
                  <p className="text-red-400 text-sm mt-1">{errors.totpToken}</p>
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <DevicePhoneMobileIcon className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-blue-400 font-medium">Open your authenticator app</p>
                  <p className="text-xs text-gray-400">Find "CRISPR Predict" and enter the 6-digit code</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTOTPLogin}
              disabled={isLoading || !formData.email || !formData.password || formData.totpToken.length !== 6}
              className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                isLoading || !formData.email || !formData.password || formData.totpToken.length !== 6
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
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Login with TOTP</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Back button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Login Options</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default TOTPLogin;