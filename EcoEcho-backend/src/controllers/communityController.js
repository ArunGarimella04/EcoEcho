// src/controllers/communityController.js
const CommunityGroup = require('../models/communityGroupModel');

// @desc Create a new community group
// @route POST /api/community
const createCommunityGroup = async (req, res) => {
  try {
    const group = new CommunityGroup({
      ...req.body,
      creator: req.user._id
    });
    await group.save();
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    console.error('Error creating community group:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get all community groups
// @route GET /api/community
const getCommunityGroups = async (req, res) => {
  try {
    const groups = await CommunityGroup.find().populate('creator', 'name');
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    console.error('Error fetching community groups:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Join a community group
// @route POST /api/community/:id/join
const joinGroup = async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    group.members.push({ user: req.user._id });
    group.stats.totalMembers += 1;
    await group.save();

    res.status(200).json({ success: true, data: 'Joined group successfully' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Leave a community group
// @route POST /api/community/:id/leave
const leaveGroup = async (req, res) => {
  try {
    const group = await CommunityGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

    group.members = group.members.filter(member => member.user.toString() !== req.user._id.toString());
    group.stats.totalMembers -= 1;
    await group.save();

    res.status(200).json({ success: true, data: 'Left group successfully' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  createCommunityGroup,
  getCommunityGroups,
  joinGroup,
  leaveGroup
};

