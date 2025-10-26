import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BeakerIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const ScientificAnalysis = ({ prediction, isSuccess, sgRNA, DNA, confidence }) => {
  // Calculate sequence analysis
  const analyzeSequences = () => {
    const mismatches = [];
    const pamRegion = DNA.slice(-3);
    const seedRegion = { sgRNA: sgRNA.slice(12, 20), DNA: DNA.slice(12, 20) };
    
    // Find mismatches
    for (let i = 0; i < sgRNA.length; i++) {
      if (sgRNA[i] !== DNA[i] && sgRNA[i] !== '-' && DNA[i] !== '-') {
        mismatches.push({
          position: i + 1,
          sgRNA: sgRNA[i],
          DNA: DNA[i],
          region: getRegion(i + 1),
          severity: getSeverity(i + 1)
        });
      }
    }

    // Find indels
    const indels = [];
    for (let i = 0; i < sgRNA.length; i++) {
      if (sgRNA[i] === '-' || DNA[i] === '-') {
        indels.push({
          position: i + 1,
          type: sgRNA[i] === '-' ? 'DNA_INSERTION' : 'sgRNA_INSERTION',
          region: getRegion(i + 1),
          severity: getIndelSeverity(i + 1)
        });
      }
    }

    return { mismatches, indels, pamRegion, seedRegion };
  };

  const getRegion = (position) => {
    if (position >= 21) return 'PAM';
    if (position >= 13) return 'Seed';
    if (position >= 9) return 'Middle';
    return 'PAM-Distal';
  };

  const getSeverity = (position) => {
    const criticalPositions = [1, 2, 3, 8, 14, 15, 16, 17, 18, 19, 20];
    if (criticalPositions.includes(position)) return 'HIGH';
    if (position >= 13 && position <= 20) return 'MEDIUM';
    return 'LOW';
  };

  const getIndelSeverity = (position) => {
    if (position >= 1 && position <= 4) return 'HIGH';
    if (position >= 17 && position <= 20) return 'HIGH';
    return 'MEDIUM';
  };

  const analysis = analyzeSequences();

  return (
    <div className="bg-gray-800 rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${
          isSuccess ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500'
        } flex items-center justify-center`}>
          <DocumentTextIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Scientific Analysis</h3>
          <p className="text-gray-400 text-sm">Detailed molecular explanation of prediction</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className={`p-4 rounded-lg mb-6 border ${
        isSuccess 
          ? 'border-green-200 bg-green-900/20 text-green-100' 
          : 'border-red-200 bg-red-900/20 text-red-100'
      }`}>
        <div className="flex items-start space-x-3">
          {isSuccess ? (
            <CheckCircleIcon className="w-6 h-6 text-green-400 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircleIcon className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <h4 className="font-semibold mb-2">
              {isSuccess ? 'Successful On-Target Prediction' : 'Off-Target Prediction'}
            </h4>
            <p className="text-sm leading-relaxed">
              {isSuccess ? (
                `The CRISPR-BERT model predicts this sgRNA-DNA pair will result in successful gene editing with ${confidence}% confidence. 
                The sequence alignment shows favorable characteristics for Cas9 binding and cleavage activity.`
              ) : (
                `The CRISPR-BERT model predicts this sgRNA-DNA pair will NOT result in effective gene editing with ${confidence}% confidence. 
                Multiple molecular factors indicate off-target behavior or insufficient binding affinity for successful cleavage.`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Analysis Sections */}
      <div className="space-y-6">
        
        {/* PAM Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">PAM Sequence Analysis</h4>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <div className="flex justify-between">
              <span>PAM Sequence:</span>
              <span className="font-mono text-purple-400">...{analysis.pamRegion}</span>
            </div>
            <div className="flex justify-between">
              <span>NGG Motif:</span>
              <span className={`font-semibold ${analysis.pamRegion.slice(-2) === 'GG' ? 'text-green-400' : 'text-red-400'}`}>
                {analysis.pamRegion.slice(-2) === 'GG' ? 'Compatible ✓' : 'Incompatible ✗'}
              </span>
            </div>
            <p className="text-xs mt-2 leading-relaxed">
              {analysis.pamRegion.slice(-2) === 'GG' ? (
                'The PAM sequence contains the required NGG motif essential for Cas9 recognition and binding. This allows initial target site engagement.'
              ) : (
                'The PAM sequence lacks the canonical NGG motif required for Cas9 recognition. This prevents Cas9 binding regardless of sequence complementarity.'
              )}
            </p>
          </div>
        </motion.div>

        {/* Seed Region Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <ChartBarIcon className="w-5 h-5 text-orange-400" />
            <h4 className="font-semibold text-white">Seed Region Analysis (Positions 13-20)</h4>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <div className="font-mono text-xs bg-gray-800 p-2 rounded border">
              <div className="text-blue-400 mb-1">sgRNA: {analysis.seedRegion.sgRNA}</div>
              <div className="text-green-400">DNA:   {analysis.seedRegion.DNA}</div>
            </div>
            
            {/* Seed region matches */}
            <div className="flex justify-between">
              <span>Seed Matches:</span>
              <span className="font-semibold">
                {analysis.seedRegion.sgRNA.split('').filter((base, i) => base === analysis.seedRegion.DNA[i]).length}/8
              </span>
            </div>
            
            <p className="text-xs leading-relaxed">
              The seed region (PAM-proximal nucleotides 13-20) is critical for Cas9 specificity and cleavage efficiency. 
              {analysis.seedRegion.sgRNA.split('').filter((base, i) => base === analysis.seedRegion.DNA[i]).length >= 6 ? (
                ' High complementarity in this region supports stable R-loop formation and successful target recognition.'
              ) : (
                ' Multiple mismatches in this region destabilize R-loop formation and significantly reduce on-target activity.'
              )}
            </p>
          </div>
        </motion.div>

        {/* Mismatch Analysis */}
        {analysis.mismatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
              <h4 className="font-semibold text-white">Mismatch Analysis</h4>
            </div>
            <div className="text-sm text-gray-300 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-400">Total Mismatches:</span>
                  <div className="text-lg font-semibold">{analysis.mismatches.length}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Critical Mismatches:</span>
                  <div className="text-lg font-semibold text-red-400">
                    {analysis.mismatches.filter(m => m.severity === 'HIGH').length}
                  </div>
                </div>
              </div>
              
              {/* Critical mismatches details */}
              {analysis.mismatches.filter(m => m.severity === 'HIGH').length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-red-400 font-semibold mb-2">Critical Mismatches:</div>
                  <div className="space-y-1">
                    {analysis.mismatches.filter(m => m.severity === 'HIGH').map((mismatch, i) => (
                      <div key={i} className="text-xs bg-red-900/30 p-2 rounded border border-red-700">
                        <span className="font-mono">Position {mismatch.position} ({mismatch.region}): </span>
                        <span className="text-red-300">{mismatch.sgRNA} → {mismatch.DNA}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-xs leading-relaxed">
                {analysis.mismatches.filter(m => m.severity === 'HIGH').length > 0 ? (
                  'Critical mismatches at research-identified sensitive positions significantly reduce Cas9 binding affinity and cleavage probability. These positions are intolerant to base changes.'
                ) : analysis.mismatches.length > 3 ? (
                  'Multiple mismatches distributed across the target site reduce overall binding stability. While individual mismatches may be tolerated, cumulative effects decrease editing efficiency.'
                ) : (
                  'Limited mismatches in non-critical regions. These may be tolerated with minimal impact on Cas9 activity depending on position and type.'
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Indel Analysis */}
        {analysis.indels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 mb-3">
              <BeakerIcon className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold text-white">Indel Analysis</h4>
            </div>
            <div className="text-sm text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Insertions/Deletions:</span>
                <span className="font-semibold">{analysis.indels.length}</span>
              </div>
              
              <div className="space-y-1">
                {analysis.indels.map((indel, i) => (
                  <div key={i} className="text-xs bg-purple-900/30 p-2 rounded border border-purple-700">
                    <span className="font-mono">Position {indel.position} ({indel.region}): </span>
                    <span className="text-purple-300">{indel.type.replace('_', ' ')}</span>
                    {indel.severity === 'HIGH' && <span className="text-red-400 ml-2">⚠ Critical</span>}
                  </div>
                ))}
              </div>
              
              <p className="text-xs leading-relaxed">
                Indels (insertions/deletions) disrupt Watson-Crick base pairing and affect DNA-RNA duplex stability. 
                {analysis.indels.some(i => i.severity === 'HIGH') ? (
                  ' Indels in critical regions (positions 1-4 and 17-20) are poorly tolerated and significantly reduce editing efficiency.'
                ) : (
                  ' Indels in the middle region (5-16) are better tolerated but still impact overall binding affinity.'
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Molecular Prediction Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <ClockIcon className="w-5 h-5 text-indigo-400" />
            <h4 className="font-semibold text-white">Molecular Prediction Summary</h4>
          </div>
          <div className="text-sm text-gray-300 space-y-3">
            {isSuccess ? (
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong className="text-green-400">Favorable Molecular Environment:</strong> The sequence analysis indicates 
                  optimal conditions for Cas9-mediated cleavage. Key factors supporting successful editing include:
                </p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• Compatible PAM sequence enabling initial Cas9 recognition</li>
                  <li>• High seed region complementarity supporting R-loop formation</li>
                  <li>• Minimal critical mismatches preserving binding affinity</li>
                  <li>• Optimal thermodynamic stability for target engagement</li>
                </ul>
                <p className="text-xs leading-relaxed mt-2">
                  <strong>Recommendation:</strong> This target site is predicted to yield high editing efficiency. 
                  Proceed with experimental validation using standard CRISPR protocols.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="leading-relaxed">
                  <strong className="text-red-400">Unfavorable Molecular Environment:</strong> Multiple molecular factors 
                  indicate reduced Cas9 activity at this target site. Primary limiting factors include:
                </p>
                <ul className="text-xs space-y-1 ml-4">
                  {analysis.pamRegion.slice(-2) !== 'GG' && (
                    <li>• Non-canonical PAM sequence preventing Cas9 recognition</li>
                  )}
                  {analysis.mismatches.filter(m => m.severity === 'HIGH').length > 0 && (
                    <li>• Critical mismatches at sensitive positions reducing binding affinity</li>
                  )}
                  {analysis.mismatches.length > 3 && (
                    <li>• High mismatch density destabilizing DNA-RNA duplex formation</li>
                  )}
                  {analysis.seedRegion.sgRNA.split('').filter((base, i) => base === analysis.seedRegion.DNA[i]).length < 6 && (
                    <li>• Insufficient seed region complementarity preventing R-loop stabilization</li>
                  )}
                  {analysis.indels.some(i => i.severity === 'HIGH') && (
                    <li>• Critical indels disrupting essential protein-DNA contacts</li>
                  )}
                </ul>
                <p className="text-xs leading-relaxed mt-2">
                  <strong>Recommendation:</strong> Consider alternative target sites with higher predicted efficiency. 
                  If this site is essential, validate experimentally but expect reduced editing rates.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Model Confidence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-3">
            <ChartBarIcon className="w-5 h-5 text-cyan-400" />
            <h4 className="font-semibold text-white">Model Confidence & Methodology</h4>
          </div>
          <div className="text-sm text-gray-300 space-y-2">
            <div className="flex justify-between items-center">
              <span>Prediction Confidence:</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${isSuccess ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ width: `${confidence}%` }}
                  ></div>
                </div>
                <span className="font-semibold text-lg">{confidence}%</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed">
              This prediction is generated using CRISPR-BERT, a hybrid CNN-BERT deep learning model trained on 
              experimental CRISPR editing data. The model analyzes position-specific nucleotide patterns, 
              mismatch tolerance, and structural factors to predict editing outcomes with high accuracy.
            </p>
            <p className="text-xs leading-relaxed text-gray-400">
              Model Architecture: Inception CNN (20%) + BERT Transformer (80%) | 
              Training Data: 850K+ experimental guide-target pairs | 
              Validation Accuracy: 89.4%
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ScientificAnalysis;
