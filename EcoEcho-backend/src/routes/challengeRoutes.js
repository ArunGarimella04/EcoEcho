// src/routes/challengeRoutes.js
const express = require('express');
const {
  createChallenge,
  getChallenges,
  joinChallenge,
  updateChallengeProgress,
  getUserChallenges
} = require('../controllers/challengeController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Create a new challenge
router.post('/', protect, createChallenge);

// Get all available challenges
router.get('/', getChallenges);

// Get user's challenges
router.get('/user', protect, getUserChallenges);

// Join a challenge
router.post('/:id/join', protect, joinChallenge);

// Update challenge progress
router.put('/:id/progress', protect, updateChallengeProgress);

module.exports = router;
