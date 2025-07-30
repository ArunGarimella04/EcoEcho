// src/routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUserStats, updateUserStats } = require('../controllers/wasteController');
const {
  getTrendAnalytics,
  getPredictiveAnalytics,
  getEnvironmentalImpact,
  getComparisonAnalytics,
  getGoalProgress
} = require('../controllers/statsController');

// Get user statistics
router.get('/user', protect, getUserStats);

// Fix: Use protect middleware and import updateUserStats function
router.put('/user', protect, updateUserStats);

// Advanced analytics endpoints
router.get('/trends', protect, getTrendAnalytics);
router.get('/predictions', protect, getPredictiveAnalytics);
router.get('/environmental-impact', protect, getEnvironmentalImpact);
router.get('/comparison', protect, getComparisonAnalytics);
router.get('/goals', protect, getGoalProgress);

module.exports = router;
