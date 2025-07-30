// src/controllers/locationController.js
const RecyclingLocation = require('../models/recyclingLocationModel');

// @desc Add a new recycling location
// @route POST /api/locations
const addRecyclingLocation = async (req, res) => {
  try {
    const location = new RecyclingLocation({
      ...req.body,
      addedBy: req.user._id
    });
    await location.save();
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    console.error('Error adding location:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get nearby recycling locations
// @route GET /api/locations/nearby
const getNearbyLocations = async (req, res) => {
  try {
    const { lat, lon, distance } = req.query;
    const locations = await RecyclingLocation.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          $maxDistance: parseInt(distance) || 10000 // Default 10km
        }
      }
    });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error('Error getting nearby locations:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Search locations by criteria
// @route GET /api/locations/search
const searchLocations = async (req, res) => {
  try {
    const { name, city, type } = req.query;
    const query = {
      isActive: true,
      ...(name && { name: new RegExp(name, 'i') }),
      ...(city && { 'location.address.city': new RegExp(city, 'i') }),
      ...(type && { type })
    };
    const locations = await RecyclingLocation.find(query);
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get a specific location by ID
// @route GET /api/locations/:id
const getLocationById = async (req, res) => {
  try {
    const location = await RecyclingLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, error: 'Location not found' });
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Update a location
// @route PUT /api/locations/:id
const updateLocation = async (req, res) => {
  try {
    const location = await RecyclingLocation.findOneAndUpdate({ _id: req.params.id, addedBy: req.user._id }, req.body, { new: true });
    if (!location) return res.status(404).json({ success: false, error: 'Location not found or not authorized' });
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Rate a location
// @route POST /api/locations/:id/rate
const rateLocation = async (req, res) => {
  try {
    const { rating } = req.body;
    const location = await RecyclingLocation.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, error: 'Location not found' });

    const totalReviews = location.ratings.totalReviews + 1;
    const averageRating = ((location.ratings.averageRating * location.ratings.totalReviews) + rating) / totalReviews;

    location.ratings.totalReviews = totalReviews;
    location.ratings.averageRating = averageRating;
    await location.save();

    res.status(200).json({ success: true, data: 'Rating added successfully', averageRating });
  } catch (error) {
    console.error('Error rating location:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  addRecyclingLocation,
  getNearbyLocations,
  searchLocations,
  getLocationById,
  updateLocation,
  rateLocation
};

