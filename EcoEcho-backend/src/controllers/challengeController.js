// src/controllers/challengeController.js
const Challenge = require('../models/challengeModel');
const User = require('../models/userModel');

// @desc Create a new challenge
// @route POST /api/challenges
const createChallenge = async (req, res) => {
  try {
    const challenge = new Challenge({
      ...req.body,
      creator: req.user._id
    });
    await challenge.save();
    res.status(201).json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get all available challenges
// @route GET /api/challenges
const getChallenges = async (req, res) => {
  try {
    const { type, category, difficulty, featured } = req.query;
    const query = {
      isActive: true,
      ...(type && { type }),
      ...(category && { category }),
      ...(difficulty && { difficulty }),
      ...(featured && { featured: featured === 'true' })
    };

    const challenges = await Challenge.find(query)
      .populate('creator', 'name')
      .populate('communityGroup', 'name')
      .sort({ featured: -1, createdAt: -1 });

    res.status(200).json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get user's challenges
// @route GET /api/challenges/user
const getUserChallenges = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user._id,
      isActive: true
    }).populate('creator', 'name');

    const userChallenges = challenges.map(challenge => {
      const userParticipation = challenge.participants.find(
        p => p.user.toString() === req.user._id.toString()
      );
      return {
        ...challenge.toObject(),
        userProgress: userParticipation.progress,
        userCompleted: userParticipation.completed,
        userJoinedAt: userParticipation.joinedAt
      };
    });

    res.status(200).json({ success: true, data: userChallenges });
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Join a challenge
// @route POST /api/challenges/:id/join
const joinChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    // Check if user is already participating
    const alreadyParticipating = challenge.participants.some(
      p => p.user.toString() === req.user._id.toString()
    );

    if (alreadyParticipating) {
      return res.status(400).json({ success: false, error: 'Already participating in this challenge' });
    }

    // Check if challenge has reached max participants
    if (challenge.maxParticipants && challenge.participants.length >= challenge.maxParticipants) {
      return res.status(400).json({ success: false, error: 'Challenge is full' });
    }

    challenge.participants.push({ user: req.user._id });
    challenge.stats.totalParticipants += 1;
    await challenge.save();

    res.status(200).json({ success: true, data: 'Joined challenge successfully' });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Update challenge progress
// @route PUT /api/challenges/:id/progress
const updateChallengeProgress = async (req, res) => {
  try {
    const { progress } = req.body;
    const challenge = await Challenge.findById(req.params.id);
    
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    const participantIndex = challenge.participants.findIndex(
      p => p.user.toString() === req.user._id.toString()
    );

    if (participantIndex === -1) {
      return res.status(400).json({ success: false, error: 'Not participating in this challenge' });
    }

    challenge.participants[participantIndex].progress = progress;
    
    // Check if challenge is completed
    if (progress >= challenge.target.value) {
      challenge.participants[participantIndex].completed = true;
      challenge.participants[participantIndex].completedAt = new Date();
      
      // Award experience and badges to user
      const user = await User.findById(req.user._id);
      user.gamification.experience += challenge.rewards.experience || 0;
      
      if (challenge.rewards.badges && challenge.rewards.badges.length > 0) {
        challenge.rewards.badges.forEach(badgeId => {
          user.gamification.badges.push({
            badgeId,
            name: challenge.rewards.title || challenge.title,
            description: challenge.rewards.description || challenge.description,
            category: 'achievement'
          });
        });
      }
      
      await user.save();
    }

    // Update challenge stats
    const completedCount = challenge.participants.filter(p => p.completed).length;
    challenge.stats.completionRate = (completedCount / challenge.participants.length) * 100;
    challenge.stats.averageProgress = challenge.participants.reduce((sum, p) => sum + p.progress, 0) / challenge.participants.length;

    await challenge.save();

    res.status(200).json({ 
      success: true, 
      data: 'Progress updated successfully',
      completed: challenge.participants[participantIndex].completed
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  createChallenge,
  getChallenges,
  joinChallenge,
  updateChallengeProgress,
  getUserChallenges
};
