import axios from 'axios';
import { authStorage } from './authStorage';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});


// Add auth token to requests
api.interceptors.request.use((config) => {
  const user = authStorage.getCurrentUser();
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('currentUser');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// User predictions API
export const predictionAPI = {
  // Get user's predictions from database
  getUserPredictions: async (options = {}) => {
    try {
      const { limit = 50, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const response = await api.get('/predictions/my-predictions', {
        params: { limit, skip, sortBy, sortOrder }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      throw error;
    }
  },

  // Make a text prediction
  makePrediction: async (predictionData) => {
    try {
      const response = await api.post('/predictions/text', predictionData);
      return response.data;
    } catch (error) {
      console.error('Error making prediction:', error);
      throw error;
    }
  },

  // Make an image prediction
  makeImagePrediction: async (formData) => {
    try {
      const response = await api.post('/predictions/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error making image prediction:', error);
      throw error;
    }
  },

  // Get prediction by ID
  getPredictionById: async (id) => {
    try {
      const response = await api.get(`/predictions/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching prediction:', error);
      throw error;
    }
  }
};

// User auth API
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  signup: async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }
};

export default api;
