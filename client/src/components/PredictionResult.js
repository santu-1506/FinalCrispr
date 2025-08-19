import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  BeakerIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Components
import Cas9Animation from './Cas9Animation';

const PredictionResult = ({ prediction }) => {
  const {
    sgRNA,
    DNA,
    prediction: predictionData
  } = prediction;

  const isSuccess = predictionData.label === 1;
  const confidence = predictionData.confidence;

  return (
    <div className="bg-gray-800 rounded-xl shadow-card p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${
          isSuccess ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500'
        } flex items-center justify-center`}>
          <BeakerIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Prediction Result</h2>
          <p className="text-gray-600">CRISPR gene editing success analysis</p>
        </div>
      </div>

      {/* Main Result */}
      <div className={`p-6 rounded-lg border-2 mb-6 ${
        isSuccess 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center space-x-3 mb-3">
          {isSuccess ? (
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          ) : (
            <XCircleIcon className="w-8 h-8 text-red-600" />
          )}
          <span className={`text-xl font-bold ${
            isSuccess ? 'text-green-800' : 'text-red-800'
          }`}>
            {isSuccess ? 'Successful Editing Predicted' : 'No Editing Expected'}
          </span>
        </div>
        <p className={`text-sm ${
          isSuccess ? 'text-green-700' : 'text-red-700'
        }`}>
          {isSuccess 
            ? 'CRISPR Cas9 can successfully cut this target sequence'
            : 'CRISPR Cas9 cannot cut this target sequence'
          }
        </p>
        
        {/* Confidence */}
        <div className="mt-4 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Confidence:</span>
          <span className={`text-lg font-bold ${
            confidence >= 80 ? 'text-green-600' :
            confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {confidence}%
          </span>
        </div>
      </div>

      {/* Sequences */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Input Sequences</h3>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">Guide RNA (sgRNA)</div>
            <div className="font-mono text-sm bg-gray-50 p-3 rounded-lg border">
              {sgRNA.split('').map((base, i) => (
                <span key={i} className={`nucleotide nucleotide-${base}`}>
                  {base}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Target DNA</div>
            <div className="font-mono text-sm bg-gray-50 p-3 rounded-lg border">
              {DNA.split('').map((base, i) => (
                <span key={i} className={`nucleotide nucleotide-${base}`}>
                  {base}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cas9 Animation */}
      <div className="mt-6">
        <Cas9Animation 
          pamCompatible={predictionData.pamMatch}
          sgRNA={sgRNA}
          DNA={DNA}
          showAnimation={true}
        />
      </div>
    </div>
  );
};

export default PredictionResult;
