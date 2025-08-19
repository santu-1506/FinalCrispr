import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BeakerIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { savePredictionResult, getCurrentUser } from '../utils/userStorage';

// Components
import SequenceInput from '../components/SequenceInput';
import PredictionResult from '../components/PredictionResult';

const Predict = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sequences, setSequences] = useState({
    sgRNA: '',
    DNA: '',
    actualLabel: 1
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Sample sequences for quick testing
  // Load prediction details from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const predictionId = urlParams.get('id');
    
    if (predictionId) {
      loadPredictionDetails(predictionId);
    }
  }, [location.search]);

  // Load existing prediction details
  const loadPredictionDetails = async (predictionId) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`/api/predictions/${predictionId}`);
      const predictionData = response.data.data;
      
      // Set the sequences from the loaded prediction
      setSequences({
        sgRNA: predictionData.sgRNA,
        DNA: predictionData.DNA,
        actualLabel: predictionData.actualLabel
      });
      

      
      // Transform the prediction data to match the expected format
      const transformedPrediction = {
        sgRNA: predictionData.sgRNA,
        DNA: predictionData.DNA,
        prediction: {
          label: predictionData.predictedLabel,
          confidence: Math.round(predictionData.confidence * 100),
          category: predictionData.category,
          pamMatch: predictionData.pamMatch
        },
        metrics: {
          totalMatches: predictionData.totalMatches,
          processingTime: predictionData.processingTime
        },
        prediction_source: predictionData.prediction_source || 'AI_model',
        model_prediction: predictionData.predictedLabel,
        model_confidence: predictionData.confidence,
        pam_prediction: predictionData.pamMatch ? 1 : 0
      };
      
      setPrediction(transformedPrediction);
      toast.success('Prediction details loaded successfully!');
      
      // Clear the URL parameter to clean up the URL
      navigate('/predict', { replace: true });
      
    } catch (error) {
      console.error('Error loading prediction details:', error);
      toast.error('Failed to load prediction details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const sampleSequences = [
    {
      name: "Perfect Match Example",
      sgRNA: "ATCGATCGATCGATCGATCAGGG",
      DNA: "ATCGATCGATCGATCGATCAGGG",
      actualLabel: 1
    },
    {
      name: "PAM Mismatch Example", 
      sgRNA: "ATCGATCGATCGATCGATCAGGG",
      DNA: "ATCGATCGATCGATCGATCTGGA",
      actualLabel: 0
    },
    {
      name: "Real Data Sample",
      sgRNA: "GTCACCTCCAATGACTAGGGAGG",
      DNA: "GTCTCCTCCACTGGATTGTGAGG",
      actualLabel: 0
    }
  ];



  // Validation
  const validateSequences = () => {
    const errors = {};
    
    if (!sequences.sgRNA) {
      errors.sgRNA = 'sgRNA sequence is required';
    } else if (sequences.sgRNA.length !== 23) {
      errors.sgRNA = 'sgRNA must be exactly 23 nucleotides long';
    } else if (!/^[ATCG]+$/i.test(sequences.sgRNA)) {
      errors.sgRNA = 'sgRNA must contain only A, T, C, G nucleotides';
    }

    if (!sequences.DNA) {
      errors.DNA = 'DNA sequence is required';
    } else if (sequences.DNA.length !== 23) {
      errors.DNA = 'DNA must be exactly 23 nucleotides long';
    } else if (!/^[ATCG]+$/i.test(sequences.DNA)) {
      errors.DNA = 'DNA must contain only A, T, C, G nucleotides';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Make prediction
  const handlePredict = async () => {
    if (!validateSequences()) {
      toast.error('Please fix validation errors');
      return;
    }

    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error('Please log in to make predictions');
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {
      const response = await axios.post('/api/predictions/text', {
        sgRNA: sequences.sgRNA.toUpperCase(),
        DNA: sequences.DNA.toUpperCase(),
        actualLabel: sequences.actualLabel
      });

      const predictionResult = response.data.data;
      setPrediction(predictionResult);
      
      // Save to user's personal storage
      savePredictionResult(predictionResult);
      
      toast.success('Prediction completed and saved successfully!');
      
    } catch (error) {
      console.error('Prediction error:', error);
      
      // Generate mock result if API is not available
      const mockResult = {
        sgRNA: sequences.sgRNA.toUpperCase(),
        DNA: sequences.DNA.toUpperCase(),
        prediction: Math.random() > 0.5 ? 1 : 0,
        confidence: Math.random() * 0.4 + 0.5,
        prediction_source: "Mock_prediction",
        model_prediction: Math.random() > 0.5 ? 1 : 0,
        model_confidence: Math.random() * 0.4 + 0.5,
        pam_prediction: Math.random() > 0.7 ? 1 : 0,
        pam_match: Math.random() > 0.3,
        total_matches: Math.floor(Math.random() * 200) + 100,
        match_matrix: Array(23).fill().map(() => Array(23).fill().map(() => Math.random() > 0.7 ? 1 : 0)),
        timestamp: new Date().toISOString()
      };
      
      setPrediction(mockResult);
      
      // Save mock result to user's personal storage
      savePredictionResult(mockResult);
      
      toast.success('Mock prediction generated and saved!');
    } finally {
      setLoading(false);
    }
  };

  // Load sample sequence
  const loadSample = (sample) => {
    setSequences(sample);
    setPrediction(null);
    setValidationErrors({});
    toast.success(`Loaded: ${sample.name}`);
  };

  // Reset form
  const resetForm = () => {
    setSequences({ sgRNA: '', DNA: '', actualLabel: 1 });
    setPrediction(null);
    setValidationErrors({});
  };

  // Show loading indicator while loading prediction details
  if (loadingDetails) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Prediction Details</h2>
          <p className="text-gray-600">Please wait while we load the prediction data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center space-x-2 bg-blue-900/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <BeakerIcon className="w-4 h-4" />
          <span>CRISPR Prediction</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          CRISPR Gene editing Prediction Tool
        </h1>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Input your guide RNA and target DNA sequences to predict CRISPR editing success rates
          using our advanced AI model.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sequence Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SequenceInput
              sequences={sequences}
              setSequences={setSequences}
              validationErrors={validationErrors}
            />
          </motion.div>

          {/* Prediction Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex space-x-4"
          >
            <button
              onClick={handlePredict}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Predicting...</span>
                </>
              ) : (
                <>
                  <BeakerIcon className="w-5 h-5" />
                  <span>Predict Success</span>
                </>
              )}
            </button>
            
            <button
              onClick={resetForm}
              className="px-6 py-3 border border-gray-600 text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sample Sequences */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl shadow-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Sample Sequences</h3>
            <div className="space-y-3">
              {sampleSequences.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => loadSample(sample)}
                  className="w-full text-left p-3 border border-gray-600 rounded-lg hover:border-blue-400 hover:bg-gray-700 transition-all"
                >
                  <div className="font-medium text-white text-sm">{sample.name}</div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    {sample.sgRNA.slice(0, 10)}...
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-6"
          >
          </motion.div>

          {/* Processing Time */}
          {prediction && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-green-50 rounded-xl p-6"
            >
            </motion.div>
          )}
        </div>
      </div>

      {/* Prediction Results */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <PredictionResult prediction={prediction} />
        </motion.div>
      )}


    </div>
  );
};



export default Predict;
