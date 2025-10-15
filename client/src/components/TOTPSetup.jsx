import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  ShieldCheckIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TOTPSetup = ({ onBack }) => {
  const [step, setStep] = useState('setup'); // 'setup', 'qr', 'verify', 'success'
  const [formData, setFormData] = useState({
    totpToken: ''
  });
  const [qrCodeData, setQrCodeData] = useState(null);
  const [manualKey, setManualKey] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle TOTP setup initiation
  const handleSetupTOTP = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/auth/totp/setup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setQrCodeData(response.data.data.qrCode);
        setManualKey(response.data.data.manualEntryKey);
        setStep('qr');
        toast.success('TOTP setup initiated! Scan the QR code with your authenticator app.');
      }
    } catch (error) {
      console.error('TOTP setup error:', error);
      toast.error(error.response?.data?.message || 'Failed to setup TOTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle TOTP setup verification
  const handleVerifySetup = async () => {
    if (!formData.totpToken || formData.totpToken.length !== 6) {
      setErrors({ totpToken: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/auth/totp/verify-setup`, {
        token: formData.totpToken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBackupCodes(response.data.data.backupCodes);
        setStep('success');
        toast.success('🎉 TOTP enabled successfully! Please save your backup codes.');
      }
    } catch (error) {
      console.error('TOTP verify setup error:', error);
      toast.error(error.response?.data?.message || 'Invalid code. Please try again.');
      setErrors({ totpToken: 'Invalid code' });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  // Copy all backup codes
  const copyAllBackupCodes = () => {
    const allCodes = backupCodes.join('\n');
    copyToClipboard(allCodes);
  };

  const renderSetupStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h3 className="font-medium text-blue-400 mb-2">📱 Download an Authenticator App</h3>
        <p className="text-sm text-gray-300 mb-3">
          You'll need an authenticator app to generate codes. We recommend:
        </p>
        <ul className="space-y-1 text-sm text-gray-400">
          <li>• <strong>Google Authenticator</strong> (Free, iOS/Android)</li>
          <li>• <strong>Authy</strong> (Free, with cloud backup)</li>
          <li>• <strong>Microsoft Authenticator</strong> (Free, backup features)</li>
        </ul>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSetupTOTP}
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
            <QrCodeIcon className="w-5 h-5" />
            <span>Generate QR Code</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );

  const renderQRStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="bg-white p-4 rounded-lg inline-block mb-4">
          <img 
            src={qrCodeData} 
            alt="TOTP QR Code" 
            className="w-48 h-48 mx-auto"
          />
        </div>
        
        <div className="bg-gray-800/50 p-3 rounded-lg mb-4">
          <p className="text-xs text-gray-400 mb-2">Manual entry key:</p>
          <div className="flex items-center justify-center space-x-2">
            <code className="text-sm font-mono text-blue-400 break-all">{manualKey}</code>
            <button
              onClick={() => copyToClipboard(manualKey)}
              className="text-gray-400 hover:text-white"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-yellow-400 mb-1">Instructions:</h4>
            <ol className="text-sm text-gray-300 space-y-1">
              <li>1. Open your authenticator app</li>
              <li>2. Tap "+" or "Add account"</li>
              <li>3. Scan this QR code with your camera</li>
              <li>4. Enter the 6-digit code below</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            name="totpToken"
            placeholder="Enter 6-digit code"
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

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleVerifySetup}
          disabled={isLoading || formData.totpToken.length !== 6}
          className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center space-x-2 ${
            isLoading || formData.totpToken.length !== 6
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
              <span>Verify & Enable TOTP</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );

  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-400 mb-2">🎉 TOTP Enabled!</h3>
        <p className="text-gray-400">Your account is now secured with two-factor authentication</p>
      </div>

      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
        <div className="flex items-start space-x-2 mb-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-red-400 mb-1">Important: Save These Backup Codes</h4>
            <p className="text-sm text-gray-300">
              Use these codes to access your account if you lose your phone. Each code can only be used once.
            </p>
          </div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg mb-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            {backupCodes.map((code, index) => (
              <div key={index} className="font-mono text-sm text-blue-400 bg-gray-800/50 p-2 rounded">
                {code}
              </div>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyAllBackupCodes}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <ClipboardDocumentIcon className="w-4 h-4" />
          <span>Copy All Codes</span>
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="w-full font-semibold py-3 px-4 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center justify-center space-x-2"
      >
        <CheckCircleIcon className="w-5 h-5" />
        <span>Continue to Settings</span>
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
            <ShieldCheckIcon className="w-10 h-10 text-blue-400" />
          </motion.div>
          
          <h1 className="text-3xl font-bold tracking-tight">
            {step === 'setup' && 'Setup Authenticator'}
            {step === 'qr' && 'Scan QR Code'}
            {step === 'success' && 'Setup Complete!'}
          </h1>
          <p className="text-gray-400 mt-2">
            {step === 'setup' && 'Get started with two-factor authentication'}
            {step === 'qr' && 'Use your authenticator app to scan this code'}
            {step === 'success' && 'Save these codes in a safe place'}
          </p>
        </div>

        {/* Form Content */}
        <div className="p-8 pt-0">
          {step === 'setup' && renderSetupStep()}
          {step === 'qr' && renderQRStep()}
          {step === 'success' && renderSuccessStep()}

          {/* Back button */}
          {step !== 'success' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (step === 'qr') {
                  setStep('setup');
                } else {
                  onBack();
                }
              }}
              className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center space-x-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Go Back</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TOTPSetup;
