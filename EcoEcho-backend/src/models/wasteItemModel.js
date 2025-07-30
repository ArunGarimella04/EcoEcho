// src/models/wasteItemModel.js
const mongoose = require('mongoose');

const WasteItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please specify a category'],
    enum: ['Plastic', 'Paper', 'Glass', 'Metal', 'Organic', 'Electronic', 'Other', 'Compostable']
  },
  weightInGrams: {
    type: Number,
    required: [true, 'Please specify the weight'],
    default: 0
  },
  isRecyclable: {
    type: Boolean,
    required: true
  },
  itemImage: {
    type: String
  },
  carbonFootprint: {
    type: Number,
    default: 0
  },
  disposalMethod: {
    type: String,
    enum: ['Recycled', 'Composted', 'Reused', 'Landfill']
  },
  ecoScore: {
    type: Number,
    default: 0
  },
  scanDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WasteItem', WasteItemSchema);