import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BeakerIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ScissorsIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Cas9Animation = ({ pamCompatible, sgRNA, DNA, showAnimation = true }) => {
  const [animationStage, setAnimationStage] = useState('initial');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showAnimation && pamCompatible) {
      const sequence = async () => {
        // Stage 1: Cas9 binding
        setTimeout(() => setAnimationStage('binding'), 500);
        // Stage 2: Recognition
        setTimeout(() => setAnimationStage('recognition'), 1500);
        // Stage 3: Cutting
        setTimeout(() => setAnimationStage('cutting'), 2500);
        // Stage 4: Success
        setTimeout(() => {
          setAnimationStage('success');
          setShowSuccess(true);
        }, 3500);
      };
      sequence();
    } else if (showAnimation && !pamCompatible) {
      setTimeout(() => setAnimationStage('failed'), 500);
    }
  }, [showAnimation, pamCompatible]);

  if (!showAnimation) {
    return null;
  }

  const containerVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  const cas9Variants = {
    initial: { x: -100, y: 0, rotate: 0 },
    binding: { x: 0, y: 0, rotate: 0 },
    recognition: { x: 0, y: 0, rotate: 5, scale: 1.1 },
    cutting: { x: 0, y: 0, rotate: 0, scale: 1.2 },
    success: { x: 20, y: -10, rotate: -10, scale: 1 },
    failed: { x: -20, y: 10, rotate: 15, scale: 0.9 }
  };

  const dnaVariants = {
    initial: { scale: 1, rotate: 0 },
    cutting: { scale: 1.05, rotate: 1 },
    success: { scale: [1, 0.95, 1.1, 1], rotate: [0, -2, 2, 0] },
    failed: { scale: 1, rotate: 0 }
  };

  return (
    <div className="w-full h-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-8 relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-200 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {pamCompatible ? 'CRISPR Cas9 Gene Editing' : 'Gene Editing Failed'}
          </h3>
          <p className="text-sm text-gray-600">
            {pamCompatible 
              ? 'PAM sequence compatible - Cas9 can cut the DNA'
              : 'PAM sequence incompatible - Cas9 cannot cut the DNA'
            }
          </p>
        </motion.div>

        {/* Animation Area */}
        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {pamCompatible ? (
              <motion.div
                key="success-animation"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative w-full h-full"
              >
                {/* DNA Strand */}
                <motion.div
                  variants={dnaVariants}
                  animate={animationStage}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                >
                  <div className="relative">
                    {/* DNA visualization */}
                    <div className="flex items-center space-x-1">
                      <div className="text-xs font-mono bg-white p-2 rounded border-2 border-blue-200 shadow-sm">
                        <div className="text-blue-600 mb-1">sgRNA: {sgRNA.slice(0, 8)}...</div>
                        <div className="text-green-600">DNA:   {DNA.slice(0, 8)}...</div>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                      <div className="text-xs font-mono bg-white p-2 rounded border-2 border-purple-200 shadow-sm">
                        PAM: ...{DNA.slice(-3)}
                      </div>
                    </div>
                    
                    {/* Cut effect */}
                    {animationStage === 'cutting' && (
                      <motion.div
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
                        transition={{ duration: 0.8 }}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      >
                        <ScissorsIcon className="w-8 h-8 text-red-500" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Cas9 Protein */}
                <motion.div
                  variants={cas9Variants}
                  animate={animationStage}
                  className="absolute top-1/3 left-1/4"
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                      animate={animationStage === 'recognition' ? { 
                        boxShadow: ["0 4px 6px rgba(0,0,0,0.1)", "0 8px 25px rgba(59,130,246,0.5)", "0 4px 6px rgba(0,0,0,0.1)"]
                      } : {}}
                      transition={{ duration: 0.5, repeat: animationStage === 'recognition' ? 2 : 0 }}
                    >
                      <BeakerIcon className="w-8 h-8 text-white" />
                    </motion.div>
                    <motion.div 
                      className="absolute -top-2 -right-2 text-xs bg-white px-2 py-1 rounded-full shadow-sm border"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: animationStage === 'binding' ? 1 : 0 }}
                    >
                      Cas9
                    </motion.div>
                  </div>
                </motion.div>

                {/* Success indicator */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
                    >
                      <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">Successful Cut!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stage indicators */}
                <div className="absolute bottom-4 left-4 space-y-2">
                  {['binding', 'recognition', 'cutting', 'success'].map((stage, index) => (
                    <motion.div
                      key={stage}
                      className={`flex items-center space-x-2 text-xs ${
                        animationStage === stage || 
                        (['recognition', 'cutting', 'success'].includes(animationStage) && stage === 'binding') ||
                        (['cutting', 'success'].includes(animationStage) && stage === 'recognition') ||
                        (['success'].includes(animationStage) && stage === 'cutting')
                          ? 'text-green-600' 
                          : 'text-gray-400'
                      }`}
                      animate={{
                        opacity: animationStage === stage ? [0.5, 1, 0.5] : 1
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: animationStage === stage ? Infinity : 0
                      }}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        animationStage === stage || 
                        (['recognition', 'cutting', 'success'].includes(animationStage) && stage === 'binding') ||
                        (['cutting', 'success'].includes(animationStage) && stage === 'recognition') ||
                        (['success'].includes(animationStage) && stage === 'cutting')
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                      }`} />
                      <span className="capitalize">{stage}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="failure-animation"
                variants={containerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative w-full h-full flex flex-col items-center justify-center"
              >
                {/* Failed attempt visualization */}
                <motion.div
                  animate={animationStage === 'failed' ? { x: [-20, 20, -10, 10, 0] } : {}}
                  transition={{ duration: 1 }}
                  className="relative"
                >
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                      <BeakerIcon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-2xl text-gray-400">×</div>
                    <div className="text-xs font-mono bg-white p-3 rounded border-2 border-red-200 shadow-sm">
                      <div className="text-blue-600 mb-1">sgRNA: {sgRNA.slice(0, 8)}...</div>
                      <div className="text-green-600 mb-1">DNA:   {DNA.slice(0, 8)}...</div>
                      <div className="text-red-600">PAM: ...{DNA.slice(-3)} ❌</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full"
                >
                  <XCircleIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Cannot Cut - PAM Mismatch</span>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="text-xs text-gray-500 text-center mt-4 max-w-xs"
                >
                  CRISPR Cas9 requires a compatible PAM sequence (NGG) for successful cutting. 
                  The current sequence does not meet this requirement.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Cas9Animation;
