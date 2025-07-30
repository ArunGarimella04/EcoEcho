import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  StatusBar,
  LayoutAnimation,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { NavigationContext } from '../context/NavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SideBar from '../../components/SideBar';
import { COLORS } from '../styles/theme';
import { BASE_KEYS, getUserStatistics, getScanHistory, transferAnonymousData, debugStorageData} from '../services/historyService';
import { normalizeWeight } from '../utils/weightConverter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  // Get user data from AuthContext
  const { user, refreshUserData } = useAuth();
  const { isSidebarVisible, setSidebarVisible } = useContext(NavigationContext);
  
  // Add state for local scan stats
  const [localStats, setLocalStats] = useState({
    totalItemsScanned: 0,
    recyclableItemsCount: 0,
    totalCarbonSaved: 0,
    totalWeight: 0
  });
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get safe area insets for handling navigation bar
  const insets = useSafeAreaInsets();
    // Load user stats when screen comes into focus or userId changes
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        // Force layout recalculation
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        StatusBar.setTranslucent(false);
        setTimeout(() => StatusBar.setTranslucent(true), 50);
      }
      
      // Load local stats
      loadLocalStats();
      
      // Debug user data to find any issues
      debugUserData();
      
      return () => {};
    }, [user?._id, user?.stats?.lastUpdated, loadLocalStats, debugUserData])
  );
    useEffect(() => {
    // When user ID changes (login), transfer anonymous data
    if (user?._id) {
      transferAnonymousData().then(() => {
        // Refresh data after transfer
        loadLocalStats();
      });
    }
  }, [user?._id, loadLocalStats]); // Include loadLocalStats in dependency array
  // Debug function to check AsyncStorage keys
  const debugUserData = async () => {
    try {
      console.log('Current User ID:', user?._id || 'No user');
      
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('Available AsyncStorage Keys:', allKeys);
      
      // Get the correct key format for user stats
      const userStatsKey = user?._id ? 
        `${BASE_KEYS.USER_STATS}_${user._id}` : 
        'anonymous_' + BASE_KEYS.USER_STATS;
        
      console.log('Looking for stats key:', userStatsKey);
      
      // Check if stats exist for this user
      const statsExist = allKeys.some(key => 
        key.includes(BASE_KEYS.USER_STATS) && 
        (key.includes(user?._id || '') || key.includes('anonymous'))
      );
      console.log('Any stats exist:', statsExist);      // Check user stats in backend vs local
      if (user?.stats) {
        console.log('Backend Stats (Original):', {
          totalItems: user.stats.totalItems || 0,
          recyclableItems: user.stats.recyclableItems || 0,
          totalCarbonSaved: user.stats.totalCarbonSaved || 0,
          totalWeight: user.stats.totalWeight || 0
        });
        
        // Calculate normalized weight for display (without modifying user object)
        const normalizedWeight = normalizeWeight(
          user.stats.totalWeight || 0,
          user.stats.totalItems || 0
        );
        
        console.log('Backend Stats (After normalization):', {
          originalWeight: user.stats.totalWeight || 0,
          normalizedWeight
        });
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
  };
  
  // Refresh from server when needed - controlled refresh to avoid loops
  const isRefreshingRef = React.useRef(false);
    useEffect(() => {
    const doRefresh = async () => {
      if (isRefreshingRef.current || !user?._id) return;
      
      try {
        isRefreshingRef.current = true;
        console.log('HomeScreen: Refreshing user data from server...');
        await refreshUserData();
        console.log('HomeScreen: User data refreshed successfully');
      } catch (err) {
        console.log('HomeScreen: Refresh error:', err);
      } finally {
        isRefreshingRef.current = false;
      }
    };
      // Only refresh once when the component mounts and user exists
    if (user?._id && !isRefreshingRef.current) {
      doRefresh();
    }
    
    // No auto-refresh timer anymore
    
    return () => {
      // Nothing to clean up
    };
  }, [user?._id, refreshUserData]);
  // Function to load stats from local storage with improved user isolation
  const loadLocalStats = React.useCallback(async () => {
    // Helper function to calculate carbon saved
    const calculateCarbonSaved = (recyclableCount, categories = {}) => {
      // Base calculation: 0.5kg per recyclable item
      let carbonSaved = recyclableCount * 0.5;
      
      // Enhanced calculation if we have category data
      if (categories) {
        // Plastic has higher carbon savings
        if (categories.Plastic) {
          carbonSaved += categories.Plastic * 0.3;
        }
        // Paper has medium carbon savings
        if (categories.Paper) {
          carbonSaved += categories.Paper * 0.2;
        }
      }
      
      return parseFloat(carbonSaved.toFixed(1));
    };
    
    // Helper function to calculate total weight
    const calculateTotalWeight = (itemCount) => {
      // Ensure valid number
      const count = Number(itemCount) || 0;
      
      // Assume average item weighs 0.1kg (100g)
      return parseFloat((count * 0.1).toFixed(1));
    };

    setLoading(true);
    try {
      // Debug storage before loading
      if (__DEV__) {
        await debugStorageData();
      }
      
      // Get user-specific statistics from local storage
      const stats = await getUserStatistics();
      console.log('HomeScreen: Loaded local stats:', stats);
      
      // Get recent scan history
      const history = await getScanHistory(3); // Get 3 most recent scans
      console.log('HomeScreen: Loaded recent history:', history.length);
      
      // Update local stats
      if (stats) {        // Use backend data when available, otherwise fall back to local
        // Always take the highest value to ensure we don't lose data
        const totalItems = Math.max(
          user?.stats?.totalItems || 0, 
          stats.totalItemsScanned || 0
        );
        
        const recyclableItems = Math.max(
          user?.stats?.recyclableItems || 0, 
          stats.recyclableItemsCount || 0
        );
        
        // Calculate total weight or use normalized backend weight
        let backendWeight = user?.stats?.totalWeight || 0;
        
        // Normalize backend weight from grams to kg if needed
        backendWeight = normalizeWeight(backendWeight, totalItems);
        
        const calculatedWeight = calculateTotalWeight(totalItems) || 0;
        
        // Debug weight calculation
        console.log("Weight calculation:", {
          totalItems,
          calculatedWeight,
          rawBackendWeight: user?.stats?.totalWeight || 0,
          normalizedBackendWeight: backendWeight
        });
          const updatedStats = {
          totalItemsScanned: totalItems,
          recyclableItemsCount: recyclableItems,
          totalCarbonSaved: Math.max(
            user?.stats?.totalCarbonSaved || 0,
            calculateCarbonSaved(recyclableItems, stats.scansByCategory) || 0
          ),
          totalWeight: Math.max(
            backendWeight,
            calculatedWeight
          )
        };
        
        setLocalStats(updatedStats);
        
        // Log for debugging
        console.log("HomeScreen stats updated:", {
          localStatsValue: stats.totalItemsScanned || 0,
          backendStatsValue: user?.stats?.totalItems || 0,
          normalizedWeight: backendWeight,
          calculatedWeight,
          finalWeight: updatedStats.totalWeight,
          displayedValue: totalItems
        });      } else {
        // Reset stats if none found for this user
        console.log('No local stats found, using backend stats');
        
        // Normalize backend weight if it exists
        const backendWeight = normalizeWeight(
          user?.stats?.totalWeight || 0,
          user?.stats?.totalItems || 0
        );
        
        setLocalStats({
          totalItemsScanned: user?.stats?.totalItems || 0,
          recyclableItemsCount: user?.stats?.recyclableItems || 0,
          totalCarbonSaved: user?.stats?.totalCarbonSaved || 0,
          totalWeight: backendWeight
        });
      }
      
      // Update recent scans
      setRecentScans(history || []);
    } catch (error) {
      console.error('Error loading local stats:', error);
      Alert.alert('Error Loading Stats', 'Could not load your statistics. Please try again later.');    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Format time ago from timestamp
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const scanTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - scanTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return scanTime.toLocaleDateString();
    }
  };
  
  // Get first name from full name or use default
  const firstName = user?.name ? user.name.split(' ')[0] : 'User';
  
  // Calculate proper bottom padding for content
  const bottomPadding = Platform.OS === 'android' ? 20 : Math.max(20, insets.bottom);
  
  // Manual refresh function
  const handleRefresh = () => {
    loadLocalStats();
    refreshUserData().catch(err => console.log('Refresh error:', err));
  };
  
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Header with hamburger menu */}
        <Header 
          onMenuPress={() => setSidebarVisible(true)} 
          navigation={navigation}
          onRefresh={handleRefresh}
        />
        
        <ScrollView 
          style={styles.main}
          contentContainerStyle={{ 
            paddingBottom: bottomPadding // Padding for bottom content
          }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.welcomeSubtitle}>Ready to make a difference? Scan your waste to track your environmental impact.</Text>
          
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <MaterialCommunityIcons name="camera" size={24} color="#122118" />
            <Text style={styles.scanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
          
          {/* Quick Access Buttons */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Gallery')}
            >
              <MaterialIcons name="photo-library" size={20} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Achievements')}
            >
              <MaterialCommunityIcons name="trophy" size={20} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Achievements</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Impact</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#38e07b" />
              </View>
            ) : (
              <View style={styles.impactGrid}>
                <View style={styles.impactCard}>
                  <Text style={styles.cardLabel}>Items Scanned</Text>
                  <Text style={styles.cardValue}>
                    {localStats.totalItemsScanned}
                  </Text>
                </View>
                <View style={styles.impactCard}>
                  <Text style={styles.cardLabel}>CO₂ Saved</Text>
                  <Text style={styles.cardValue}>
                    {localStats.totalCarbonSaved} kg
                  </Text>
                </View>
                <View style={[styles.impactCard, styles.fullWidthCard]}>
                  <Text style={styles.cardLabel}>Waste Diverted</Text>
                  <Text style={styles.cardValue}>
                    {localStats.totalWeight} kg
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentScans.length > 0 && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('History')}
                  style={styles.seeAllButton}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#38e07b" />
              </View>
            ) : recentScans.length > 0 ? (
              <View style={styles.activityList}>
                {recentScans.map((scan, index) => (
                  <ActivityItem 
                    key={index}
                    title={`Scanned: ${scan.itemName}`} 
                    time={formatTimeAgo(scan.timestamp)} 
                    onPress={() => navigation.navigate('ScanResult', {
                      scanResult: {
                        itemName: scan.itemName,
                        isRecyclable: scan.isRecyclable,
                        ecoScore: scan.ecoScore,
                        confidence: scan.confidence,
                        disposalMethod: scan.disposalMethod || 
                                        (scan.isRecyclable ? 'Recycled' : 'General Waste'),
                        category: scan.category
                      },
                      imageUri: scan.imageUri
                    })}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyActivityContainer}>
                <Text style={styles.emptyActivityText}>
                  No recent activity. Start scanning waste items!
                </Text>
              </View>
            )}
          </View>
          
          {/* Add a spacer at the bottom */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
      
      {/* Sidebar */}
      <SideBar 
        navigation={navigation}
        visible={isSidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </View>
  );
};

// Header component with hamburger menu
const Header = ({ onMenuPress, navigation, onRefresh }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
      <MaterialIcons name="menu" size={28} color={COLORS.textPrimary} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>EcoEcho</Text>
    <View style={styles.headerActions}>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onRefresh}
      >
        <MaterialIcons name="refresh" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <MaterialIcons name="settings" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  </View>
);

// Activity item component
const ActivityItem = ({ title, time, onPress }) => (
  <TouchableOpacity style={styles.activityItem} onPress={onPress}>
    <View style={styles.activityIcon}>
      <MaterialCommunityIcons name="recycle" size={28} color="#38e07b" />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={24} color="#96c5a9" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Keep your existing styles
  container: {
    flex: 1,
    backgroundColor: '#122118',
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(18, 33, 24, 0.8)',
  },
  menuButton: {
    padding: 4,
    borderRadius: 20,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  main: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flex: 1,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  welcomeSubtitle: {
    color: '#96c5a9',
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: '#38e07b',
    borderRadius: 28,
    gap: 12,
  },
  scanButtonText: {
    color: '#122118',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 30,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  impactCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(27, 49, 36, 0.5)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#366348',
    gap: 8,
  },
  fullWidthCard: {
    width: '100%',
  },
  cardLabel: {
    color: '#96c5a9',
    fontSize: 14,
    fontWeight: '500',
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(27, 49, 36, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  activityIcon: {
    backgroundColor: '#264532',
    borderRadius: 8,
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  activityTime: {
    color: '#96c5a9',
    fontSize: 14,
  },
  // New styles
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 49, 36, 0.5)',
    borderRadius: 12,
  },
  emptyActivityContainer: {
    backgroundColor: 'rgba(27, 49, 36, 0.5)',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivityText: {
    color: '#96c5a9',
    fontSize: 14,
    textAlign: 'center',
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(56, 224, 123, 0.2)',
    borderRadius: 16,
  },
  seeAllText: {
    color: '#38e07b',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: 'rgba(27, 49, 36, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#366348',
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;