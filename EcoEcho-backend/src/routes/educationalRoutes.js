// src/routes/educationalRoutes.js
const express = require('express');
const {
  addContent,
  getAllEducationalContent,
  searchEducationalContent,
  getEducationalContentById,
} = require('../controllers/educationalController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Add new educational content
router.post('/', protect, addContent);

// Retrieve all educational content
router.get('/', getAllEducationalContent);

// Search content by type, category, etc.
router.get('/search', searchEducationalContent);

// Get specific content by ID
router.get('/:id', getEducationalContentById);

module.exports = router;

