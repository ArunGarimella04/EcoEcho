// src/routes/wasteRoutes.js
const express = require('express');
const {
  getUserWasteItems,
  addWasteItem,
  getWasteItem,
  deleteWasteItem,
  analyzeWasteItem
} = require('../controllers/wasteController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes for /api/waste
router.route('/')
  .get(getUserWasteItems)
  .post(addWasteItem);

// Route for analyzing waste
router.post('/analyze', analyzeWasteItem);

// Routes for /api/waste/:id
router.route('/:id')
  .get(getWasteItem)
  .delete(deleteWasteItem);

module.exports = router;
