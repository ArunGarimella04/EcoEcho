// src/models/recyclingLocationModel.js
const mongoose = require('mongoose');

const recyclingLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Recycling Center', 'Drop-off Point', 'Collection Point', 'Hazardous Waste', 'E-waste Center', 'Composting Site'],
    required: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: {
      street: String,
      city: { type: String, required: true },
      state: String,
      country: { type: String, required: true },
      zipCode: String
    }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  operatingHours: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    openTime: String, // "HH:MM" format
    closeTime: String, // "HH:MM" format
    isClosed: { type: Boolean, default: false }
  }],
  acceptedMaterials: [{
    category: { type: String, enum: ['Plastic', 'Paper', 'Glass', 'Metal', 'Electronic', 'Organic', 'Hazardous', 'Textile'] },
    types: [String], // specific types within category
    restrictions: String,
    fees: {
      hasFee: { type: Boolean, default: false },
      amount: Number,
      unit: String // 'per kg', 'per item', etc.
    }
  }],
  services: {
    pickupAvailable: { type: Boolean, default: false },
    dropOffOnly: { type: Boolean, default: true },
    bulkAccepted: { type: Boolean, default: false },
    appointmentRequired: { type: Boolean, default: false }
  },
  ratings: {
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 }
  },
  verificationStatus: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    lastUpdated: { type: Date, default: Date.now }
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  images: [String], // URLs to images
  specialInstructions: String
}, {
  timestamps: true
});

// Geospatial index for location queries
recyclingLocationSchema.index({ 'location.coordinates': '2dsphere' });

// Text search index
recyclingLocationSchema.index({ 
  name: 'text', 
  description: 'text', 
  'location.address.city': 'text' 
});

// Compound index for filtering
recyclingLocationSchema.index({ type: 1, 'location.address.city': 1, isActive: 1 });

module.exports = mongoose.model('RecyclingLocation', recyclingLocationSchema);
