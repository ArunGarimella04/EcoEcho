import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { statsService } from '../services/api';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#1e3d2b',
  backgroundGradientFrom: '#1e3d2b',
  backgroundGradientTo: '#2d5a3d',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#38e07b',
  },
};

const AnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const data = await statsService.getAnalytics();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38e07b" />
      </View>
    );
  }

  const renderTrendChart = () => {
    if (!analyticsData?.trends?.daily || analyticsData.trends.daily.length === 0) {
      return <Text style={styles.noDataText}>No trend data available</Text>;
    }

    const data = {
      labels: analyticsData.trends.daily.slice(-7).map(item => 
        new Date(item.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: analyticsData.trends.daily.slice(-7).map(item => item.count || 0),
        color: (opacity = 1) => `rgba(56, 224, 123, ${opacity})`,
        strokeWidth: 3,
      }]
    };

    return (
      <LineChart
        data={data}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    );
  };

  const renderWasteTypeChart = () => {
    if (!analyticsData?.wasteBreakdown || analyticsData.wasteBreakdown.length === 0) {
      return <Text style={styles.noDataText}>No waste type data available</Text>;
    }

    const colors = ['#38e07b', '#4ecdc4', '#45b7d1', '#f39c12', '#e74c3c', '#9b59b6'];
    const pieData = analyticsData.wasteBreakdown.map((item, index) => ({
      name: item._id || 'Unknown',
      population: item.count || 0,
      color: colors[index % colors.length],
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    }));

    return (
      <PieChart
        data={pieData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        style={styles.chart}
      />
    );
  };

  const renderEnvironmentalImpact = () => {
    if (!analyticsData?.environmentalImpact) {
      return <Text style={styles.noDataText}>No environmental impact data available</Text>;
    }

    const impact = analyticsData.environmentalImpact;
    return (
      <View style={styles.impactContainer}>
        <View style={styles.impactItem}>
          <Text style={styles.impactValue}>{impact.totalItemsScanned || 0}</Text>
          <Text style={styles.impactLabel}>Items Scanned</Text>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.impactValue}>{impact.co2Saved?.toFixed(1) || '0.0'} kg</Text>
          <Text style={styles.impactLabel}>CO₂ Saved</Text>
        </View>
        <View style={styles.impactItem}>
          <Text style={styles.impactValue}>{impact.wasteReduced?.toFixed(1) || '0.0'} kg</Text>
          <Text style={styles.impactLabel}>Waste Reduced</Text>
        </View>
      </View>
    );
  };

  const renderCommunityComparison = () => {
    if (!analyticsData?.communityStats) {
      return <Text style={styles.noDataText}>No community data available</Text>;
    }

    const { userRank, totalUsers, percentile } = analyticsData.communityStats;
    return (
      <View style={styles.communityContainer}>
        <Text style={styles.communityTitle}>Community Ranking</Text>
        <View style={styles.rankContainer}>
          <Text style={styles.rankValue}>#{userRank || 'N/A'}</Text>
          <Text style={styles.rankLabel}>out of {totalUsers || 0} users</Text>
        </View>
        <Text style={styles.percentileText}>
          You're in the top {percentile?.toFixed(0) || 0}% of eco-warriors!
        </Text>
      </View>
    );
  };

  const renderGoalProgress = () => {
    if (!analyticsData?.goalProgress) {
      return <Text style={styles.noDataText}>No goal progress data available</Text>;
    }

    const goals = analyticsData.goalProgress;
    return (
      <View style={styles.goalsContainer}>
        {goals.map((goal, index) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          return (
            <View key={index} style={styles.goalItem}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.goalText}>
                {goal.current}/{goal.target} ({progress.toFixed(0)}%)
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Analytics Dashboard</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7-Day Scanning Trend</Text>
        {renderTrendChart()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environmental Impact</Text>
        {renderEnvironmentalImpact()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waste Type Breakdown</Text>
        {renderWasteTypeChart()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Standing</Text>
        {renderCommunityComparison()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal Progress</Text>
        {renderGoalProgress()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#122118',
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#122118',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 20,
  },
  section: {
    backgroundColor: '#1e3d2b',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#38e07b',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  impactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  impactItem: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#38e07b',
  },
  impactLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
  },
  communityContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  rankContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  rankValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#38e07b',
  },
  rankLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  percentileText: {
    fontSize: 14,
    color: '#4ecdc4',
    fontWeight: '500',
  },
  goalsContainer: {
    paddingVertical: 10,
  },
  goalItem: {
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2d5a3d',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38e07b',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});

export default AnalyticsScreen;

