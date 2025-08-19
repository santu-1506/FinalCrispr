import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  getCurrentUser, 
  getUserPredictions, 
  getUserStats, 
  deletePrediction,
  exportUserData
} from '../utils/userStorage';

const Results = () => {
  const [predictions, setPredictions] = useState([]);
  const [filteredPredictions, setFilteredPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPrediction, setFilterPrediction] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [userStats, setUserStats] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    filterAndSortPredictions();
  }, [predictions, searchTerm, filterPrediction, sortBy]);

  const loadUserData = () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        toast.error('Please log in to view your results');
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      const userPredictions = getUserPredictions();
      const stats = getUserStats();
      
      // Debug logging
      console.log('Current user:', user);
      console.log('User predictions:', userPredictions);
      console.log('User stats:', stats);
      
      setPredictions(userPredictions);
      setUserStats(stats);
      
      if (userPredictions.length === 0) {
        toast.info('No predictions yet. Start by making your first prediction!');
      } else {
        console.log(`Loaded ${userPredictions.length} predictions for user ${user.email}`);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load your results');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPredictions = () => {
    let filtered = [...predictions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(prediction => 
        prediction.sgRNA?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prediction.DNA?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Prediction filter
    if (filterPrediction !== 'all') {
      if (filterPrediction === 'success') {
        filtered = filtered.filter(prediction => prediction.prediction === 1);
      } else if (filterPrediction === 'no_edit') {
        filtered = filtered.filter(prediction => prediction.prediction === 0);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'oldest':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'confidence_high':
          return b.confidence - a.confidence;
        case 'confidence_low':
          return a.confidence - b.confidence;
        default:
          return 0;
      }
    });

    setFilteredPredictions(filtered);
  };

  const handleDeletePrediction = (predictionId) => {
    if (window.confirm('Are you sure you want to delete this prediction?')) {
      if (deletePrediction(predictionId)) {
        toast.success('Prediction deleted successfully');
        loadUserData(); // Reload data
      } else {
        toast.error('Failed to delete prediction');
      }
    }
  };

  const getPredictionInfo = (prediction) => {
    if (prediction === 1) {
      return {
        name: 'Success',
        color: 'green',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    } else {
      return {
        name: 'No Edit',
        color: 'red',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      };
    }
  };

  const exportResults = () => {
    try {
      const userData = exportUserData();
      const jsonContent = JSON.stringify(userData, null, 2);
      
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crispr_user_data_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Authentication Required</h3>
        <p className="text-gray-300 mb-4">Please log in to view your prediction results.</p>
        <Link
          to="/auth"
          className="inline-flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <span>Sign In</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center space-x-2 bg-blue-900/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <DocumentTextIcon className="w-4 h-4" />
          <span>Your Prediction Results</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {currentUser.name}!
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Your personal CRISPR prediction history and analysis dashboard.
        </p>
      </motion.div>

      {/* User Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        {[
          { label: 'Total Predictions', value: userStats.totalPredictions || 0, icon: ChartBarIcon, color: 'blue' },
          { label: 'Success Rate', value: `${userStats.successRate || 0}%`, icon: DocumentTextIcon, color: 'green' },
          { label: 'Avg Confidence', value: `${userStats.averageConfidence || 0}%`, icon: ChartBarIcon, color: 'purple' },
          { label: 'Recent Activity', value: userStats.recentActivity || 0, icon: CalendarIcon, color: 'orange' }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-xl shadow-card p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sequences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-4">
            {/* Prediction Filter */}
            <select
              value={filterPrediction}
              onChange={(e) => setFilterPrediction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Predictions</option>
              <option value="success">Success Only</option>
              <option value="no_edit">No Edit Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="confidence_high">High Confidence</option>
              <option value="confidence_low">Low Confidence</option>
            </select>

            {/* Export */}
            <button
              onClick={exportResults}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Filtered Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-300">Filtered Results: </span>
              <span className="font-semibold">{filteredPredictions.length}</span>
            </div>
            <div>
              <span className="text-gray-300">Avg Confidence: </span>
              <span className="font-semibold">
                {filteredPredictions.length > 0 
                  ? Math.round(filteredPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / filteredPredictions.length * 100) 
                  : 0}%
              </span>
            </div>
            <div>
              <span className="text-gray-300">PAM Matches: </span>
              <span className="font-semibold">
                {filteredPredictions.filter(p => p.pam_match).length}
              </span>
            </div>
            <div>
              <span className="text-gray-300">Success Rate: </span>
              <span className="font-semibold">
                {filteredPredictions.length > 0 
                  ? Math.round(filteredPredictions.filter(p => p.prediction === 1).length / filteredPredictions.length * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Results Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {filteredPredictions.length > 0 ? (
          filteredPredictions.map((prediction, index) => {
            const predictionInfo = getPredictionInfo(prediction.prediction);
            return (
              <motion.div
                key={prediction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gray-800 rounded-lg shadow-card border-l-4 ${predictionInfo.borderColor} p-6 hover:shadow-lg transition-shadow`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${predictionInfo.bgColor} ${predictionInfo.textColor}`}>
                    {predictionInfo.name}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-400">
                      {format(new Date(prediction.timestamp), 'MMM dd, yyyy')}
                    </div>
                    <button
                      onClick={() => handleDeletePrediction(prediction.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sequences */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Guide RNA</div>
                    <div className="font-mono text-xs bg-gray-700 text-white p-2 rounded break-all">
                      {prediction.sgRNA}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Target DNA</div>
                    <div className="font-mono text-xs bg-gray-700 text-white p-2 rounded break-all">
                      {prediction.DNA}
                    </div>
                  </div>
                </div>

                {/* Prediction Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Prediction:</span>
                    <span className={`font-medium ${prediction.prediction === 1 ? 'text-green-600' : 'text-red-600'}`}>
                      {prediction.prediction === 1 ? 'Success' : 'No Edit'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Confidence:</span>
                    <span className="font-medium">{Math.round((prediction.confidence || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">PAM Match:</span>
                    <span className={`font-medium ${prediction.pam_match ? 'text-green-600' : 'text-red-600'}`}>
                      {prediction.pam_match ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Source:</span>
                    <span className="font-medium text-xs">{prediction.prediction_source || 'Model'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-600">
                  <div className="text-xs text-gray-400">
                    Total Matches: {prediction.total_matches || 0}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/predict`}
                      className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>Predict</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
            <p className="text-gray-300 mb-4">
              {searchTerm || filterPrediction !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No predictions have been made yet.'
              }
            </p>
            <Link
              to="/predict"
              className="inline-flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>Make a Prediction</span>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Results;
