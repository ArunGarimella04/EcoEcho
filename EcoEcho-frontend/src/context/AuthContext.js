// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, statsService } from '../services/api';
import { getUserStatistics, clearUserData, transferAnonymousData } from '../services/historyService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    // Check if user is logged in on app start
    const checkLoginStatus = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.log('Error checking login status:', error);
        setError('Failed to restore authentication state');
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  //login and register functions
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authService.login(email, password);
      
      // Check for successful login
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        
        // Transfer any anonymous data to the user account
        await transferAnonymousData();
        
        // Update user with local stats
        await updateUserWithLocalStats();
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authService.register(name, email, password);
      
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        setRegistrationSuccess(true);
        
        // Transfer any anonymous data to the new user account
        await transferAnonymousData();
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      
      // Clear user-specific data
      await clearUserData();
      
      setUser(null);
      setToken(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      // This assumes you have an updateProfile endpoint in your authService
      const response = await authService.updateProfile(userData);
      
      // Update user in state
      setUser({...user, ...response.data});
      
      // Update user in storage
      await AsyncStorage.setItem('user', JSON.stringify({...user, ...response.data}));
      
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    } finally {
      setLoading(false);    }
  };  
    const refreshUserData = async () => {
    // Prevent too frequent refreshes
    const now = Date.now();
    const lastRefreshTime = await AsyncStorage.getItem('lastRefreshTime');
    const timeSinceLastRefresh = lastRefreshTime ? now - parseInt(lastRefreshTime) : Infinity;
    
    // Limit refreshes to once per 10 seconds
    if (timeSinceLastRefresh < 10000) {
      console.log(`Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`);
      return user; // Return current user without refreshing
    }
    
    setLoading(true);
    try {
      console.log('AuthContext: Refreshing user data from server...');
      await AsyncStorage.setItem('lastRefreshTime', now.toString());
      
      // Make sure we have a token before attempting to get profile
      const currentToken = await AsyncStorage.getItem('token');
      if (!currentToken) {
        console.log('No auth token available, skipping refresh');
        return user;
      }
      
      const response = await authService.getProfile();
      
      // Added safety check for response
      if (!response || !response.data) {
        console.error('Invalid response from getProfile:', response);
        throw new Error('Empty response from server');
      }
      
      // Handle different response structures - backend might return {success: true, user: {...}}
      const userData = response.data.user || response.data;
      
      if (!userData || typeof userData !== 'object') {
        console.error('Invalid user data received:', response.data);
        throw new Error('Invalid user data format');
      }
      
      console.log('Refreshed user data:', userData);
      
      // Update user in state
      setUser(userData);
      
      // Update user in storage - only save if userData is valid
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      
      // If unauthorized (token expired), logout
      if (error.response?.status === 401) {
        await logout();
      }
      
      // Always rethrow the error for proper handling by callers
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserWithLocalStats = async () => {
    try {
      // Only proceed if we have a user
      if (!user || !user._id) {
        console.log('No authenticated user, skipping stats update');
        return;
      }
      
      // Get local stats (from device storage)
      const localStats = await getUserStatistics();
      console.log('Local stats retrieved:', localStats);
      
      // Get backend stats (from user object)
      const backendStats = user.stats || {};
      console.log('Backend stats:', backendStats);
      
      if (localStats) {        // Create an updated stats object with maximum values between local and backend
        const updatedStats = {
          totalItems: Math.max(backendStats.totalItems || 0, localStats.totalItemsScanned || 0),
          totalCarbonSaved: Math.max(
            backendStats.totalCarbonSaved || 0, 
            (localStats.recyclableItemsCount || 0) * 0.5
          ),
          totalWeight: Math.max(
            backendStats.totalWeight || 0, 
            (localStats.totalItemsScanned || 0) * 0.1
          ),
          recyclableItems: Math.max(
            backendStats.recyclableItems || 0,
            localStats.recyclableItemsCount || 0
          ),
          lastUpdated: new Date().toISOString()
        };
        
        // Convert weight if needed (backend might have weight in grams)
        if (updatedStats.totalWeight > 10 && updatedStats.totalItems <= 10) {
          console.log('Weight seems to be in grams, converting to kg');
          updatedStats.totalWeight = parseFloat((updatedStats.totalWeight / 1000).toFixed(1));
        }
        
        console.log('Updated stats to be saved:', updatedStats);
        
        // Create updated user object with new stats
        const updatedUser = {
          ...user,
          stats: updatedStats
        };
        
        // Update user state to trigger UI updates
        setUser(updatedUser);
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update server if we have a token
        if (token) {
          try {
            const response = await statsService.updateUserStats(updatedStats);
            console.log('Server stats updated successfully:', response);
          } catch (serverError) {
            console.error('Server stats update failed:', serverError);
            // Continue even if server update fails - will try again later
          }
        } else {
          console.log('No auth token, skipping server stats update');
        }
      }
    } catch (error) {
      console.error('Error in updateUserWithLocalStats:', error);
    }
  };

  // Clear registration success flag
  const clearRegistrationSuccess = () => {
    setRegistrationSuccess(false);
  };

  // Value object to be provided to consumers
  const contextValue = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    registrationSuccess,
    clearRegistrationSuccess,
    login,
    register,
    logout,
    updateProfile,
    refreshUserData,
    updateUserWithLocalStats
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};