import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = determined
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check authentication status with JWT validation
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        console.log('ProtectedRoute: Checking auth...', { hasToken: !!token, hasUserData: !!userData });
        
        if (!token || !userData) {
          setIsAuthenticated(false);
          setIsLoading(false);
          console.log('ProtectedRoute: No token or userData found');
          return;
        }

        // Verify token is still valid
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp < currentTime) {
          // Token expired, clean up
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('refreshToken');
          setIsAuthenticated(false);
          setIsLoading(false);
          console.log('ProtectedRoute: Token expired');
          return;
        }

        // Token is valid
        setIsAuthenticated(true);
        setIsLoading(false);
        console.log('ProtectedRoute: Authentication valid');
      } catch (error) {
        // Invalid token or parsing error, clean up
        console.error('ProtectedRoute Token validation error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    // Small delay to prevent flash
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [location]); // Re-check authentication when location changes

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <LockClosedIcon className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="text-lg font-semibold text-gray-700 mb-2">Checking Authentication</div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </motion.div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page with the current location
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
