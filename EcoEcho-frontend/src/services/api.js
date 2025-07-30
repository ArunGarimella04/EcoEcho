// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL - change to your actual backend URL
// Use your local IP address instead of localhost for device testing
const API_URL = 'http://192.168.0.100:5000/api'; // Use 10.0.2.2 for Android emulator or your actual IP for physical device

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Intercept requests to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication service
export const authService = {  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data?.error || error.message);
      throw error;
    }
  },  register: async (name, email, password) => {
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Register error:', error.response?.data?.error || error.message);
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const userString = await AsyncStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
  },  getProfile: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      
      // Validate that we have a proper response
      if (!response || !response.data) {
        console.error('Empty response from getProfile');
        throw new Error('Invalid response from server');
      }
      
      // Check if the response has the expected structure
      // Backend might return either { user: {...} } or the user object directly
      const userData = response.data.user || response.data;
      
      if (!userData || typeof userData !== 'object') {
        console.error('Unexpected response structure:', response.data);
        throw new Error('Unexpected response structure from server');
      }
      
      // Ensure we return a consistent format to match what refreshUserData expects
      return { data: response.data.user ? response.data : { user: userData } };
    } catch (error) {
      console.error('Get profile error:', error.response?.data?.error || error.message);
      throw error;
    }
  }
};

// Waste items service
export const wasteService = {
  getWasteItems: async () => {
    try {
      const response = await apiClient.get('/waste');
      return response.data;
    } catch (error) {
      console.error('Get waste items error:', error.response?.data?.error || error.message);
      throw error;
    }
  },

  addWasteItem: async (wasteItem) => {
    try {
      // Convert to JSON - don't use form data unless you need file uploads
      const response = await apiClient.post('/waste', wasteItem);
      return response.data;
    } catch (error) {
      console.error('Add waste item error:', error.response?.data?.error || error.message);
      throw error;
    }
  },
  
  // Fix getWasteItem path
  getWasteItem: async (id) => {
    try {
      const response = await apiClient.get(`/waste/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get waste item error:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  
  analyzeWasteItem: async (imageBase64) => {
    try {
      const response = await apiClient.post('/waste/analyze', {
        imageData: imageBase64
      });
      return response.data.data;
    } catch (error) {
      console.error('Analyze waste item error:', error.response?.data?.error || error.message);
      throw error;
    }
  },
};

// Stats service
export const statsService = {
  getUserStats: async () => {
    try {
      const response = await apiClient.get('/stats/user');
      return response.data;
    } catch (error) {
      console.error('Get user stats error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  // Add this new function to update user stats on the server
  updateUserStats: async (statsData) => {
    try {
      const response = await apiClient.put('/stats/user', statsData);
      return response.data;
    } catch (error) {
      console.error('Update user stats error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  // Advanced Analytics Endpoints for Phase 2
  getTrendAnalysis: async (timeframe = '30d', category = null) => {
    try {
      const params = { timeframe };
      if (category) params.category = category;
      
      const response = await apiClient.get('/stats/trends', { params });
      return response.data;
    } catch (error) {
      console.error('Get trend analysis error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  getPredictiveAnalytics: async () => {
    try {
      const response = await apiClient.get('/stats/predictions');
      return response.data;
    } catch (error) {
      console.error('Get predictive analytics error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  getEnvironmentalImpact: async () => {
    try {
      const response = await apiClient.get('/stats/environmental-impact');
      return response.data;
    } catch (error) {
      console.error('Get environmental impact error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  getCommunityComparison: async () => {
    try {
      const response = await apiClient.get('/stats/community-comparison');
      return response.data;
    } catch (error) {
      console.error('Get community comparison error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  getGoalProgress: async () => {
    try {
      const response = await apiClient.get('/stats/goal-progress');
      return response.data;
    } catch (error) {
      console.error('Get goal progress error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  setUserGoals: async (goals) => {
    try {
      const response = await apiClient.post('/stats/goals', goals);
      return response.data;
    } catch (error) {
      console.error('Set user goals error:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  getDetailedStats: async (timeframe = '30d') => {
    try {
      const response = await apiClient.get('/stats/detailed', { 
        params: { timeframe } 
      });
      return response.data;
    } catch (error) {
      console.error('Get detailed stats error:', error.response?.data?.message || error.message);
      throw error;
    }
  }
};

// Utility to test API connection
export const testConnection = async () => {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/ping`);
    const data = await response.json();
    console.log('API connection successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('API connection failed:', error);
    return { success: false, error };
  }
};

export default apiClient;