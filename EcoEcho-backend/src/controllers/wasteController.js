// src/controllers/wasteController.js
const WasteItem = require('../models/wasteItemModel');
const User = require('../models/userModel');

// Get all waste items for the authenticated user
exports.getUserWasteItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const wasteItems = await WasteItem.find({ user: userId }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: wasteItems.length,
      data: wasteItems
    });
  } catch (error) {
    console.error('Error fetching waste items:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Add a new waste item
exports.addWasteItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const wasteData = { ...req.body, user: userId };
    
    // Handle base64 image if provided
    if (req.body.itemImage) {
      // Generate unique filename
      const fileName = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
      const uploadPath = `public/uploads/${fileName}`;
      
      // Convert base64 to file and save
      try {
        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        const path = require('path');
        const dir = path.join(__dirname, '../../public/uploads');
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Save the image
        const imageData = req.body.itemImage;
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(path.join(__dirname, '../../', uploadPath), buffer);
        
        // Replace base64 with file path
        wasteData.itemImage = `/uploads/${fileName}`;
      } catch (imageError) {
        console.error('Error saving image:', imageError);
        // Continue without image if there's an error
        delete wasteData.itemImage;
      }
    }
    
    // Create waste item with user reference
    const wasteItem = await WasteItem.create(wasteData);
    
    // Update user stats
    await updateUserStats(userId);
    
    res.status(201).json({
      success: true,
      data: wasteItem
    });
  } catch (error) {
    console.error('Error adding waste item:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a single waste item by ID
exports.getWasteItem = async (req, res) => {
  try {
    const wasteItem = await WasteItem.findById(req.params.id);
    
    if (!wasteItem) {
      return res.status(404).json({
        success: false,
        error: 'Waste item not found'
      });
    }
    
    // Check if the waste item belongs to the user
    if (wasteItem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this waste item'
      });
    }
    
    res.status(200).json({
      success: true,
      data: wasteItem
    });
  } catch (error) {
    console.error('Error fetching waste item:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Delete a waste item
exports.deleteWasteItem = async (req, res) => {
  try {
    const wasteItem = await WasteItem.findById(req.params.id);
    
    if (!wasteItem) {
      return res.status(404).json({
        success: false,
        error: 'Waste item not found'
      });
    }
    
    // Check if the waste item belongs to the user
    if (wasteItem.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this waste item'
      });
    }
    
    await wasteItem.remove();
    
    // Update user stats
    await updateUserStats(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting waste item:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all waste items for the user
    const wasteItems = await WasteItem.find({ user: userId });
    
    // Calculate statistics
    const totalItems = wasteItems.length;
    const totalWeight = wasteItems.reduce((sum, item) => sum + (item.weightInGrams || 0), 0);
    const totalCarbonSaved = wasteItems.reduce((sum, item) => sum + (item.carbonFootprint || 0), 0);
    const recyclableItems = wasteItems.filter(item => item.isRecyclable).length;
    
    // Category breakdown
    const categoryBreakdown = {};
    wasteItems.forEach(item => {
      const category = item.category || 'Other';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });
    
    // Monthly progress (last 6 months)
    const monthlyProgress = {};
    const now = new Date();
    
    // Initialize with last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      monthlyProgress[monthYear] = 0;
    }
    
    // Fill with actual data
    wasteItems.forEach(item => {
      const date = new Date(item.scanDate || item.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (monthlyProgress[monthYear] !== undefined) {
        monthlyProgress[monthYear]++;
      }
    });
    
    // Create stats object
    const stats = {
      totalItems,
      totalWeight,
      totalCarbonSaved,
      recyclableItems,
      categoryBreakdown,
      monthlyProgress: Object.entries(monthlyProgress).map(([month, count]) => ({ month, count }))
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Helper function to update user stats when a waste item is added or deleted
async function updateUserStats(userId) {
  try {
    const wasteItems = await WasteItem.find({ user: userId });
    
    // Calculate stats
    const totalItems = wasteItems.length;
    const totalWeight = wasteItems.reduce((total, item) => total + (item.weightInGrams || 0), 0);
    const totalCarbonSaved = wasteItems.reduce((total, item) => total + (item.carbonFootprint || 0), 0);
    const recyclableItems = wasteItems.filter(item => item.isRecyclable).length;
    
    // Update user stats
    await User.findByIdAndUpdate(userId, {
      stats: {
        totalItems,
        totalWeight,
        totalCarbonSaved,
        recyclableItems,
        lastUpdated: Date.now()
      }
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

// Analyze waste item with AI (simulation for now)
exports.analyzeWasteItem = async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }
    
    // Save image for reference/debugging (optional)
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Create directory if it doesn't exist
      const dir = path.join(__dirname, '../../public/analysis');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save image with timestamp
      const fileName = `analysis_${Date.now()}.jpg`;
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(path.join(dir, fileName), buffer);
    } catch (saveError) {
      console.log('Error saving analysis image (non-critical):', saveError);
      // Continue even if saving fails - this is just for reference
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Sample analysis results
    const analysisResults = {
      itemName: 'Plastic Bottle',
      category: 'Plastic',
      type: 'PET',
      weightInGrams: Math.floor(Math.random() * 30) + 10, // Random weight 10-40g
      isRecyclable: true,
      carbonFootprint: Math.floor(Math.random() * 100) / 100, // Random carbon footprint
      disposalMethod: 'Recycled',
      confidence: 0.92,
    };
    
    res.status(200).json({
      success: true,
      data: analysisResults
    });
  } catch (error) {
    console.error('Error analyzing waste item:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Add this function to your wasteController

// Update user stats
exports.updateUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { totalItems, totalCarbonSaved, totalWeight, recyclableItems } = req.body;
    
    // Find user and update stats
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Initialize stats object if it doesn't exist
    if (!user.stats) {
      user.stats = {};
    }
    
    // Update stats with new values, using Math.max to ensure values only increase
    user.stats.totalItems = Math.max(user.stats.totalItems || 0, totalItems || 0);
    user.stats.totalCarbonSaved = Math.max(user.stats.totalCarbonSaved || 0, totalCarbonSaved || 0);
    user.stats.totalWeight = Math.max(user.stats.totalWeight || 0, totalWeight || 0);
    user.stats.recyclableItems = Math.max(user.stats.recyclableItems || 0, recyclableItems || 0);
    user.stats.lastUpdated = new Date();
    
    // Save updated user
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'User stats updated successfully',
      stats: user.stats
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user stats', 
      error: error.message 
    });
  }
};