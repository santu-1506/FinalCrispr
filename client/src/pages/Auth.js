import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LockClosedIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  BeakerIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import PhoneAuthModal from '../components/PhoneAuthModal';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true); // Default to signup page as per image
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('userData');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        // Verify token is still valid by checking expiration
        const tokenPayload = jwtDecode(token);
        if (tokenPayload.exp * 1000 > Date.now()) {
          // User is already authenticated, redirect
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        } else {
          // Token expired, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      } catch (error) {
        // Invalid token/user data, clear storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
  }, [navigate, location]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time password validation
    if (name === 'password' || name === 'confirmPassword') {
      validatePassword(name === 'password' ? value : formData.password, 
                      name === 'confirmPassword' ? value : formData.confirmPassword);
    }
  };

  const validatePassword = (password, confirmPassword) => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0
    });
  };

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(valid => valid);
  };

  // API call for login
  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
        rememberMe
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store authentication data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
          toast.success('Login successful! Please check your email to verify your account.');
          // You can redirect to a verification page or show verification UI
        } else {
          toast.success(`Welcome back, ${user.fullName}!`);
        }

        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.data?.code === 'ACCOUNT_LOCKED') {
        toast.error('Account temporarily locked due to too many failed attempts. Please try again later.');
      } else if (error.response?.data?.code === 'INVALID_CREDENTIALS') {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Please try again.');
      }
    }
  };

  // API call for signup
  const handleSignup = async (fullName, email, password, confirmPassword) => {
    try {
      // Client-side validation
      if (!fullName || !email || !password) {
        toast.error('Please fill in all fields.');
        return;
      }
      
      if (!isPasswordValid()) {
        toast.error('Please ensure all password requirements are met.');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        fullName,
        email,
        password,
        confirmPassword
      });

      if (response.data.success) {
        toast.success('Account created successfully! Please check your email to verify your account.', {
          duration: 6000
        });
        
        // Switch to login mode and pre-fill email
        setIsLogin(true);
        setFormData(prev => ({ ...prev, email, password: '', confirmPassword: '', fullName: '' }));
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      if (error.response?.data?.code === 'USER_EXISTS') {
        toast.error('An account with this email already exists. Please sign in instead.');
        setIsLogin(true);
        setFormData(prev => ({ ...prev, email, password: '', confirmPassword: '', fullName: '' }));
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const firstError = error.response.data.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error(error.response?.data?.message || 'Account creation failed. Please try again.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await handleLogin(formData.email, formData.password);
      } else {
        await handleSignup(formData.fullName, formData.email, formData.password, formData.confirmPassword);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePhoneAuthSuccess = (data) => {
    const { user, token, refreshToken } = data;
    
    // Store authentication data consistently
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    toast.success(`Welcome, ${user.fullName}!`);
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    
    try {
      // Send Google credential to backend for verification and token generation
      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        credential: credentialResponse.credential
      });

      if (response.data.success) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store authentication data consistently with regular login
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        // If Remember Me is checked, save Google auth marker
        if (rememberMe) {
          localStorage.setItem('googleAuth', 'true');
          localStorage.setItem('rememberMe', 'true');
        }
        
        toast.success(`Welcome, ${user.fullName}!`);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Google auth error:', error);
      if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your Google account email first.');
      } else {
        toast.error(error.response?.data?.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in failed. Please try again.');
    setIsLoading(false);
  };

  const handlePhoneAuth = () => {
    setIsPhoneModalOpen(true);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '', fullName: '' });
  };

  return (
    <>
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
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'loginTitle' : 'signupTitle'}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold tracking-tight">
                    {isLogin ? 'Sign In' : 'Create Your Account'}
                  </h1>
                  <p className="text-gray-400 mt-2">
                    {isLogin ? 'Welcome back to the future of gene editing' : 'Unlock the future of gene editing'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="p-8 pt-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isLogin ? 'loginFields' : 'signupFields'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, staggerChildren: 0.1 }}
                    className="space-y-4"
                  >
                    {!isLogin && (
                      <InputField 
                        name="fullName" 
                        type="text" 
                        placeholder="Full Name" 
                        icon={UserIcon}
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    )}
                    <InputField 
                      name="email" 
                      type="email" 
                      placeholder="Email Address" 
                      icon={EnvelopeIcon}
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    <InputField 
                      name="password" 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password" 
                      icon={LockClosedIcon}
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      suffix={(
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-white">
                          {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      )}
                    />
                    {!isLogin && (
                      <InputField 
                        name="confirmPassword" 
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password" 
                        icon={LockClosedIcon}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        suffix={(
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-white">
                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        )}
                      />
                    )}
                    
                    {/* Password Requirements Checklist - Only show for signup when password field has content */}
                    {!isLogin && formData.password && (
                      <PasswordRequirements 
                        validation={passwordValidation}
                        password={formData.password}
                        confirmPassword={formData.confirmPassword}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Remember Me Checkbox - only show for login */}
                {isLogin && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center space-x-2"
                  >
                    <input
                      id="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="rememberMe" className="text-sm text-gray-300 cursor-pointer">
                      Remember me
                    </label>
                  </motion.div>
                )}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || (!isLogin && !isPasswordValid())}
                  className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
                    isLoading || (!isLogin && !isPasswordValid())
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
                      <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#1f2937] text-gray-400">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    text={isLogin ? "signin_with" : "signup_with"}
                    shape="rectangular"
                    logo_alignment="center"
                    width="100%"
                  />
                  
                  <button
                    onClick={handlePhoneAuth}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center py-3 px-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <PhoneIcon className="w-5 h-5 mr-3 text-green-400" />
                    <span className="font-semibold">{isLogin ? 'Sign in with Phone' : 'Sign up with Phone'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <button onClick={toggleMode} className="group text-gray-400 hover:text-white font-semibold text-sm transition-colors duration-300 flex items-center justify-center w-full">
              <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
              <span className="ml-2 text-blue-400 group-hover:underline flex items-center">
                {isLogin ? "Create one" : "Sign In"}
                <ChevronRightIcon className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </motion.div>
      </div>
      <PhoneAuthModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        onAuthSuccess={handlePhoneAuthSuccess}
      />
    </>
  );
};

const InputField = ({ icon: Icon, suffix, ...props }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
    className="relative group"
  >
    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within:text-blue-400 transition-colors">
      <Icon className="w-5 h-5" />
    </div>
    <input
      {...props}
      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
    />
    {suffix && (
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        {suffix}
      </div>
    )}
  </motion.div>
);

const PasswordRequirements = ({ validation, password, confirmPassword }) => {
  const requirements = [
    { key: 'minLength', label: 'At least 8 characters long', valid: validation.minLength },
    { key: 'hasUppercase', label: 'Contains uppercase letter (A-Z)', valid: validation.hasUppercase },
    { key: 'hasLowercase', label: 'Contains lowercase letter (a-z)', valid: validation.hasLowercase },
    { key: 'hasNumber', label: 'Contains at least one number (0-9)', valid: validation.hasNumber },
    { key: 'hasSpecialChar', label: 'Contains special character (!@#$%^&*)', valid: validation.hasSpecialChar },
    { key: 'passwordsMatch', label: 'Passwords match', valid: validation.passwordsMatch, showOnly: confirmPassword.length > 0 }
  ];

  const validCount = requirements.filter(req => req.valid && (req.showOnly !== false)).length;
  const totalCount = requirements.filter(req => req.showOnly !== false).length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Password Requirements</h4>
        <div className="flex items-center space-x-2">
          <div className={`text-xs px-2 py-1 rounded-full ${
            validCount === totalCount 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {validCount}/{totalCount} Complete
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {requirements.map((req) => {
          if (req.showOnly === false) return null;
          
          return (
            <motion.div
              key={req.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                req.valid 
                  ? 'bg-green-500/20 border border-green-500' 
                  : 'bg-gray-700 border border-gray-600'
              }`}>
                {req.valid ? (
                  <CheckCircleIcon className="w-3 h-3 text-green-400" />
                ) : (
                  <XCircleIcon className="w-3 h-3 text-gray-500" />
                )}
              </div>
              <span className={`text-sm transition-colors duration-300 ${
                req.valid ? 'text-green-400' : 'text-gray-400'
              }`}>
                {req.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Password Strength Indicator */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Password Strength</span>
          <span className={`text-xs font-semibold ${
            validCount === 0 ? 'text-gray-500' :
            validCount <= 2 ? 'text-red-400' :
            validCount <= 4 ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {validCount === 0 ? 'No password' :
             validCount <= 2 ? 'Weak' :
             validCount <= 4 ? 'Medium' :
             'Strong'}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(validCount / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
            className={`h-2 rounded-full transition-all duration-300 ${
              validCount === 0 ? 'bg-gray-600' :
              validCount <= 2 ? 'bg-red-500' :
              validCount <= 4 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;