import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  UserIcon,
  CogIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import TOTPSetup from '../components/TOTPSetup';
// import axios from 'axios';

// API base URL
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!token || !userData) {
      toast.error('Please login to access settings');
      navigate('/auth');
      return;
    }

    try {
      const user = JSON.parse(userData);
      setUser(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      toast.error('Error loading user data');
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('refreshToken');
    
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleTOTPSetup = () => {
    setShowTOTPSetup(true);
  };

  const handleBackToSettings = () => {
    setShowTOTPSetup(false);
    // Refresh user data to show updated TOTP status
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
        />
      </div>
    );
  }

  if (showTOTPSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
        <TOTPSetup onBack={handleBackToSettings} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </motion.button>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.fullName || user?.email}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Logout
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Account Settings</h1>
            <p className="text-gray-400">Manage your account security and preferences</p>
          </div>

          {/* Settings Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* User Profile Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-[#1f2937]/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center space-x-3 mb-4">
                <UserIcon className="w-8 h-8 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Profile Information</h2>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Full Name</label>
                  <p className="text-white font-medium">{user?.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Account Type</label>
                  <p className="text-white font-medium">Standard User</p>
                </div>
              </div>
            </motion.div>

            {/* Security Settings Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-[#1f2937]/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center space-x-3 mb-4">
                <ShieldCheckIcon className="w-8 h-8 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Security Settings</h2>
              </div>
              
              <div className="space-y-4">
                {/* TOTP Status */}
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user?.totpEnabled ? 'bg-green-400' : 'bg-gray-400'}`} />
                    <div>
                      <p className="text-white font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-400">
                        {user?.totpEnabled ? 'Enabled' : 'Not enabled'}
                      </p>
                    </div>
                  </div>
                  
                  {!user?.totpEnabled && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTOTPSetup}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm"
                    >
                      Enable
                    </motion.button>
                  )}
                  
                  {user?.totpEnabled && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircleIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">Active</span>
                    </div>
                  )}
                </div>

                {/* Security Info */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-400 mb-1">Security Recommendation</h4>
                      <p className="text-sm text-gray-300">
                        Enable two-factor authentication to add an extra layer of security to your account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Additional Settings */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-[#1f2937]/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex items-center space-x-3 mb-4">
              <CogIcon className="w-8 h-8 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Additional Settings</h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="font-medium text-white mb-2">Password</h3>
                <p className="text-sm text-gray-400 mb-3">Change your account password</p>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm">
                  Change Password
                </button>
              </div>
              
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <h3 className="font-medium text-white mb-2">Account Data</h3>
                <p className="text-sm text-gray-400 mb-3">Download or delete your account data</p>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm">
                  Manage Data
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
