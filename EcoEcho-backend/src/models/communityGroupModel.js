// src/models/communityGroupModel.js
const mongoose = require('mongoose');

const communityGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Group description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Local Community', 'School', 'Corporate', 'Environmental', 'Neighborhood', 'Special Interest'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    address: {
      city: String,
      state: String,
      country: String,
      zipCode: String,
      radius: { type: Number, default: 10 } // km
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['member', 'moderator'], default: 'member' },
    isActive: { type: Boolean, default: true }
  }],
  settings: {
    isPublic: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    maxMembers: { type: Number, default: 1000 },
    allowMemberPosts: { type: Boolean, default: true }
  },
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    totalWasteProcessed: { type: Number, default: 0 },
    totalCarbonSaved: { type: Number, default: 0 },
    avgMemberActivity: { type: Number, default: 0 }
  },
  challenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for location-based queries
communityGroupSchema.index({ 'location.coordinates': '2dsphere' });

// Index for search functionality
communityGroupSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('CommunityGroup', communityGroupSchema);
