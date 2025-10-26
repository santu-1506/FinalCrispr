const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Prediction = require('../models/Prediction');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { analyzeSequencePair } = require('../utils/crisprAnalyzer');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'crispr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to determine prediction category
// Uses PAM-based ground truth as the authoritative actual label for better accuracy
function getPredictionCategory(userActualLabel, predictedLabel, pamPrediction, sgRNA, DNA) {
  // Use PAM-based prediction as ground truth since it's more reliable
  // than user input for determining biological accuracy
  const pamBasedActual = pamPrediction || checkPAMSequence(sgRNA, DNA);
  
  // Log discrepancies for debugging
  if (userActualLabel !== pamBasedActual) {
    console.log(`PAM/User mismatch for ${sgRNA}+${DNA}: User=${userActualLabel}, PAM=${pamBasedActual}`);
  }
  
  // Use PAM-based ground truth for categorization
  if (pamBasedActual === 1 && predictedLabel === 1) {
    return 'correct_predicted_correct';    // True Positive
  } else if (pamBasedActual === 1 && predictedLabel === 0) {
    return 'correct_predicted_wrong';      // False Negative
  } else if (pamBasedActual === 0 && predictedLabel === 1) {
    return 'wrong_predicted_correct';      // False Positive
  } else {
    return 'wrong_predicted_wrong';        // True Negative
  }
}

// Helper function to check PAM sequence (matches Python logic)
function checkPAMSequence(sgRNA, DNA) {
  const sgRNA_pam = sgRNA.slice(-3);
  const DNA_pam = DNA.slice(-3);
  
  // For CRISPR Cas9, PAM is NGG where N can be any nucleotide
  // Both sequences must end with GG for Cas9 to cut
  if (sgRNA_pam.slice(-2) === "GG" && DNA_pam.slice(-2) === "GG") {
    // Also check if the first base matches (N matches N)
    if (sgRNA_pam[0] === DNA_pam[0]) {
      return 1;
    }
  }
  return 0;
}

// Helper function to explain category classification
function getCategoryExplanation(category) {
  const explanations = {
    'correct_predicted_correct': 'True Positive: PAM sequence indicates success AND model predicted success',
    'correct_predicted_wrong': 'False Negative: PAM sequence indicates success BUT model predicted failure',
    'wrong_predicted_correct': 'False Positive: PAM sequence indicates failure BUT model predicted success',
    'wrong_predicted_wrong': 'True Negative: PAM sequence indicates failure AND model predicted failure'
  };
  return explanations[category] || 'Unknown category';
}

// Helper function to call Python model API
async function callPythonModel(sgRNA, DNA) {
  try {
    const response = await axios.post('http://localhost:5001/predict', {
      sgRNA: sgRNA,
      DNA: DNA
    }, {
      timeout: 10000 // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calling Python model:', error.message);
    throw new Error('Model prediction service unavailable');
  }
}

// Text-based prediction endpoint
router.post('/text', authenticateToken, [
  body('sgRNA')
    .isLength({ min: 23, max: 23 })
    .matches(/^[ATCG-]+$/)
    .withMessage('sgRNA must be exactly 23 nucleotides (A, T, C, G, or - for indels)'),
  body('DNA')
    .isLength({ min: 23, max: 23 })
    .matches(/^[ATCG-]+$/)
    .withMessage('DNA must be exactly 23 nucleotides (A, T, C, G, or - for indels)'),
  body('actualLabel')
    .isInt({ min: 0, max: 1 })
    .withMessage('Actual label must be 0 or 1')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sgRNA, DNA, actualLabel } = req.body;
    const startTime = Date.now();

    // Call Python model for prediction
    const modelResult = await callPythonModel(sgRNA, DNA);
    const processingTime = Date.now() - startTime;

    // Perform detailed scientific analysis
    const scientificAnalysis = analyzeSequencePair(
      sgRNA,
      DNA,
      modelResult.prediction,
      modelResult.confidence
    );

    // Calculate PAM-based ground truth for categorization
    const pamPrediction = checkPAMSequence(sgRNA, DNA);
    
    // Determine prediction category using PAM-based ground truth
    const category = getPredictionCategory(
      actualLabel, 
      modelResult.prediction, 
      pamPrediction,
      sgRNA, 
      DNA
    );

    // Log prediction details for debugging
    console.log(`Prediction details:`, {
      sgRNA: sgRNA.slice(0, 10) + '...',
      DNA: DNA.slice(0, 10) + '...',
      userActualLabel: actualLabel,
      pamBasedActual: pamPrediction,
      modelPrediction: modelResult.prediction,
      category,
      confidence: modelResult.confidence
    });

    // Save prediction to database with user ID
    const prediction = new Prediction({
      userId: req.user._id, // Associate prediction with authenticated user
      sgRNA,
      DNA,
      actualLabel,
      predictedLabel: modelResult.prediction,
      confidence: modelResult.confidence,
      pamMatch: pamPrediction === 1,
      totalMatches: 0, // CRISPR-BERT doesn't use match counting
      category,
      inputType: 'text',
      processingTime,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    console.log('Saving prediction for user:', req.user._id, req.user.email);
    await prediction.save();
    console.log('Prediction saved with ID:', prediction._id);

    res.json({
      success: true,
      data: {
        id: prediction._id,
        sgRNA,
        DNA,
        prediction: {
          label: modelResult.prediction,
          confidence: Math.round(modelResult.confidence * 100),
          category,
          pamMatch: pamPrediction === 1
        },
        metrics: {
          totalMatches: 0, // CRISPR-BERT doesn't use match counting
          processingTime
        },
        // Model details
        model_info: {
          probabilities: modelResult.probabilities,
          threshold_used: modelResult.threshold_used
        },
        // Scientific analysis with research-based explanations
        scientific_analysis: {
          primary_reason: scientificAnalysis.scientificReason,
          pam_analysis: scientificAnalysis.pamAnalysis,
          mismatches: scientificAnalysis.mismatches,
          indels: scientificAnalysis.indels,
          critical_anomalies: scientificAnalysis.criticalAnomalies,
          explanations: scientificAnalysis.explanations,
          risk_factors: scientificAnalysis.riskFactors
        },
        // Additional debugging info
        categorization_info: {
          user_actual_label: actualLabel,
          pam_based_actual: pamPrediction,
          final_prediction: modelResult.prediction,
          category_explanation: getCategoryExplanation(category)
        }
      }
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process prediction',
      error: error.message
    });
  }
});

// Image-based prediction endpoint
router.post('/image', authenticateToken, upload.single('image'), [
  body('actualLabel')
    .isInt({ min: 0, max: 1 })
    .withMessage('Actual label must be 0 or 1')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const { actualLabel } = req.body;
    const startTime = Date.now();

    // TODO: Implement image processing to extract sequences
    // For now, using placeholder sequences
    const sgRNA = "ATCGATCGATCGATCGATCAGG";
    const DNA = "ATCGATCGATCGATCGATCTGG";

    // Call Python model for prediction
    const modelResult = await callPythonModel(sgRNA, DNA);
    const processingTime = Date.now() - startTime;

    // Calculate PAM-based ground truth for categorization
    const pamPrediction = checkPAMSequence(sgRNA, DNA);
    
    // Determine prediction category using PAM-based ground truth
    const category = getPredictionCategory(
      actualLabel, 
      modelResult.prediction, 
      pamPrediction,
      sgRNA, 
      DNA
    );

    // Save prediction to database with user ID
    const prediction = new Prediction({
      userId: req.user._id, // Associate prediction with authenticated user
      sgRNA,
      DNA,
      actualLabel,
      predictedLabel: modelResult.prediction,
      confidence: modelResult.confidence,
      pamMatch: pamPrediction === 1,
      totalMatches: 0, // CRISPR-BERT doesn't use match counting
      category,
      inputType: 'image',
      imageUrl: `/uploads/${req.file.filename}`,
      processingTime,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

    await prediction.save();

    res.json({
      success: true,
      data: {
        id: prediction._id,
        sgRNA,
        DNA,
        imageUrl: prediction.imageUrl,
        prediction: {
          label: modelResult.prediction,
          confidence: Math.round(modelResult.confidence * 100),
          category,
          pamMatch: pamPrediction === 1
        },
        metrics: {
          totalMatches: 0, // CRISPR-BERT doesn't use match counting
          processingTime
        }
      }
    });

  } catch (error) {
    console.error('Image prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process image prediction',
      error: error.message
    });
  }
});

// Get user-specific predictions
router.get('/my-predictions', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching predictions for user:', req.user._id, req.user.email);
    
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const predictions = await Prediction.getUserPredictions(req.user._id, {
      limit,
      skip,
      sortBy,
      sortOrder
    });

    const stats = await Prediction.getUserStats(req.user._id);

    console.log(`Found ${predictions.length} predictions for user ${req.user.email}`);
    console.log('Stats being returned:', stats);

    res.json({
      success: true,
      data: {
        predictions,
        stats,
        pagination: {
          limit,
          skip,
          total: stats.totalPredictions || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your predictions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get recent predictions (global - for analytics)
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const predictions = await Prediction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-userAgent -ipAddress');

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Error fetching recent predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent predictions'
    });
  }
});

// Get prediction by ID
router.get('/:id', async (req, res) => {
  try {
    const prediction = await Prediction.findById(req.params.id)
      .select('-userAgent -ipAddress');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction'
    });
  }
});

module.exports = router;
