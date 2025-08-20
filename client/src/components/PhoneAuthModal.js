import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import OtpInput from 'react-otp-input';
import 'react-phone-number-input/style.css';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { XMarkIcon, DevicePhoneMobileIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PhoneAuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const resetState = () => {
    setStep(1);
    setPhoneNumber('');
    setOtp('');
    setIsLoading(false);
    setResendTimer(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSendOtp = async () => {
    if (!isValidPhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number.');
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/phone/send-otp`, { phoneNumber });
      toast.success('OTP sent to your phone!');
      setStep(2);
      setResendTimer(60); // Start 60-second timer
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/phone/verify-otp`, { phoneNumber, code: otp });
      if (response.data.success) {
        toast.success('Phone number verified successfully!');
        onAuthSuccess(response.data.data);
        handleClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    // Essentially re-running the send OTP logic
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/phone/send-otp`, { phoneNumber });
      toast.success('A new OTP has been sent.');
      setResendTimer(60);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1f2937] border border-gray-700 p-8 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-white text-center">
                  Sign In with Phone
                </Dialog.Title>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                  <XMarkIcon className="w-6 h-6" />
                </button>

                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <div className="text-center text-gray-400 mb-6">
                        <DevicePhoneMobileIcon className="w-12 h-12 mx-auto text-blue-400 mb-2" />
                        <p>Enter your phone number to receive a one-time verification code.</p>
                      </div>
                      <div className="phone-input-container">
                          <PhoneInput
                            international
                            defaultCountry="US"
                            value={phoneNumber}
                            onChange={setPhoneNumber}
                            className="w-full"
                          />
                      </div>
                      <button
                        onClick={handleSendOtp}
                        disabled={isLoading || !phoneNumber || !isValidPhoneNumber(phoneNumber)}
                        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isLoading ? (
                          <>
                            <motion.div
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Sending...
                          </>
                        ) : 'Send Code'}
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      <div className="text-center text-gray-400 mb-6">
                        <ShieldCheckIcon className="w-12 h-12 mx-auto text-green-400 mb-2" />
                        <p>Enter the 6-digit code sent to:</p>
                        <p className="font-semibold text-white mt-1">{phoneNumber}</p>
                      </div>
                      
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        numInputs={6}
                        renderSeparator={<span className="mx-1.5">-</span>}
                        renderInput={(props) => <input {...props} />}
                        containerStyle="flex justify-center"
                        inputStyle="!w-12 h-14 text-2xl bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300"
                      />

                      <button
                        onClick={handleVerifyOtp}
                        disabled={isLoading || otp.length !== 6}
                        className="mt-6 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isLoading ? (
                           <>
                            <motion.div
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Verifying...
                          </>
                        ) : 'Verify & Sign In'}
                      </button>

                      <div className="mt-4 text-center text-sm text-gray-400">
                        {resendTimer > 0 ? (
                          <span>Resend code in {resendTimer}s</span>
                        ) : (
                          <button onClick={handleResendOtp} className="hover:text-white underline">
                            Resend Code
                          </button>
                        )}
                        <span className="mx-2">|</span>
                        <button onClick={() => setStep(1)} className="hover:text-white underline">
                          Change Number
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PhoneAuthModal;
