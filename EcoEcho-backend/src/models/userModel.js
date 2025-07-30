// src/models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Enhanced user profile
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
      zipCode: String
    }
  },
  preferences: {
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
      achievementAlerts: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: false }
    },
    privacy: {
      shareLocation: { type: Boolean, default: false },
      shareStats: { type: Boolean, default: true },
      allowCommunityContact: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },
  // Gamification system
  gamification: {
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    badges: [{
      badgeId: String,
      name: String,
      description: String,
      earnedAt: { type: Date, default: Date.now },
      category: { type: String, enum: ['achievement', 'milestone', 'community', 'environmental'] }
    }],
    achievements: [{
      achievementId: String,
      name: String,
      description: String,
      progress: { type: Number, default: 0 },
      target: Number,
      completed: { type: Boolean, default: false },
      completedAt: Date,
      reward: {
        experience: Number,
        badge: String
      }
    }],
    streaks: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastScanDate: Date
    }
  },
  // Enhanced goals system
  goals: {
    monthly: {
      weightGoal: { type: Number, default: 50 }, // kg
      itemsGoal: { type: Number, default: 30 },
      carbonGoal: { type: Number, default: 25 }, // kg CO2
      recyclingRateGoal: { type: Number, default: 80 } // percentage
    },
    weekly: {
      itemsGoal: { type: Number, default: 7 },
      categoriesGoal: { type: Number, default: 3 }
    },
    custom: [{
      name: String,
      description: String,
      target: Number,
      progress: { type: Number, default: 0 },
      deadline: Date,
      category: String,
      isActive: { type: Boolean, default: true }
    }]
  },
  // Community features
  community: {
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reputation: { type: Number, default: 0 },
    contributions: {
      tipsShared: { type: Number, default: 0 },
      locationsAdded: { type: Number, default: 0 },
      challengesCompleted: { type: Number, default: 0 }
    }
  },
  stats: {
    totalItems: {
      type: Number,
      default: 0
    },
    totalWeight: {
      type: Number,
      default: 0
    },
    totalCarbonSaved: {
      type: Number,
      default: 0
    },
    recyclableItems: {
      type: Number,
      default: 0
    },
    // Enhanced stats
    byCategory: {
      plastic: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } },
      paper: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } },
      glass: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } },
      metal: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } },
      organic: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } },
      electronic: { items: { type: Number, default: 0 }, weight: { type: Number, default: 0 } }
    },
    recyclingRate: { type: Number, default: 0 }, // percentage
    consistencyScore: { type: Number, default: 0 }, // based on regular usage
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);