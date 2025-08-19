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
  PhoneIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false); // Default to signup page as per image
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
      
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
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
  
  const handleGoogleSuccess = (credentialResponse) => {
    setIsLoading(true);
    
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      
      // Save user session
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', decoded.email);
      localStorage.setItem('userName', decoded.name);
      
      // If Remember Me is checked, save Google credentials marker
      if (rememberMe) {
        localStorage.setItem('googleAuth', 'true');
        localStorage.setItem('rememberMe', 'true');
      }
      
      toast.success(`Welcome, ${decoded.name}!`);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Failed to process Google authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in failed. Please try again.');
    setIsLoading(false);
  };

  const handlePhoneAuth = () => {
    toast('Phone number authentication is coming soon!', { icon: '📱' });
    // Placeholder for phone auth logic (e.g., Firebase, Twilio)
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '', fullName: '' });
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
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2"
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

export default Auth;