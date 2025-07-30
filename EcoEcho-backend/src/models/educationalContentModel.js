// src/models/educationalContentModel.js
const mongoose = require('mongoose');

const educationalContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  type: {
    type: String,
    enum: ['Article', 'Video', 'Infographic', 'Quiz', 'Tutorial', 'Guide', 'Tip'],
    required: true
  },
  category: {
    type: String,
    enum: ['Recycling', 'Composting', 'Waste Reduction', 'Sustainability', 'Climate Change', 'Local Rules', 'DIY', 'Kids'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  targetAudience: {
    type: String,
    enum: ['General', 'Kids', 'Teens', 'Adults', 'Seniors', 'Families'],
    default: 'General'
  },
  estimatedReadTime: {
    type: Number, // in minutes
    default: 5
  },
  media: {
    thumbnail: String,
    images: [String],
    videos: [{
      url: String,
      duration: Number, // in seconds
      quality: String
    }],
    attachments: [{
      name: String,
      url: String,
      type: String // 'pdf', 'doc', etc.
    }]
  },
  interactive: {
    hasQuiz: { type: Boolean, default: false },
    quiz: [{
      question: String,
      options: [String],
      correctAnswer: Number, // index of correct option
      explanation: String
    }],
    hasChecklist: { type: Boolean, default: false },
    checklist: [String]
  },
  location: {
    isLocationSpecific: { type: Boolean, default: false },
    regions: [String], // country/state codes
    cities: [String]
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderation: {
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String
  },
  engagement: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 }
  },
  userInteractions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    liked: { type: Boolean, default: false },
    bookmarked: { type: Boolean, default: false },
    rating: { type: Number, min: 1, max: 5 },
    completedQuiz: { type: Boolean, default: false },
    quizScore: Number,
    lastViewed: { type: Date, default: Date.now }
  }],
  tags: [String],
  relatedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationalContent'
  }],
  seo: {
    metaDescription: String,
    keywords: [String],
    slug: { type: String, unique: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Text search index with weights
educationalContentSchema.index({ 
  title: 'text', 
  description: 'text',
  content: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 3,
    content: 1
  }
});

// Compound indexes for efficient filtering
educationalContentSchema.index({ type: 1, category: 1, isActive: 1 });
educationalContentSchema.index({ difficulty: 1, targetAudience: 1, isActive: 1 });
educationalContentSchema.index({ featured: 1, isActive: 1, publishedAt: -1 });
educationalContentSchema.index({ 'engagement.views': -1, isActive: 1 });

// Generate slug before saving
educationalContentSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.seo.slug) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }
  next();
});

module.exports = mongoose.model('EducationalContent', educationalContentSchema);
