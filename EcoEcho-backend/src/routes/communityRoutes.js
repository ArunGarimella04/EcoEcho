// src/routes/communityRoutes.js
const express = require('express');
const {
  createCommunityGroup,
  getCommunityGroups,
  joinGroup,
  leaveGroup
} = require('../controllers/communityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create a new community group
router.post('/', protect, createCommunityGroup);

// Get all community groups
router.get('/', protect, getCommunityGroups);

// Join a community group
router.post('/:id/join', protect, joinGroup);

// Leave a community group
router.post('/:id/leave', protect, leaveGroup);

module.exports = router;

