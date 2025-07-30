// src/routes/locationRoutes.js
const express = require('express');
const {
  addRecyclingLocation,
  getNearbyLocations,
  searchLocations,
  getLocationById,
  updateLocation,
  rateLocation
} = require('../controllers/locationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Add a new recycling location
router.post('/', protect, addRecyclingLocation);

// Get nearby recycling locations
router.get('/nearby', getNearbyLocations);

// Search locations by various criteria
router.get('/search', searchLocations);

// Get a specific location by ID
router.get('/:id', getLocationById);

// Update a location (only by creator or admin)
router.put('/:id', protect, updateLocation);

// Rate a location
router.post('/:id/rate', protect, rateLocation);

module.exports = router;
