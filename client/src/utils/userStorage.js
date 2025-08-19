/**
 * User-specific storage utilities for CRISPR prediction results
 */

// Get current user info
export const getCurrentUser = () => {
  const userEmail = localStorage.getItem('userEmail');
  const userName = localStorage.getItem('userName');
  const authMethod = localStorage.getItem('authMethod');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated || !userEmail) {
    return null;
  }
  
  return {
    email: userEmail,
    name: userName || 'User',
    authMethod: authMethod || 'email',
    id: btoa(userEmail).replace(/[^a-zA-Z0-9]/g, '') // Safe user ID from email
  };
};

// Get user-specific storage key
const getUserStorageKey = (key) => {
  const user = getCurrentUser();
  if (!user) return null;
  return `crispr_${user.id}_${key}`;
};

// Save user-specific prediction result
export const savePredictionResult = (result) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const storageKey = getUserStorageKey('predictions');
    const existingResults = getUserPredictions();
    
    const newResult = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name
      },
      ...result
    };
    
    const updatedResults = [newResult, ...existingResults].slice(0, 100); // Keep only last 100 results
    localStorage.setItem(storageKey, JSON.stringify(updatedResults));
    
    return true;
  } catch (error) {
    console.error('Failed to save prediction result:', error);
    return false;
  }
};

// Get user-specific prediction results
export const getUserPredictions = () => {
  const user = getCurrentUser();
  if (!user) return [];
  
  try {
    const storageKey = getUserStorageKey('predictions');
    const results = localStorage.getItem(storageKey);
    return results ? JSON.parse(results) : [];
  } catch (error) {
    console.error('Failed to get user predictions:', error);
    return [];
  }
};

// Get user statistics
export const getUserStats = () => {
  const predictions = getUserPredictions();
  
  if (predictions.length === 0) {
    return {
      totalPredictions: 0,
      successfulPredictions: 0,
      successRate: 0,
      recentActivity: 0,
      averageConfidence: 0
    };
  }
  
  const successful = predictions.filter(p => p.prediction === 1).length;
  const totalConfidence = predictions.reduce((sum, p) => sum + (p.confidence || 0), 0);
  const recentActivity = predictions.filter(p => {
    const predictionDate = new Date(p.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return predictionDate > weekAgo;
  }).length;
  
  return {
    totalPredictions: predictions.length,
    successfulPredictions: successful,
    successRate: ((successful / predictions.length) * 100).toFixed(1),
    recentActivity,
    averageConfidence: ((totalConfidence / predictions.length) * 100).toFixed(1)
  };
};

// Delete a specific prediction
export const deletePrediction = (predictionId) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const storageKey = getUserStorageKey('predictions');
    const existingResults = getUserPredictions();
    const filteredResults = existingResults.filter(result => result.id !== predictionId);
    
    localStorage.setItem(storageKey, JSON.stringify(filteredResults));
    return true;
  } catch (error) {
    console.error('Failed to delete prediction:', error);
    return false;
  }
};

// Clear all user data
export const clearUserData = () => {
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const storageKey = getUserStorageKey('predictions');
    localStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    console.error('Failed to clear user data:', error);
    return false;
  }
};

// Export all user data
export const exportUserData = () => {
  const user = getCurrentUser();
  if (!user) return null;
  
  const predictions = getUserPredictions();
  const stats = getUserStats();
  
  return {
    user,
    stats,
    predictions,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
};
