import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { wasteService, statsService } from '../services/api';
import { COLORS } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  getUserStatistics, 
  getScanHistory, 
  debugStorageData
} from '../services/historyService';
import { normalizeWeight } from '../utils/weightConverter';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Window dimensions for responsive charts
const windowWidth = Dimensions.get('window').width;  // Local fallback utility functions in case the imported ones aren't available
  const localEstimateTotalWeight = (itemCount) => {
    // Assume average item weighs 100g (0.1kg)
    return parseFloat((itemCount * 0.1).toFixed(1));
  };

  const localEstimateCO2Saved = (recyclableCount) => {
    // Base calculation: 0.5kg per recyclable item
    return parseFloat((recyclableCount * 0.5).toFixed(1));
  };

const DashboardScreen = ({ navigation }) => {
  // Get insets for Android navigation bar
  const insets = useSafeAreaInsets();
  // Inside your component, add useAuth hook
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    totalItems: 0,
    totalKg: 0,
    co2Saved: 0,
    treesEquivalent: 0
  });
  const [wasteItems, setWasteItems] = useState([]);
  const [localScanHistory, setLocalScanHistory] = useState([]);
  const [localStats, setLocalStats] = useState({
    totalItemsScanned: 0,
    recyclableItemsCount: 0,
    averageEcoScore: 0,
    scansByCategory: {},
    scansByMaterial: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'week', 'month', 'year'
  // Load data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [fetchData])
  );
  
  // Define fetchData as a memoized callback
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Debug storage when having issues
      if (__DEV__) {
        await debugStorageData();
      }
      
      console.log('Dashboard: Current user:', user?._id || 'anonymous');
      
      // Fetch local scan history and stats (from ML model scans)
      const localStats = await getUserStatistics();
      console.log('Dashboard: Loaded local stats:', localStats);
      
      const recentScans = await getScanHistory(10);
      console.log('Dashboard: Loaded recent scans:', recentScans.length);
      
      // Update local stats state
      setLocalStats(localStats || {
        totalItemsScanned: 0,
        recyclableItemsCount: 0,
        averageEcoScore: 0,
        scansByCategory: {},
        scansByMaterial: {}
      });
      
      // Update scan history state
      setLocalScanHistory(recentScans || []);
      
      // Try to fetch remote stats if available
      let remoteStats = null;
      try {
        // Only attempt to fetch from backend if user is logged in
        if (user?._id) {
          // Fetch user stats from backend
          const statsResponse = await statsService.getUserStats();
          console.log('Dashboard: Remote stats response:', statsResponse.data);
          
          // Backend data could be in different formats
          remoteStats = statsResponse.data?.stats || statsResponse.data?.data || null;
        } else {
          console.log('Dashboard: User not logged in, skipping remote stats fetch');
        }
      } catch (remoteError) {
        console.log('Dashboard: Remote data fetch failed:', remoteError);
        remoteStats = null;
      }      // Always merge stats from all available sources
      // Priority: Remote API > User object > Local AsyncStorage
      const mergedStats = {
        totalItems: Math.max(
          remoteStats?.totalItems || 0, 
          user?.stats?.totalItems || 0,
          localStats?.totalItemsScanned || 0
        ),
        
        // Normalize weight values before comparing
        totalKg: Math.max(
          normalizeWeight(remoteStats?.totalWeight || 0, remoteStats?.totalItems || 0),
          normalizeWeight(user?.stats?.totalWeight || 0, user?.stats?.totalItems || 0),
          localEstimateTotalWeight(localStats?.totalItemsScanned || 0)
        ),
        
        co2Saved: Math.max(
          remoteStats?.totalCarbonSaved || 0,
          user?.stats?.totalCarbonSaved || 0,
          localEstimateCO2Saved(localStats?.recyclableItemsCount || 0)
        )
      };
      
      // Debug weight calculations
      console.log('Dashboard: Weight calculations:', {
        remoteRaw: remoteStats?.totalWeight || 0,
        remoteNormalized: normalizeWeight(remoteStats?.totalWeight || 0, remoteStats?.totalItems || 0),
        userRaw: user?.stats?.totalWeight || 0,
        userNormalized: normalizeWeight(user?.stats?.totalWeight || 0, user?.stats?.totalItems || 0),
        localEstimate: localEstimateTotalWeight(localStats?.totalItemsScanned || 0),
        final: mergedStats.totalKg
      });
      
      // Calculate trees equivalent
      mergedStats.treesEquivalent = calculateTreesEquivalent(mergedStats.co2Saved);
      
      console.log('Dashboard: Final merged stats:', mergedStats);
      
      // Update stats state with merged values
      setStats(mergedStats);
      
      // Try to fetch waste items from server if user is logged in
      try {
        if (user?._id) {
          const wasteResponse = await wasteService.getWasteItems();
          setWasteItems(wasteResponse.data?.data || []);
        }
      } catch (wasteError) {
        console.log('Dashboard: Waste items fetch failed:', wasteError);
        // Keep existing waste items if fetch fails
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);
  // Calculate trees equivalent (approx 20kg CO2 per tree per year)
  const calculateTreesEquivalent = (co2Kg) => {
    if (!co2Kg || isNaN(co2Kg)) return '0.0';
    return (parseFloat(co2Kg) / 20).toFixed(1);
  };

  // Generate chart data based on waste items from local scan history
  const generateChartData = () => {
    if (localScanHistory.length === 0) {
      // Return default data if no history
      const chartLabels = selectedPeriod === 'week' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : selectedPeriod === 'month'
        ? ['W1', 'W2', 'W3', 'W4']
        : ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
      
      const chartData = selectedPeriod === 'week'
        ? [0, 0, 0, 0, 0, 0, 0]
        : selectedPeriod === 'month'
        ? [0, 0, 0, 0]
        : [0, 0, 0, 0, 0, 0];
      
      return {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
            strokeWidth: 2
          }
        ],
      };
    }
    
    // Process actual history data
    const now = new Date();
    let chartLabels = [];
    let dataPoints = [];
    
    if (selectedPeriod === 'week') {
      // Last 7 days
      chartLabels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
      
      // Initialize data points with zeros
      dataPoints = Array(7).fill(0);
      
      // Fill in data from history
      localScanHistory.forEach(item => {
        const scanDate = new Date(item.timestamp);
        const dayDiff = Math.floor((now - scanDate) / (1000 * 60 * 60 * 24));
        if (dayDiff < 7) {
          dataPoints[6 - dayDiff] += 1;
        }
      });
    } else if (selectedPeriod === 'month') {
      // Last 4 weeks
      chartLabels = ['W1', 'W2', 'W3', 'W4'];
      dataPoints = Array(4).fill(0);
      
      localScanHistory.forEach(item => {
        const scanDate = new Date(item.timestamp);
        const dayDiff = Math.floor((now - scanDate) / (1000 * 60 * 60 * 24));
        if (dayDiff < 28) {
          const weekIndex = Math.floor(dayDiff / 7);
          if (weekIndex < 4) {
            dataPoints[3 - weekIndex] += 1;
          }
        }
      });
    } else {
      // Last 6 months
      chartLabels = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (5 - i));
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
      
      dataPoints = Array(6).fill(0);
      
      localScanHistory.forEach(item => {
        const scanDate = new Date(item.timestamp);
        const monthDiff = (now.getMonth() - scanDate.getMonth()) + 
                          (now.getFullYear() - scanDate.getFullYear()) * 12;
        if (monthDiff < 6) {
          dataPoints[5 - monthDiff] += 1;
        }
      });
    }
    
    return {
      labels: chartLabels,
      datasets: [
        {
          data: dataPoints,
          color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
          strokeWidth: 2
        }
      ],
    };
  };

  // Generate waste distribution data for pie chart from local scan history
  const generateWasteDistribution = () => {
    if (!localStats.scansByCategory || Object.keys(localStats.scansByCategory).length === 0) {
      // Return default data if no categories
      return [
        {
          name: 'No Data',
          population: 100,
          color: '#c4efd9',
          legendFontColor: '#96c5a9',
          legendFontSize: 12
        }
      ];
    }
    
    // Generate pie chart data from scansByCategory
    const categories = Object.keys(localStats.scansByCategory);
    const totalScans = categories.reduce((sum, cat) => sum + localStats.scansByCategory[cat], 0);
    
    // Colors for different categories
    const colors = ['#38e07b', '#6ed89e', '#a3e5c0', '#c4efd9', '#e0f7ec'];
    
    return categories.map((category, index) => {
      const count = localStats.scansByCategory[category];
      const percentage = Math.round((count / totalScans) * 100);
      
      return {
        name: category === 'unknown' ? 'Other' : category,
        population: percentage || 1, // Ensure at least 1% to be visible
        color: colors[index % colors.length],
        legendFontColor: '#96c5a9',
        legendFontSize: 12
      };
    });
  };

  // Format chart data
  const chartData = generateChartData();
  const wasteDistribution = generateWasteDistribution();

  // Handle refresh when pulling down the scroll view
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate bottom padding for Android navigation bar
  const bottomInsetPadding = Math.max(20, insets.bottom + 70);

  // Get material icon based on category
  const getMaterialIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'plastic': return 'local-drink';
      case 'paper': return 'receipt';
      case 'glass': return 'wine-bar';
      case 'metal': return 'account-balance';
      case 'cardboard': return 'inventory-2';
      case 'compostable': return 'compost';
      case 'recyclable': return 'recycling';
      default: return 'shopping-bag';
    }
  };

  // Display loading indicator
  if (loading && !refreshing) {
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
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomInsetPadding }  // Dynamic padding based on insets
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <MaterialIcons name="delete-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statsNumber}>
                {Math.max(stats.totalItems, localStats.totalItemsScanned || 0)}
              </Text>
              <Text style={styles.statsLabel}>Items Scanned</Text>
            </View>
            
            <View style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <MaterialIcons name="scale" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statsNumber}>
                {stats.totalKg.toFixed(1)} kg
              </Text>
              <Text style={styles.statsLabel}>Waste Processed</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <MaterialIcons name="recycling" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statsNumber}>
                {Math.max(localStats.recyclableItemsCount || 0, Math.floor(stats.totalItems * 0.7))}
              </Text>
              <Text style={styles.statsLabel}>Recyclable Items</Text>
            </View>
            
            <View style={styles.statsCard}>
              <View style={styles.statsIconContainer}>
                <MaterialIcons name="eco" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statsNumber}>
                {localStats.averageEcoScore ? localStats.averageEcoScore.toFixed(0) : '75'}
              </Text>
              <Text style={styles.statsLabel}>Avg. EcoScore</Text>
            </View>
          </View>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodContainer}>
          <Text style={styles.sectionTitle}>Scan Activity</Text>
          <View style={styles.periodButtons}>
            <TouchableOpacity 
              style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]} 
              onPress={() => setSelectedPeriod('week')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]} 
              onPress={() => setSelectedPeriod('month')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]} 
              onPress={() => setSelectedPeriod('year')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'year' && styles.periodButtonTextActive]}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Line Chart */}
        <View style={styles.chartContainer}>
          <LineChart
            data={chartData}
            width={windowWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.secondary,
              backgroundGradientFrom: COLORS.secondary,
              backgroundGradientTo: COLORS.secondary,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(150, 197, 169, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: COLORS.primary,
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Waste Distribution */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Waste Distribution</Text>
          <PieChart
            data={wasteDistribution}
            width={windowWidth - 32}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            }}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            absolute
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          
          {localScanHistory.length > 0 ? (
            localScanHistory.slice(0, 5).map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.activityItem}
                onPress={() => navigation.navigate('ScanResult', {
                  scanResult: {
                    itemName: item.itemName,
                    isRecyclable: item.isRecyclable,
                    ecoScore: item.ecoScore,
                    confidence: item.confidence,
                    disposalMethod: item.category === 'compostable' ? 'Composted' : 
                                    item.isRecyclable ? 'Recycled' : 'General Waste',
                    category: item.category
                  },
                  imageUri: item.imageUri
                })}
              >
                <View style={styles.activityIcon}>
                  <MaterialIcons 
                    name={getMaterialIcon(item.category)} 
                    size={20} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{item.itemName}</Text>
                  <Text style={styles.activityDetail}>
                    {item.isRecyclable ? 'Recyclable' : 'Non-Recyclable'} • EcoScore: {item.ecoScore || 'N/A'}
                  </Text>
                </View>
                <Text style={styles.activityDate}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          ) : wasteItems.length > 0 ? (
            // Fallback to backend data if available
            wasteItems.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <MaterialIcons 
                    name={getMaterialIcon(item.category)} 
                    size={20} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{item.itemName}</Text>
                  <Text style={styles.activityDetail}>{item.category} • {item.weightInGrams}g</Text>
                </View>
                <Text style={styles.activityDate}>
                  {new Date(item.scanDate).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No items scanned yet. Start by scanning some waste items!
            </Text>
          )}
          
          {localScanHistory.length > 5 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={styles.viewAllText}>View All Scans</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Call to action */}
        <TouchableOpacity 
          style={styles.scanCTA}
          onPress={() => navigation.navigate('Scan')}
        >
          <MaterialIcons name="camera-alt" size={24} color="#000" />
          <Text style={styles.scanCTAText}>Scan New Item</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
    zIndex: 10, // Ensure header stays above scrollview
    marginTop: Platform.OS === 'android' ? 30 :0, // Reset margin for header on Android
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // This will be overridden by dynamic padding
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  statsIconContainer: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  statsNumber: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  periodContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: COLORS.background,
  },
  chartContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    elevation: 2, // Add subtle shadow on Android
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityIcon: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 8,
    padding: 8,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  activityDetail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  activityDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  scanCTA: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  scanCTAText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DashboardScreen;