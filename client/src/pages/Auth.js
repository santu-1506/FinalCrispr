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
  
  // Check for saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    
    if (shouldRemember && savedEmail && savedPassword) {
      setFormData(prev => ({ ...prev, email: savedEmail, password: savedPassword }));
      setRememberMe(true);
      setIsLogin(true);
      
      // Auto-login after a short delay
      setTimeout(() => {
        handleAutoLogin(savedEmail, savedPassword);
      }, 500);
    }
  }, []);
  
  const navigate = useNavigate();
  const location = useLocation();

  // --- Hardcoded Credentials ---
  const VALID_EMAIL = 'kmit@example.com';
  const VALID_PASSWORD = 'kmit';
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAutoLogin = async (email, password) => {
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', 'KMIT User');
      toast.success('Welcome back! Auto-logged in.');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));   

    try {
      if (isLogin) {
        if (formData.email === VALID_EMAIL && formData.password === VALID_PASSWORD) {
          // Save credentials if Remember Me is checked
          if (rememberMe) {
            localStorage.setItem('savedEmail', formData.email);
            localStorage.setItem('savedPassword', formData.password);
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.removeItem('savedEmail');
            localStorage.removeItem('savedPassword');
            localStorage.removeItem('rememberMe');
          }
          
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('userEmail', formData.email);
          localStorage.setItem('userName', 'KMIT User');
          toast.success('Login Successful! Welcome back.');
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        } else {
          toast.error('Invalid credentials. Please try again.');
        }
      } else {
        if (!formData.fullName || !formData.email || !formData.password) {
          toast.error('Please fill in all fields.');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match.');
          return;
        }
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('userName', formData.fullName);
        toast.success('Account created! Welcome to CRISPR Predict.');
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      toast.error('Authentication failed. Please try again.');
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