import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bars3Icon, 
  XMarkIcon,
  BeakerIcon,
  DocumentTextIcon,
  HomeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Predict', href: '/predict', icon: BeakerIcon },
    { name: 'Results', href: '/results', icon: DocumentTextIcon },
  ];

  const isActive = (path) => location.pathname === path;

  // Check authentication status on component mount and when location changes
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated') === 'true';
    const email = localStorage.getItem('userEmail') || '';
    setIsAuthenticated(authStatus);
    setUserEmail(email);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    // Clear saved credentials if user logs out manually
    localStorage.removeItem('savedEmail');
    localStorage.removeItem('savedPassword');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('googleAuth');
    setIsAuthenticated(false);
    setUserEmail('');
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  return (
    <nav className="bg-[#1f2937] border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
              >
                <BeakerIcon className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold text-white">
                CRISPR Predict
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1 ${
                    isActive(item.href)
                      ? 'text-blue-400 bg-blue-900/20'
                      : 'text-gray-300 hover:text-blue-400 hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-blue-900/30 rounded-md -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            
            {/* Auth Section */}
            <div className={`flex items-center space-x-4 ${isAuthenticated ? 'ml-6 pl-6 border-l border-gray-600' : ''}`}>
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden lg:inline">{userEmail}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-300 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-all duration-200"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg transition-all duration-300"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 transition-colors duration-200"
            >
              {isOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        className="md:hidden overflow-hidden bg-[#1f2937] border-t border-gray-700"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {isAuthenticated && navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-2 ${
                  isActive(item.href)
                    ? 'text-blue-400 bg-blue-900/20'
                    : 'text-gray-300 hover:text-blue-400 hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          
          {/* Mobile Auth Section */}
          <div className="pt-2 mt-2 border-t border-gray-600">
            {isAuthenticated ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm text-gray-300 flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>{userEmail}</span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-red-400 hover:bg-red-900/20 transition-colors duration-200 flex items-center space-x-2"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-2 text-white bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <UserIcon className="w-5 h-5" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;
