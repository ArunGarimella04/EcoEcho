import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys with app prefix to avoid collision with other apps
export const BASE_KEYS = {
  SCAN_HISTORY: 'eco_echo_scan_history',
  USER_STATS: 'eco_echo_user_stats',
};

// Create user-specific storage keys
const getUserSpecificKey = async (baseKey) => {
  try {
    const userString = await AsyncStorage.getItem('user');
    console.log(`Getting user-specific key for base: ${baseKey}`);
    
    if (!userString) {
      console.log(`No user found, using anonymous storage for ${baseKey}`);
      return `anonymous_${baseKey}`; // Use anonymous prefix when no user
    }
    
    const user = JSON.parse(userString);
    console.log(`Found user from storage: ${user?._id || 'no ID'}`);
    
    if (!user?._id) {
      console.log(`User has no ID, using anonymous storage for ${baseKey}`);
      return `anonymous_${baseKey}`;
    }
    
    const userSpecificKey = `${baseKey}_${user._id}`;
    console.log(`Created user-specific key: ${userSpecificKey}`);
    return userSpecificKey; // Add user ID to make key unique per user
  } catch (error) {
    console.error('Error creating user-specific storage key:', error);
    return `anonymous_${baseKey}`; // Fallback to anonymous key
  }
};

/**
 * Save scan to history
 */
export const saveScanToHistory = async (scanResult, imageUri) => {
  try {
    // Use user-specific key
    const historyKey = await getUserSpecificKey(BASE_KEYS.SCAN_HISTORY);
    const statsKey = await getUserSpecificKey(BASE_KEYS.USER_STATS);
    
    console.log(`Saving scan to ${historyKey}`);
    
    // Get existing history
    const historyString = await AsyncStorage.getItem(historyKey);
    const history = historyString ? JSON.parse(historyString) : [];
    
    // Create new scan entry
    const scan = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      itemName: scanResult.itemName,
      category: scanResult.category || 'Other',
      isRecyclable: scanResult.isRecyclable || false,
      ecoScore: scanResult.ecoScore || 0,
      confidence: scanResult.confidence || 0,
      disposalMethod: scanResult.disposalMethod || 'Unknown',
      imageUri: imageUri || null,
    };
    
    // Add to history
    history.unshift(scan); // Add to beginning of array
    
    // Limit history to 100 items
    const limitedHistory = history.slice(0, 100);
    
    // Save updated history
    await AsyncStorage.setItem(historyKey, JSON.stringify(limitedHistory));
    
    // Update stats
    await updateStatistics(statsKey, scan);
    
    return scan;
  } catch (error) {
    console.error('Error saving scan to history:', error);
    throw error;
  }
};

/**
 * Get scan history
 */
export const getScanHistory = async (limit = 10) => {
  try {
    const historyKey = await getUserSpecificKey(BASE_KEYS.SCAN_HISTORY);
    console.log(`Getting scan history from ${historyKey}`);
    
    const historyString = await AsyncStorage.getItem(historyKey);
    
    if (!historyString) {
      console.log('No history found');
      return [];
    }
    
    const history = JSON.parse(historyString);
    return history.slice(0, limit); // Return limited number of items
  } catch (error) {
    console.error('Error getting scan history:', error);
    return [];
  }
};

/**
 * Update user statistics based on scan
 */
const updateStatistics = async (statsKey, scan) => {
  try {
    console.log(`Updating stats at ${statsKey}`);
    
    // Get existing stats
    const statsString = await AsyncStorage.getItem(statsKey);
    const stats = statsString ? JSON.parse(statsString) : {
      totalItemsScanned: 0,
      recyclableItemsCount: 0,
      totalEcoScore: 0,
      averageEcoScore: 0,
      scansByCategory: {},
      scansByMaterial: {},
      lastUpdated: null
    };
    
    // Update stats
    stats.totalItemsScanned += 1;
    
    if (scan.isRecyclable) {
      stats.recyclableItemsCount += 1;
    }
    
    stats.totalEcoScore += scan.ecoScore || 0;
    stats.averageEcoScore = stats.totalEcoScore / stats.totalItemsScanned;
    
    // Update category stats
    const category = scan.category || 'Other';
    stats.scansByCategory[category] = (stats.scansByCategory[category] || 0) + 1;
    
    // Update timestamp
    stats.lastUpdated = new Date().toISOString();
    
    // Save updated stats
    await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
    
    console.log('Stats updated successfully:', {
      totalItems: stats.totalItemsScanned,
      recyclable: stats.recyclableItemsCount
    });
    
    return stats;
  } catch (error) {
    console.error('Error updating statistics:', error);
    throw error;
  }
};

/**
 * Get user statistics
 */
export const getUserStatistics = async () => {
  try {
    const statsKey = await getUserSpecificKey(BASE_KEYS.USER_STATS);
    console.log(`Getting user stats from ${statsKey}`);
    
    // Debug: Show current user info
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    console.log(`Current user when getting stats: ${user?._id || 'anonymous'}`);
    
    const statsString = await AsyncStorage.getItem(statsKey);
    
    if (!statsString) {
      console.log('No stats found, returning default values');
      return {
        totalItemsScanned: 0,
        recyclableItemsCount: 0,
        totalEcoScore: 0,
        averageEcoScore: 0,
        scansByCategory: {},
        scansByMaterial: {},
        lastUpdated: null
      };
    }
    
    const stats = JSON.parse(statsString);
    return stats;
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      totalItemsScanned: 0,
      recyclableItemsCount: 0,
      totalEcoScore: 0,
      averageEcoScore: 0,
      scansByCategory: {},
      scansByMaterial: {},
      lastUpdated: null
    };
  }
};

/**
 * Clear user stats and history (important for logout)
 */
export const clearUserData = async () => {
  try {
    const historyKey = await getUserSpecificKey(BASE_KEYS.SCAN_HISTORY);
    const statsKey = await getUserSpecificKey(BASE_KEYS.USER_STATS);
    
    console.log(`Clearing user data from ${historyKey} and ${statsKey}`);
    
    await AsyncStorage.removeItem(historyKey);
    await AsyncStorage.removeItem(statsKey);
    
    console.log('User scan data cleared successfully');
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

/**
 * Debug function to list all stored keys and values
 */
export const debugStorageData = async () => {
  try {
    console.log('--- DEBUG STORAGE START ---');
    
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('All keys:', allKeys);
    
    // Get current user
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    console.log('Current user ID:', user?._id || 'No user');
    
    // Check for anonymous data
    const anonStatsKey = `anonymous_${BASE_KEYS.USER_STATS}`;
    const anonHistoryKey = `anonymous_${BASE_KEYS.SCAN_HISTORY}`;
    
    const hasAnonStats = await AsyncStorage.getItem(anonStatsKey);
    const hasAnonHistory = await AsyncStorage.getItem(anonHistoryKey);
    
    console.log('Has anonymous stats:', !!hasAnonStats);
    console.log('Has anonymous history:', !!hasAnonHistory);
    
    // For user with ID, check their storage
    if (user?._id) {
      const userStatsKey = `${BASE_KEYS.USER_STATS}_${user._id}`;
      const userHistoryKey = `${BASE_KEYS.SCAN_HISTORY}_${user._id}`;
      
      const hasUserStats = await AsyncStorage.getItem(userStatsKey);
      const hasUserHistory = await AsyncStorage.getItem(userHistoryKey);
      
      console.log('Has user-specific stats:', !!hasUserStats);
      console.log('Has user-specific history:', !!hasUserHistory);
      
      if (hasUserStats) {
        const stats = JSON.parse(hasUserStats);
        console.log('User stats summary:', {
          totalItems: stats.totalItemsScanned,
          recyclable: stats.recyclableItemsCount,
          lastUpdated: stats.lastUpdated
        });
      }
    }
    
    console.log('--- DEBUG STORAGE END ---');
  } catch (error) {
    console.error('Storage debug error:', error);
  }
};

/**
 * Transfer anonymous data to user account when logging in
 */
export const transferAnonymousData = async () => {
  try {
    // Get current user
    const userString = await AsyncStorage.getItem('user');
    if (!userString) {
      console.log('No user to transfer data to');
      return;
    }
    
    const user = JSON.parse(userString);
    if (!user?._id) {
      console.log('User has no ID, cannot transfer data');
      return;
    }
    
    // Check for anonymous data
    const anonStatsKey = `anonymous_${BASE_KEYS.USER_STATS}`;
    const anonHistoryKey = `anonymous_${BASE_KEYS.SCAN_HISTORY}`;
    
    const anonStatsString = await AsyncStorage.getItem(anonStatsKey);
    const anonHistoryString = await AsyncStorage.getItem(anonHistoryKey);
    
    if (!anonStatsString && !anonHistoryString) {
      console.log('No anonymous data to transfer');
      return;
    }
    
    console.log('Anonymous data found, transferring to user account');
    
    // Get user-specific keys
    const userStatsKey = `${BASE_KEYS.USER_STATS}_${user._id}`;
    const userHistoryKey = `${BASE_KEYS.SCAN_HISTORY}_${user._id}`;
    
    // Transfer stats
    if (anonStatsString) {
      const anonStats = JSON.parse(anonStatsString);
      const userStatsString = await AsyncStorage.getItem(userStatsKey);
      const userStats = userStatsString ? JSON.parse(userStatsString) : {
        totalItemsScanned: 0,
        recyclableItemsCount: 0,
        totalEcoScore: 0,
        averageEcoScore: 0,
        scansByCategory: {},
        scansByMaterial: {},
        lastUpdated: null
      };
      
      // Merge stats (take the higher values)
      const mergedStats = {
        ...userStats,
        totalItemsScanned: Math.max(userStats.totalItemsScanned || 0, anonStats.totalItemsScanned || 0),
        recyclableItemsCount: Math.max(userStats.recyclableItemsCount || 0, anonStats.recyclableItemsCount || 0),
        totalEcoScore: Math.max(userStats.totalEcoScore || 0, anonStats.totalEcoScore || 0),
        scansByCategory: { ...anonStats.scansByCategory, ...userStats.scansByCategory },
        scansByMaterial: { ...anonStats.scansByMaterial, ...userStats.scansByMaterial },
        lastUpdated: new Date().toISOString()
      };
      
      // Calculate new average
      if (mergedStats.totalItemsScanned > 0) {
        mergedStats.averageEcoScore = mergedStats.totalEcoScore / mergedStats.totalItemsScanned;
      }
      
      // Save merged stats
      await AsyncStorage.setItem(userStatsKey, JSON.stringify(mergedStats));
    }
    
    // Transfer history
    if (anonHistoryString) {
      const anonHistory = JSON.parse(anonHistoryString);
      const userHistoryString = await AsyncStorage.getItem(userHistoryKey);
      const userHistory = userHistoryString ? JSON.parse(userHistoryString) : [];
      
      // Combine histories and remove duplicates (based on timestamp)
      const seenIds = new Set();
      const combinedHistory = [...userHistory];
      
      anonHistory.forEach(scan => {
        if (!seenIds.has(scan.id)) {
          combinedHistory.push(scan);
          seenIds.add(scan.id);
        }
      });
      
      // Sort by timestamp (newest first)
      combinedHistory.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Limit to 100 items
      const limitedHistory = combinedHistory.slice(0, 100);
      
      // Save merged history
      await AsyncStorage.setItem(userHistoryKey, JSON.stringify(limitedHistory));
    }
    
    // Clear anonymous data
    await AsyncStorage.removeItem(anonStatsKey);
    await AsyncStorage.removeItem(anonHistoryKey);
    
    console.log('Anonymous data transferred and cleared');
  } catch (error) {
    console.error('Error transferring anonymous data:', error);
  }
};

/**
 * Utility function to estimate CO2 saved based on recyclable items
 * @param {number} recyclableCount - Number of recyclable items
 * @returns {number} - Estimated CO2 saved in kg
 */
export const estimateCO2Saved = (recyclableCount) => {
  // Base calculation: 0.5kg per recyclable item
  const carbonSaved = recyclableCount * 0.5;
  return parseFloat(carbonSaved.toFixed(1));
};

/**
 * Utility function to estimate total weight based on item count
 * @param {number} itemCount - Total number of items
 * @returns {number} - Estimated weight in kg
 */
export const estimateTotalWeight = (itemCount) => {
  // Ensure we have a valid number
  const count = Number(itemCount) || 0;
  
  // Assume average item weighs 0.1kg (100g)
  // This gives 0.1kg for 1 item, 1kg for 10 items, etc.
  return parseFloat((count * 0.1).toFixed(1));
};