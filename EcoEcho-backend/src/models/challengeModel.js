// src/models/challengeModel.js
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  image: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['Personal', 'Community', 'Global', 'Educational'],
    required: true
  },
  category: {
    type: String,
    enum: ['Weight', 'Items', 'Carbon', 'Consistency', 'Education', 'Community'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  duration: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Custom'],
    default: 'Weekly'
  },
  customDuration: {
    startDate: Date,
    endDate: Date
  },
  target: {
    metric: { type: String, enum: ['weight', 'items', 'carbon', 'days', 'percentage'] },
    value: { type: Number, required: true },
    unit: String // 'kg', 'items', 'days', '%'
  },
  rewards: {
    experience: { type: Number, default: 0 },
    badges: [String],
    title: String,
    description: String
  },
  restrictions: {
    categories: [String], // specific waste categories
    locations: [String], // specific regions/cities
    userLevel: { min: Number, max: Number }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  communityGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityGroup'
  },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    currentStreak: { type: Number, default: 0 }
  }],
  stats: {
    totalParticipants: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageProgress: { type: Number, default: 0 },
    totalImpact: {
      weight: { type: Number, default: 0 },
      items: { type: Number, default: 0 },
      carbon: { type: Number, default: 0 }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  maxParticipants: {
    type: Number,
    default: null // null means unlimited
  }
}, {
  timestamps: true
});

// Text search index
challengeSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Compound indexes for efficient queries
challengeSchema.index({ type: 1, category: 1, isActive: 1 });
challengeSchema.index({ difficulty: 1, duration: 1, isActive: 1 });
challengeSchema.index({ featured: 1, isActive: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
