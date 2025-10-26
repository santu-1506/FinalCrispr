import React from 'react';
import { motion } from 'framer-motion';
import {
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SequenceInput = ({ sequences, setSequences, validationErrors }) => {
  const formatSequence = (sequence) => {
    // Allow ATCG and - (for indels/deletions)
    return sequence.toUpperCase().replace(/[^ATCG-]/g, '');
  };

  const handleSequenceChange = (field, value) => {
    const formatted = formatSequence(value);
    if (formatted.length <= 23) {
      setSequences(prev => ({ ...prev, [field]: formatted }));
    }
  };

  const renderSequence = (sequence) => {
    if (!sequence) return null;
    
    return sequence.split('').map((nucleotide, index) => (
      <span
        key={index}
        className={`nucleotide nucleotide-${nucleotide} inline-block`}
      >
        {nucleotide}
      </span>
    ));
  };

  const calculateGCContent = (sequence) => {
    if (!sequence) return 0;
    const gcCount = (sequence.match(/[GC]/g) || []).length;
    return Math.round((gcCount / sequence.length) * 100);
  };

  const checkPAMSequence = (sequence) => {
    if (sequence.length < 3) return null;
    const pam = sequence.slice(-3);
    const isValid = pam.slice(-2) === 'GG';
    return { pam, isValid };
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Sequence Input</h2>
      
      {/* Indel Information */}
      <div className="mb-4 bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <span className="font-semibold">Indel Support:</span> Use <code className="bg-blue-800/50 px-1 py-0.5 rounded text-blue-300">-</code> (dash) to represent insertions/deletions in your sequences
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* sgRNA Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Guide RNA (sgRNA) - 23 nucleotides
          </label>
          <div className="relative">
            <input
              type="text"
              value={sequences.sgRNA}
              onChange={(e) => handleSequenceChange('sgRNA', e.target.value)}
              placeholder="Enter sgRNA sequence (A, T, C, G, - for indels)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-700 text-white placeholder-gray-400 ${
                validationErrors.sgRNA ? 'border-red-500' : 'border-gray-600'
              }`}
              maxLength={23}
            />
            <div className="absolute right-3 top-2 text-xs text-gray-400">
              {sequences.sgRNA.length}/23
            </div>
          </div>
          
          {validationErrors.sgRNA && (
            <div className="mt-1 flex items-center space-x-1 text-red-600 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>{validationErrors.sgRNA}</span>
            </div>
          )}
          
          {sequences.sgRNA && (
            <div className="mt-3">
              <div className="sequence-display">
                {renderSequence(sequences.sgRNA)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                {sequences.sgRNA.length >= 3 && (
                  <div>
                    <span className="text-gray-300">PAM: </span>
                    <span className={`font-mono font-medium ${
                      checkPAMSequence(sequences.sgRNA)?.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ...{checkPAMSequence(sequences.sgRNA)?.pam}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DNA Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target DNA - 23 nucleotides
          </label>
          <div className="relative">
            <input
              type="text"
              value={sequences.DNA}
              onChange={(e) => handleSequenceChange('DNA', e.target.value)}
              placeholder="Enter target DNA sequence (A, T, C, G, - for indels)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-700 text-white placeholder-gray-400 ${
                validationErrors.DNA ? 'border-red-500' : 'border-gray-600'
              }`}
              maxLength={23}
            />
            <div className="absolute right-3 top-2 text-xs text-gray-400">
              {sequences.DNA.length}/23
            </div>
          </div>
          
          {validationErrors.DNA && (
            <div className="mt-1 flex items-center space-x-1 text-red-600 text-sm">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>{validationErrors.DNA}</span>
            </div>
          )}
          
          {sequences.DNA && (
            <div className="mt-3">
              <div className="sequence-display">
                {renderSequence(sequences.DNA)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                {sequences.DNA.length >= 3 && (
                  <div>
                    <span className="text-gray-300">PAM: </span>
                    <span className={`font-mono font-medium ${
                      checkPAMSequence(sequences.DNA)?.isValid ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ...{checkPAMSequence(sequences.DNA)?.pam}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sequence Comparison */}
        {sequences.sgRNA && sequences.DNA && sequences.sgRNA.length === 23 && sequences.DNA.length === 23 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-t border-gray-600 pt-4"
          >
          </motion.div>
        )}


      </div>
    </div>
  );
};

export default SequenceInput;
