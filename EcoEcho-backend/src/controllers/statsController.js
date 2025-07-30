// src/controllers/statsController.js
const asyncHandler = require('express-async-handler');
const WasteItem = require('../models/wasteItemModel');
const User = require('../models/userModel');

// @desc    Get trend analytics for waste management over time
// @route   GET /api/stats/trends
// @access  Private
const getTrendAnalytics = asyncHandler(async (req, res) => {
  const { timeframe = '6months', category } = req.query;
  
  // Calculate date range based on timeframe
  let startDate = new Date();
  switch (timeframe) {
    case '1month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 6);
  }

  // Build aggregation pipeline
  const matchStage = {
    userId: req.user._id,
    createdAt: { $gte: startDate }
  };

  if (category) {
    matchStage.category = category;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          category: '$category'
        },
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month'
        },
        categories: {
          $push: {
            category: '$_id.category',
            weight: '$totalWeight',
            items: '$totalItems',
            carbonSaved: '$carbonSaved'
          }
        },
        totalWeight: { $sum: '$totalWeight' },
        totalItems: { $sum: '$totalItems' },
        totalCarbonSaved: { $sum: '$carbonSaved' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ];

  const trends = await WasteItem.aggregate(pipeline);

  // Calculate trends and percentage changes
  const trendData = trends.map((item, index) => {
    let weightChange = 0;
    let itemsChange = 0;
    let carbonChange = 0;

    if (index > 0) {
      const prevData = trends[index - 1];
      weightChange = ((item.totalWeight - prevData.totalWeight) / prevData.totalWeight) * 100;
      itemsChange = ((item.totalItems - prevData.totalItems) / prevData.totalItems) * 100;
      carbonChange = ((item.totalCarbonSaved - prevData.totalCarbonSaved) / prevData.totalCarbonSaved) * 100;
    }

    return {
      period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      totalWeight: item.totalWeight,
      totalItems: item.totalItems,
      totalCarbonSaved: item.totalCarbonSaved,
      weightChange: Number(weightChange.toFixed(2)),
      itemsChange: Number(itemsChange.toFixed(2)),
      carbonChange: Number(carbonChange.toFixed(2)),
      categories: item.categories
    };
  });

  res.json({
    success: true,
    timeframe,
    category: category || 'all',
    trends: trendData,
    summary: {
      totalPeriods: trendData.length,
      overallGrowth: trendData.length > 1 ? {
        weight: trendData[trendData.length - 1].weightChange,
        items: trendData[trendData.length - 1].itemsChange,
        carbon: trendData[trendData.length - 1].carbonChange
      } : null
    }
  });
});

// @desc    Get predictive analytics based on historical data
// @route   GET /api/stats/predictions
// @access  Private
const getPredictiveAnalytics = asyncHandler(async (req, res) => {
  const { months = 3 } = req.query;
  
  // Get last 6 months of data for prediction
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const historicalData = await WasteItem.aggregate([
    {
      $match: {
        userId: req.user._id,
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  if (historicalData.length < 2) {
    return res.json({
      success: false,
      message: 'Insufficient historical data for predictions. Need at least 2 months of data.'
    });
  }

  // Simple linear trend calculation
  const weights = historicalData.map(d => d.totalWeight);
  const items = historicalData.map(d => d.totalItems);
  const carbon = historicalData.map(d => d.carbonSaved);
  
  const calculateTrend = (values) => {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + y * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  const weightTrend = calculateTrend(weights);
  const itemsTrend = calculateTrend(items);
  const carbonTrend = calculateTrend(carbon);

  // Generate predictions
  const predictions = [];
  const currentMonth = new Date();
  
  for (let i = 1; i <= parseInt(months); i++) {
    const futureMonth = new Date(currentMonth);
    futureMonth.setMonth(futureMonth.getMonth() + i);
    
    const x = historicalData.length + i;
    
    predictions.push({
      period: `${futureMonth.getFullYear()}-${String(futureMonth.getMonth() + 1).padStart(2, '0')}`,
      predictedWeight: Math.max(0, weightTrend.slope * x + weightTrend.intercept),
      predictedItems: Math.max(0, Math.round(itemsTrend.slope * x + itemsTrend.intercept)),
      predictedCarbonSaved: Math.max(0, carbonTrend.slope * x + carbonTrend.intercept),
      confidence: Math.max(0.3, 1 - (i * 0.15)) // Decreasing confidence over time
    });
  }

  res.json({
    success: true,
    historicalPeriods: historicalData.length,
    predictions,
    trends: {
      weight: weightTrend.slope > 0 ? 'increasing' : 'decreasing',
      items: itemsTrend.slope > 0 ? 'increasing' : 'decreasing',
      carbon: carbonTrend.slope > 0 ? 'increasing' : 'decreasing'
    }
  });
});

// @desc    Get detailed environmental impact report
// @route   GET /api/stats/environmental-impact
// @access  Private
const getEnvironmentalImpact = asyncHandler(async (req, res) => {
  const { timeframe = '1year' } = req.query;
  
  let startDate = new Date();
  switch (timeframe) {
    case '1month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  const impactData = await WasteItem.aggregate([
    {
      $match: {
        userId: req.user._id,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$category',
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' },
        averageWeight: { $avg: '$weight' }
      }
    }
  ]);

  // Calculate additional environmental metrics
  const totalCarbonSaved = impactData.reduce((sum, item) => sum + item.carbonSaved, 0);
  const totalWeight = impactData.reduce((sum, item) => sum + item.totalWeight, 0);
  const totalItems = impactData.reduce((sum, item) => sum + item.totalItems, 0);

  // Environmental impact equivalents
  const equivalents = {
    treesPlanted: Math.round(totalCarbonSaved / 21.77), // 1 tree absorbs ~21.77kg CO2/year
    carMilesAvoided: Math.round(totalCarbonSaved / 0.404), // 1 mile = ~0.404kg CO2
    energySaved: Math.round(totalCarbonSaved * 2.3), // kWh equivalent
    landfillDiverted: totalWeight, // kg diverted from landfill
    waterSaved: Math.round(totalWeight * 1.2) // estimated water savings in liters
  };

  // Category breakdown with impact scores
  const categoryImpact = impactData.map(category => ({
    ...category,
    impactScore: Math.round((category.carbonSaved / totalCarbonSaved) * 100),
    efficiency: Math.round(category.carbonSaved / category.totalWeight * 100) / 100
  }));

  res.json({
    success: true,
    timeframe,
    summary: {
      totalCarbonSaved: Math.round(totalCarbonSaved * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalItems,
      averageCarbonPerItem: Math.round((totalCarbonSaved / totalItems) * 100) / 100
    },
    equivalents,
    categoryBreakdown: categoryImpact,
    achievements: {
      level: totalCarbonSaved > 1000 ? 'Expert' : totalCarbonSaved > 500 ? 'Advanced' : totalCarbonSaved > 100 ? 'Intermediate' : 'Beginner',
      milestones: {
        first100kg: totalCarbonSaved >= 100,
        first500kg: totalCarbonSaved >= 500,
        first1000kg: totalCarbonSaved >= 1000,
        consistentUser: totalItems >= 50
      }
    }
  });
});

// @desc    Get comparison analytics with other users
// @route   GET /api/stats/comparison
// @access  Private
const getComparisonAnalytics = asyncHandler(async (req, res) => {
  const { timeframe = '1month' } = req.query;
  
  let startDate = new Date();
  switch (timeframe) {
    case '1month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
  }

  // Get current user's stats
  const userStats = await WasteItem.aggregate([
    {
      $match: {
        userId: req.user._id,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' }
      }
    }
  ]);

  // Get community averages (excluding current user)
  const communityStats = await WasteItem.aggregate([
    {
      $match: {
        userId: { $ne: req.user._id },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' }
      }
    },
    {
      $group: {
        _id: null,
        avgWeight: { $avg: '$totalWeight' },
        avgItems: { $avg: '$totalItems' },
        avgCarbon: { $avg: '$carbonSaved' },
        totalUsers: { $sum: 1 }
      }
    }
  ]);

  if (userStats.length === 0) {
    return res.json({
      success: false,
      message: 'No data found for the specified timeframe.'
    });
  }

  const user = userStats[0];
  const community = communityStats[0] || { avgWeight: 0, avgItems: 0, avgCarbon: 0, totalUsers: 0 };

  // Calculate percentile ranking
  const getUserPercentile = async (metric, userValue) => {
    const allUsers = await WasteItem.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          value: metric === 'weight' ? { $sum: '$weight' } : 
                 metric === 'items' ? { $sum: 1 } : 
                 { $sum: '$carbonFootprintReduced' }
        }
      },
      { $sort: { value: 1 } }
    ]);

    const userIndex = allUsers.findIndex(u => u.value >= userValue);
    return userIndex >= 0 ? Math.round((userIndex / allUsers.length) * 100) : 0;
  };

  const [weightPercentile, itemsPercentile, carbonPercentile] = await Promise.all([
    getUserPercentile('weight', user.totalWeight),
    getUserPercentile('items', user.totalItems),
    getUserPercentile('carbon', user.carbonSaved)
  ]);

  res.json({
    success: true,
    timeframe,
    userStats: {
      totalWeight: Math.round(user.totalWeight * 100) / 100,
      totalItems: user.totalItems,
      carbonSaved: Math.round(user.carbonSaved * 100) / 100
    },
    communityStats: {
      avgWeight: Math.round(community.avgWeight * 100) / 100,
      avgItems: Math.round(community.avgItems),
      avgCarbon: Math.round(community.avgCarbon * 100) / 100,
      totalUsers: community.totalUsers
    },
    comparisons: {
      weightComparison: user.totalWeight > community.avgWeight ? 'above' : 'below',
      itemsComparison: user.totalItems > community.avgItems ? 'above' : 'below',
      carbonComparison: user.carbonSaved > community.avgCarbon ? 'above' : 'below',
      weightDifference: Math.round((user.totalWeight - community.avgWeight) * 100) / 100,
      itemsDifference: user.totalItems - Math.round(community.avgItems),
      carbonDifference: Math.round((user.carbonSaved - community.avgCarbon) * 100) / 100
    },
    rankings: {
      weightPercentile,
      itemsPercentile,
      carbonPercentile,
      overallRank: Math.round((weightPercentile + itemsPercentile + carbonPercentile) / 3)
    }
  });
});

// @desc    Get goal progress and recommendations
// @route   GET /api/stats/goals
// @access  Private
const getGoalProgress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Get current month's progress
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  
  const monthlyProgress = await WasteItem.aggregate([
    {
      $match: {
        userId: req.user._id,
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: '$category',
        totalWeight: { $sum: '$weight' },
        totalItems: { $sum: 1 },
        carbonSaved: { $sum: '$carbonFootprintReduced' }
      }
    }
  ]);

  const totalMonthlyWeight = monthlyProgress.reduce((sum, item) => sum + item.totalWeight, 0);
  const totalMonthlyItems = monthlyProgress.reduce((sum, item) => sum + item.totalItems, 0);
  const totalMonthlyCarbonSaved = monthlyProgress.reduce((sum, item) => sum + item.carbonSaved, 0);

  // Default goals if not set in user profile
  const defaultGoals = {
    monthlyWeightGoal: 50, // kg
    monthlyItemsGoal: 30,
    monthlyCarbonGoal: 25 // kg CO2
  };

  const goals = {
    monthlyWeightGoal: user.goals?.monthlyWeightGoal || defaultGoals.monthlyWeightGoal,
    monthlyItemsGoal: user.goals?.monthlyItemsGoal || defaultGoals.monthlyItemsGoal,
    monthlyCarbonGoal: user.goals?.monthlyCarbonGoal || defaultGoals.monthlyCarbonGoal
  };

  // Calculate progress percentages
  const progress = {
    weight: Math.round((totalMonthlyWeight / goals.monthlyWeightGoal) * 100),
    items: Math.round((totalMonthlyItems / goals.monthlyItemsGoal) * 100),
    carbon: Math.round((totalMonthlyCarbonSaved / goals.monthlyCarbonGoal) * 100)
  };

  // Generate recommendations
  const recommendations = [];
  
  if (progress.weight < 50) {
    recommendations.push({
      type: 'weight',
      message: 'Try to recycle more heavy items like glass and metal containers to boost your weight goal.',
      priority: 'medium'
    });
  }
  
  if (progress.items < 50) {
    recommendations.push({
      type: 'items',
      message: 'Scan more items daily. Even small items count towards your goal!',
      priority: 'high'
    });
  }
  
  if (progress.carbon < 50) {
    recommendations.push({
      type: 'carbon',
      message: 'Focus on recycling plastic and paper items which have higher carbon savings.',
      priority: 'medium'
    });
  }

  // Calculate days remaining in month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();

  res.json({
    success: true,
    currentMonth: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
    goals,
    currentProgress: {
      weight: Math.round(totalMonthlyWeight * 100) / 100,
      items: totalMonthlyItems,
      carbon: Math.round(totalMonthlyCarbonSaved * 100) / 100
    },
    progressPercentages: progress,
    daysRemaining,
    categoryBreakdown: monthlyProgress,
    recommendations,
    achievements: {
      weightGoalMet: progress.weight >= 100,
      itemsGoalMet: progress.items >= 100,
      carbonGoalMet: progress.carbon >= 100,
      allGoalsMet: progress.weight >= 100 && progress.items >= 100 && progress.carbon >= 100
    }
  });
});

module.exports = {
  getTrendAnalytics,
  getPredictiveAnalytics,
  getEnvironmentalImpact,
  getComparisonAnalytics,
  getGoalProgress
};
