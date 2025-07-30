import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getUserStatistics, estimateCO2Saved } from '../services/historyService';

// Get window dimensions for the chart
const windowWidth = Dimensions.get('window').width;

// Helper functions to ensure ProfileScreen doesn't fail if functions are missing
const localCalculateCO2Reduced = (recyclableItems) => {
  return parseFloat((recyclableItems * 0.5).toFixed(1));
};

const ProfileScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [localStats, setLocalStats] = useState({
    totalItemsScanned: 0,
    recyclableItemsCount: 0,
    averageEcoScore: 0,
    scansByCategory: {},
    scansByMaterial: {}
  });  
  const [progressData, setProgressData] = useState({
    ecoScore: 0,
    scoreChange: '+0%',
    itemsScanned: 0,
    recyclablePercentage: 0,
    co2Reduced: 0
  });

  // Get insets for Android navigation bar
  const insets = useSafeAreaInsets();
  // Calculate bottom padding for Android navigation
  const bottomPadding = Platform.OS === 'android' ? 100 : Math.max(20, insets.bottom + 20);
  
  // Generate weekly data for chart - wrapped in useCallback
  const generateWeeklyData = useCallback((stats) => {
    // This is a simple placeholder - in a real app you would get actual weekly data
    const weeklyData = [750, 790, 820, 850];
    
    // If we have an ecoScore, use it as the last data point
    if (stats && stats.averageEcoScore) {
      const scaledScore = Math.round(stats.averageEcoScore * 10); // Scale 0-100 to 0-1000
      weeklyData[3] = scaledScore;
    }
    
    return weeklyData;
  }, []);
  
  // Calculate score change - wrapped in useCallback
  const calculateScoreChange = useCallback((stats) => {
    // In a real app, you would compare current score to previous period
    return stats && stats.totalItemsScanned > 5 ? '+15%' : '+0%';
  }, []);
  
  // Define loadUserStats function with useCallback to avoid infinite renders
  const loadUserStats = React.useCallback(async () => {
    setLoading(true);
    try {
      // Check if we have a user object
      if (user === undefined) {
        console.log('ProfileScreen: User is undefined, deferring stats load');
        setLoading(false);
        return;
      }
      
      console.log('ProfileScreen: Loading stats for user:', user?._id || 'anonymous');
      
      // Get local stats
      const stats = await getUserStatistics();
      console.log('ProfileScreen: Local stats loaded:', stats);
      
      if (stats) {
        setLocalStats(stats);
        
        // Use the maximum values between local stats and server stats
        const totalItems = Math.max(stats.totalItemsScanned || 0, user?.stats?.totalItems || 0);
        const recyclableItems = Math.max(stats.recyclableItemsCount || 0, user?.stats?.recyclableItems || 0);
        
        // Calculate recyclable percentage
        const recyclablePercentage = totalItems > 0 
          ? Math.round((recyclableItems / totalItems) * 100) 
          : 0;
        
        // Calculate CO2 reduced (prefer user.stats or calculate from local)
        const co2Reduced = Math.max(
          user?.stats?.totalCarbonSaved || 0,
          typeof estimateCO2Saved === 'function' 
            ? estimateCO2Saved(recyclableItems) 
            : localCalculateCO2Reduced(recyclableItems)
        );
        
        // Generate weekly data for chart
        const weeklyData = generateWeeklyData(stats);
        
        const updatedProgressData = {
          ecoScore: Math.round(stats.averageEcoScore) || 0,
          scoreChange: calculateScoreChange(stats),
          itemsScanned: totalItems,
          recyclablePercentage,
          co2Reduced,
          weeklyData
        };
        
        console.log('ProfileScreen: Updated progress data:', updatedProgressData);
        setProgressData(updatedProgressData);
      } else {
        console.log('ProfileScreen: No local stats found, using defaults');
        // Set default values if no stats are found
        setProgressData({
          ecoScore: 0,
          scoreChange: '+0%',
          itemsScanned: user?.stats?.totalItems || 0,
          recyclablePercentage: 0,
          co2Reduced: user?.stats?.totalCarbonSaved || 0,
          weeklyData: generateWeeklyData(null)
        });
      }    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user, generateWeeklyData, calculateScoreChange]);

  // EcoScore chart data
  const ecoScoreData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        data: progressData.weeklyData || [750, 790, 820, 850],
        color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
        strokeWidth: 3
      }
    ],
  };  // Load stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // First load local stats which doesn't require network
      loadUserStats();
      
      // Then try to refresh user data from server if available
      if (user?._id && refreshUserData) {
        try {
          refreshUserData()
            .then(userData => {
              console.log('ProfileScreen: User data refreshed successfully:', userData?._id);
              // Reload local stats after user data is refreshed to ensure we have the latest
              loadUserStats();
            })
            .catch(err => {
              console.error('Error refreshing user data in ProfileScreen:', err);
              // Continue with local stats even if server refresh fails
            });
        } catch (err) {
          console.error('Exception in ProfileScreen when calling refreshUserData:', err);
        }
      }
      
      return () => {};
    }, [loadUserStats, refreshUserData, user?._id])
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialIcons name="settings" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={true}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: user?.profilePicture || 'https://randomuser.me/api/portraits/women/44.jpg' }} 
            style={styles.profileImage} 
          />
          <Text style={styles.profileName}>{user?.name || 'Sophia Green'}</Text>
          <Text style={styles.profileUsername}>@{user?.username || 'sophiagreen'}</Text>
          
          <View style={styles.ecoScoreBadge}>
            <MaterialIcons name="star" size={18} color="#000000" style={styles.badgeIcon} />
            <Text style={styles.ecoScoreText}>EcoScore: {progressData.ecoScore}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{progressData.itemsScanned}</Text>
            <Text style={styles.statLabel}>Items Scanned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{progressData.recyclablePercentage}%</Text>
            <Text style={styles.statLabel}>Recyclable</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{progressData.co2Reduced}kg</Text>
            <Text style={styles.statLabel}>CO₂ Reduced</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>EcoScore Over Time</Text>
              <View style={styles.scoreChange}>
                <Text style={styles.periodText}>Last 30 Days</Text>
                <Text style={styles.changeText}>{progressData.scoreChange}</Text>
              </View>
            </View>
            <Text style={styles.currentScore}>{progressData.ecoScore}</Text>
            
            <LineChart
              data={ecoScoreData}
              width={windowWidth - 64} // Card padding considered
              height={160}
              chartConfig={{
                backgroundColor: COLORS.secondary,
                backgroundGradientFrom: COLORS.secondary,
                backgroundGradientTo: COLORS.secondary,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(150, 197, 169, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: COLORS.primary,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  strokeWidth: 1,
                  stroke: 'rgba(150, 197, 169, 0.2)',
                },
              }}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={false}
              withHorizontalLabels={false}
              withVerticalLabels={false}
              withShadow={false}
            />
            
            <View style={styles.chartLabels}>
              <Text style={styles.chartLabel}>Week 1</Text>
              <Text style={styles.chartLabel}>Week 2</Text>
              <Text style={styles.chartLabel}>Week 3</Text>
              <Text style={styles.chartLabel}>Week 4</Text>
            </View>
          </View>
        </View>

        {/* Waste Breakdown Section - replacing Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Waste Breakdown</Text>
          <View style={styles.breakdownContainer}>
            {Object.keys(localStats.scansByCategory || {}).length > 0 ? (
              Object.entries(localStats.scansByCategory).map(([category, count], index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryIcon}>
                    <MaterialIcons 
                      name={getCategoryIcon(category)} 
                      size={24} 
                      color={COLORS.primary} 
                    />
                  </View>
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryName}>{formatCategory(category)}</Text>
                    <View style={styles.percentageBar}>
                      <View 
                        style={[
                          styles.percentageFill, 
                          { 
                            width: `${(count / localStats.totalItemsScanned) * 100}%`,
                            backgroundColor: getCategoryColor(category)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>
                No waste items scanned yet. Start scanning to see your waste breakdown!
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper function to get category icon
const getCategoryIcon = (category) => {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('plastic')) return 'local-drink';
  if (lowerCategory.includes('paper')) return 'description';
  if (lowerCategory.includes('glass')) return 'wine-bar';
  if (lowerCategory.includes('metal')) return 'account-balance';
  if (lowerCategory.includes('organic')) return 'compost';
  if (lowerCategory.includes('electronic')) return 'devices';
  return 'category';
};

// Helper function to get category color
const getCategoryColor = (category) => {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('plastic')) return '#2196F3';
  if (lowerCategory.includes('paper')) return '#FF9800';
  if (lowerCategory.includes('glass')) return '#9C27B0';
  if (lowerCategory.includes('metal')) return '#607D8B';
  if (lowerCategory.includes('organic')) return '#4CAF50';
  if (lowerCategory.includes('electronic')) return '#F44336';
  return '#38e07b';
};

// Format category name
const formatCategory = (category) => {
  if (!category) return 'Unknown';
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const styles = StyleSheet.create({
  // Keep your existing styles and add these:
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    backgroundColor: COLORS.background,
    zIndex: 10,
    marginTop: Platform.OS === 'android' ? 25 : 0, // Adjust for Android status bar
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileUsername: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 12,
  },
  ecoScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  badgeIcon: {
    marginRight: 4,
  },
  ecoScoreText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  scoreChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginRight: 8,
  },
  changeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentScore: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  chartLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // New styles for Waste Breakdown
  breakdownContainer: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
    marginRight: 8,
  },
  categoryName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  percentageBar: {
    height: 6,
    backgroundColor: `${COLORS.textSecondary}30`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryCount: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'right',
  },
  noDataText: {
    color: COLORS.textSecondary,    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  }
});

export default ProfileScreen;