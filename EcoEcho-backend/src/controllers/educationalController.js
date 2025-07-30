// src/controllers/educationalController.js
const EducationalContent = require('../models/educationalContentModel');

// @desc Add new educational content
// @route POST /api/educational
const addContent = async (req, res) => {
  try {
    const content = new EducationalContent({
      ...req.body,
      author: req.user._id
    });
    await content.save();
    res.status(201).json({ success: true, data: content });
  } catch (error) {
    console.error('Error adding educational content:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get all educational content
// @route GET /api/educational
const getAllEducationalContent = async (req, res) => {
  try {
    const { type, category, difficulty, page = 1, limit = 10 } = req.query;
    const query = {
      isActive: true,
      'moderation.isApproved': true,
      ...(type && { type }),
      ...(category && { category }),
      ...(difficulty && { difficulty })
    };

    const content = await EducationalContent.find(query)
      .populate('author', 'name')
      .sort({ featured: -1, 'engagement.views': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EducationalContent.countDocuments(query);

    res.status(200).json({
      success: true,
      data: content,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching educational content:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Search educational content
// @route GET /api/educational/search
const searchEducationalContent = async (req, res) => {
  try {
    const { q, type, category } = req.query;
    const query = {
      isActive: true,
      'moderation.isApproved': true,
      ...(type && { type }),
      ...(category && { category })
    };

    if (q) {
      query.$text = { $search: q };
    }

    const content = await EducationalContent.find(query)
      .populate('author', 'name')
      .sort(q ? { score: { $meta: 'textScore' } } : { 'engagement.views': -1 });

    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error('Error searching educational content:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc Get educational content by ID
// @route GET /api/educational/:id
const getEducationalContentById = async (req, res) => {
  try {
    const content = await EducationalContent.findById(req.params.id)
      .populate('author', 'name')
      .populate('relatedContent', 'title type category thumbnail');

    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // Increment view count
    content.engagement.views += 1;
    await content.save();

    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error('Error fetching educational content:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

module.exports = {
  addContent,
  getAllEducationalContent,
  searchEducationalContent,
  getEducationalContentById
};
