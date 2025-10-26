const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Add index for faster user-specific queries
  },
  sgRNA: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[ATCG-]{23}$/.test(v);
      },
      message: 'sgRNA must be exactly 23 nucleotides (A, T, C, G, or - for indels)'
    }
  },
  DNA: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[ATCG-]{23}$/.test(v);
      },
      message: 'DNA must be exactly 23 nucleotides (A, T, C, G, or - for indels)'
    }
  },
  actualLabel: {
    type: Number,
    required: true,
    enum: [0, 1] // 0 = No Edit, 1 = Success
  },
  predictedLabel: {
    type: Number,
    required: true,
    enum: [0, 1]
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  pamMatch: {
    type: Boolean,
    required: true
  },
  totalMatches: {
    type: Number,
    required: true,
    min: 0,
    max: 529 // 23x23 maximum possible matches
  },
  category: {
    type: String,
    required: true,
    enum: [
      'correct_predicted_correct',    // True Positive
      'correct_predicted_wrong',      // False Negative
      'wrong_predicted_correct',      // False Positive
      'wrong_predicted_wrong'         // True Negative
    ]
  },
  inputType: {
    type: String,
    required: true,
    enum: ['text', 'image']
  },
  imageUrl: {
    type: String,
    required: function() {
      return this.inputType === 'image';
    }
  },
  processingTime: {
    type: Number, // milliseconds
    required: true
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

// Indexes for better query performance
predictionSchema.index({ category: 1 });
predictionSchema.index({ createdAt: -1 });
predictionSchema.index({ confidence: -1 });
predictionSchema.index({ pamMatch: 1 });

// Virtual for prediction accuracy
predictionSchema.virtual('isCorrect').get(function() {
  return this.actualLabel === this.predictedLabel;
});

// Static method to get analytics data
predictionSchema.statics.getAnalytics = async function(timeRange = '7d') {
  const startDate = new Date();
  
  switch(timeRange) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgProcessingTime: { $avg: '$processingTime' }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

// Static method to get performance metrics
predictionSchema.statics.getPerformanceMetrics = async function(timeRange = '7d') {
  const analytics = await this.getAnalytics(timeRange);
  
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  analytics.forEach(item => {
    switch(item._id) {
      case 'correct_predicted_correct':
        tp = item.count;
        break;
      case 'wrong_predicted_wrong':
        tn = item.count;
        break;
      case 'wrong_predicted_correct':
        fp = item.count;
        break;
      case 'correct_predicted_wrong':
        fn = item.count;
        break;
    }
  });

  const total = tp + tn + fp + fn;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return {
    accuracy: Math.round(accuracy * 10000) / 100, // percentage with 2 decimal places
    precision: Math.round(precision * 10000) / 100,
    recall: Math.round(recall * 10000) / 100,
    f1Score: Math.round(f1Score * 10000) / 100,
    confusionMatrix: { tp, tn, fp, fn },
    totalPredictions: total
  };
};

// Static method to get user-specific predictions
predictionSchema.statics.getUserPredictions = async function(userId, options = {}) {
  try {
    const { limit = 50, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
    
    // Convert userId to ObjectId if it's a string
    const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    return await this.find({ userId: objectId })
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip)
      .select('-userAgent -ipAddress')
      .populate('userId', 'fullName email')
      .lean();
  } catch (error) {
    console.error('Error in getUserPredictions:', error);
    return []; // Return empty array for new users or on error
  }
};

// Static method to get user prediction statistics
predictionSchema.statics.getUserStats = async function(userId) {
  try {
    // Convert userId to ObjectId if it's a string
    const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const pipeline = [
      { $match: { userId: objectId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ];

    const categoryStats = await this.aggregate(pipeline);
    const totalPredictions = await this.countDocuments({ userId: objectId });

    // Get recent activity (predictions in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = await this.countDocuments({ 
      userId: objectId, 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // Calculate overall average confidence
    const confidenceAggregate = await this.aggregate([
      { $match: { userId: objectId } },
      {
        $group: {
          _id: null,
          averageConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    const averageConfidence = confidenceAggregate.length > 0 ? 
      Math.round(confidenceAggregate[0].averageConfidence * 10000) / 100 : 0;

    let tp = 0, tn = 0, fp = 0, fn = 0;
    
    categoryStats.forEach(item => {
      switch(item._id) {
        case 'correct_predicted_correct': tp = item.count; break;
        case 'wrong_predicted_wrong': tn = item.count; break;
        case 'wrong_predicted_correct': fp = item.count; break;
        case 'correct_predicted_wrong': fn = item.count; break;
      }
    });

    const accuracy = totalPredictions > 0 ? (tp + tn) / totalPredictions : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;

    // Calculate success rate (percentage of predictions that were "success" - predicted as 1)
    const successPredictions = tp + fp; // All predictions labeled as success
    const successRate = totalPredictions > 0 ? (successPredictions / totalPredictions) * 100 : 0;

    return {
      totalPredictions,
      accuracy: Math.round(accuracy * 10000) / 100,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence,
      recentActivity,
      precision: Math.round(precision * 10000) / 100,
      recall: Math.round(recall * 10000) / 100,
      categoryBreakdown: {
        correct_predicted_correct: tp,
        wrong_predicted_wrong: tn,
        wrong_predicted_correct: fp,
        correct_predicted_wrong: fn
      }
    };
  } catch (error) {
    console.error('Error in getUserStats:', error);
    // Return default stats for new users
    return {
      totalPredictions: 0,
      accuracy: 0,
      successRate: 0,
      averageConfidence: 0,
      recentActivity: 0,
      precision: 0,
      recall: 0,
      categoryBreakdown: {
        correct_predicted_correct: 0,
        wrong_predicted_wrong: 0,
        wrong_predicted_correct: 0,
        correct_predicted_wrong: 0
      }
    };
  }
};

module.exports = mongoose.model('Prediction', predictionSchema);
