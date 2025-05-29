// routes/flashcards.js
const express = require('express');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const Flashcard = require('../models/Flashcard');
const Deck = require('../models/Deck');
const StudySession = require('../models/StudySession');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// @desc    Get all decks for user
// @route   GET /api/flashcards/decks
// @access  Private
router.get('/decks', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const search = req.query.search;

    let query = { createdBy: req.user.id };
    
    if (category) {
      query.category = new RegExp(category, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const decks = await Deck.find(query)
      .populate('flashcardCount')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Deck.countDocuments(query);

    res.status(200).json({
      success: true,
      count: decks.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: decks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new deck
// @route   POST /api/flashcards/decks
// @access  Private
router.post('/decks', [
  body('name').trim().isLength({ min: 1 }).withMessage('Deck name is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { name, description, category, isPublic, color } = req.body;

    const deck = await Deck.create({
      name,
      description,
      category,
      isPublic: isPublic || false,
      color: color || '#3B82F6',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: deck
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single deck
// @route   GET /api/flashcards/decks/:id
// @access  Private
router.get('/decks/:id', [
  param('id').isMongoId().withMessage('Invalid deck ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const deck = await Deck.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    }).populate('createdBy', 'firstName lastName');

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found'
      });
    }

    // Get flashcards count
    const flashcardCount = await Flashcard.countDocuments({ deck: deck._id });
    
    res.status(200).json({
      success: true,
      data: { ...deck.toObject(), flashcardCount }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update deck
// @route   PUT /api/flashcards/decks/:id
// @access  Private
router.put('/decks/:id', [
  param('id').isMongoId().withMessage('Invalid deck ID'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Deck name cannot be empty'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    let deck = await Deck.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found or not authorized'
      });
    }

    const { name, description, category, isPublic, color, settings } = req.body;

    deck = await Deck.findByIdAndUpdate(
      req.params.id,
      {
        name: name || deck.name,
        description: description || deck.description,
        category: category || deck.category,
        isPublic: isPublic !== undefined ? isPublic : deck.isPublic,
        color: color || deck.color,
        settings: settings || deck.settings
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: deck
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete deck
// @route   DELETE /api/flashcards/decks/:id
// @access  Private
router.delete('/decks/:id', [
  param('id').isMongoId().withMessage('Invalid deck ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const deck = await Deck.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found or not authorized'
      });
    }

    // Delete all flashcards in the deck
    await Flashcard.deleteMany({ deck: req.params.id });
    
    // Delete study sessions
    await StudySession.deleteMany({ deck: req.params.id });
    
    // Delete the deck
    await Deck.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Deck deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get flashcards in a deck
// @route   GET /api/flashcards/decks/:deckId/cards
// @access  Private
router.get('/decks/:deckId/cards', [
  param('deckId').isMongoId().withMessage('Invalid deck ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const difficulty = req.query.difficulty;
    const search = req.query.search;

    // Check if user has access to the deck
    const deck = await Deck.findOne({
      _id: req.params.deckId,
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found or not authorized'
      });
    }

    let query = { deck: req.params.deckId };
    
    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (search) {
      query.$or = [
        { question: new RegExp(search, 'i') },
        { answer: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') }
      ];
    }

    const flashcards = await Flashcard.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Flashcard.countDocuments(query);

    res.status(200).json({
      success: true,
      count: flashcards.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: flashcards
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new flashcard
// @route   POST /api/flashcards/decks/:deckId/cards
// @access  Private
router.post('/decks/:deckId/cards', [
  param('deckId').isMongoId().withMessage('Invalid deck ID'),
  body('question').trim().isLength({ min: 1 }).withMessage('Question is required'),
  body('answer').trim().isLength({ min: 1 }).withMessage('Answer is required'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    // Check if user owns the deck
    const deck = await Deck.findOne({
      _id: req.params.deckId,
      createdBy: req.user.id
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found or not authorized'
      });
    }

    const { question, answer, category, difficulty, tags } = req.body;

    const flashcard = await Flashcard.create({
      question,
      answer,
      category: category || deck.category,
      difficulty: difficulty || 'medium',
      tags: tags || [],
      deck: req.params.deckId,
      createdBy: req.user.id
    });

    // Update deck statistics
    await Deck.findByIdAndUpdate(req.params.deckId, {
      $inc: { 'statistics.totalCards': 1 }
    });

    res.status(201).json({
      success: true,
      data: flashcard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single flashcard
// @route   GET /api/flashcards/:id
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid flashcard ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const flashcard = await Flashcard.findById(req.params.id)
      .populate('deck', 'name category')
      .populate('createdBy', 'firstName lastName');

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard not found'
      });
    }

    // Check if user has access
    const hasAccess = flashcard.createdBy._id.toString() === req.user.id ||
                     flashcard.isPublic ||
                     flashcard.deck.isPublic;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this flashcard'
      });
    }

    // Increment view count
    await Flashcard.findByIdAndUpdate(req.params.id, {
      $inc: { 'statistics.totalViews': 1 }
    });

    res.status(200).json({
      success: true,
      data: flashcard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update flashcard
// @route   PUT /api/flashcards/:id
// @access  Private
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid flashcard ID'),
  body('question').optional().trim().isLength({ min: 1 }).withMessage('Question cannot be empty'),
  body('answer').optional().trim().isLength({ min: 1 }).withMessage('Answer cannot be empty'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    let flashcard = await Flashcard.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard not found or not authorized'
      });
    }

    const { question, answer, category, difficulty, tags } = req.body;

    flashcard = await Flashcard.findByIdAndUpdate(
      req.params.id,
      {
        question: question || flashcard.question,
        answer: answer || flashcard.answer,
        category: category || flashcard.category,
        difficulty: difficulty || flashcard.difficulty,
        tags: tags || flashcard.tags
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: flashcard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid flashcard ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard not found or not authorized'
      });
    }

    await Flashcard.findByIdAndDelete(req.params.id);

    // Update deck statistics
    await Deck.findByIdAndUpdate(flashcard.deck, {
      $inc: { 'statistics.totalCards': -1 }
    });

    res.status(200).json({
      success: true,
      message: 'Flashcard deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Start study session
// @route   POST /api/flashcards/study/:deckId
// @access  Private
router.post('/study/:deckId', [
  param('deckId').isMongoId().withMessage('Invalid deck ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    // Check if user has access to the deck
    const deck = await Deck.findOne({
      _id: req.params.deckId,
      $or: [
        { createdBy: req.user.id },
        { isPublic: true }
      ]
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: 'Deck not found or not authorized'
      });
    }

    // Get flashcards for the deck
    let flashcards = await Flashcard.find({ deck: req.params.deckId });

    if (flashcards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No flashcards found in this deck'
      });
    }

    // Shuffle if random order is enabled
    if (deck.settings.randomOrder) {
      flashcards = flashcards.sort(() => Math.random() - 0.5);
    }

    // Create study session
    const studySession = await StudySession.create({
      user: req.user.id,
      deck: req.params.deckId,
      flashcards: flashcards.map(card => ({
        flashcard: card._id,
        isCorrect: null,
        timeSpent: 0,
        attempts: 0
      }))
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: studySession._id,
        flashcards: flashcards,
        deckSettings: deck.settings
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update study session progress
// @route   PUT /api/flashcards/study/:sessionId
// @access  Private
router.put('/study/:sessionId', [
  param('sessionId').isMongoId().withMessage('Invalid session ID'),
  body('flashcardId').isMongoId().withMessage('Invalid flashcard ID'),
  body('isCorrect').isBoolean().withMessage('isCorrect must be a boolean'),
  body('timeSpent').isNumeric().withMessage('timeSpent must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { flashcardId, isCorrect, timeSpent } = req.body;

    const studySession = await StudySession.findOne({
      _id: req.params.sessionId,
      user: req.user.id
    });

    if (!studySession) {
      return res.status(404).json({
        success: false,
        message: 'Study session not found'
      });
    }

    // Update flashcard progress in session
    const flashcardIndex = studySession.flashcards.findIndex(
      card => card.flashcard.toString() === flashcardId
    );

    if (flashcardIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Flashcard not found in this session'
      });
    }

    studySession.flashcards[flashcardIndex].isCorrect = isCorrect;
    studySession.flashcards[flashcardIndex].timeSpent += timeSpent;
    studySession.flashcards[flashcardIndex].attempts += 1;

    // Update flashcard statistics
    if (isCorrect) {
      studySession.score.correct += 1;
      await Flashcard.findByIdAndUpdate(flashcardId, {
        $inc: { 'statistics.correctAnswers': 1 }
      });
    } else {
      studySession.score.incorrect += 1;
      await Flashcard.findByIdAndUpdate(flashcardId, {
        $inc: { 'statistics.incorrectAnswers': 1 }
      });
    }

    // Calculate percentage
    const totalAnswered = studySession.score.correct + studySession.score.incorrect;
    studySession.score.percentage = Math.round((studySession.score.correct / totalAnswered) * 100);

    await studySession.save();

    res.status(200).json({
      success: true,
      data: studySession
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Complete study session
// @route   PUT /api/flashcards/study/:sessionId/complete
// @access  Private
router.put('/study/:sessionId/complete', [
  param('sessionId').isMongoId().withMessage('Invalid session ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const studySession = await StudySession.findOne({
      _id: req.params.sessionId,
      user: req.user.id
    });

    if (!studySession) {
      return res.status(404).json({
        success: false,
        message: 'Study session not found'
      });
    }

    // Complete the session
    studySession.endTime = new Date();
    studySession.totalDuration = Math.floor((studySession.endTime - studySession.startTime) / 1000);
    studySession.isCompleted = true;

    await studySession.save();

    // Update deck statistics
    await Deck.findByIdAndUpdate(studySession.deck, {
      $inc: { 
        'statistics.totalStudyTime': Math.floor(studySession.totalDuration / 60),
        'statistics.averageScore': studySession.score.percentage
      }
    });

    res.status(200).json({
      success: true,
      data: studySession,
      message: 'Study session completed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get study statistics
// @route   GET /api/flashcards/statistics
// @access  Private
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id;
    const timeRange = req.query.range || '7d'; // 7d, 30d, 90d, all

    let dateFilter = {};
    if (timeRange !== 'all') {
      const days = parseInt(timeRange.replace('d', ''));
      dateFilter.createdAt = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }

    // Get study sessions statistics
    const studySessions = await StudySession.find({
      user: userId,
      isCompleted: true,
      ...dateFilter
    });

    // Calculate statistics
    const totalSessions = studySessions.length;
    const totalStudyTime = studySessions.reduce((acc, session) => acc + session.totalDuration, 0);
    const averageScore = totalSessions > 0 
      ? Math.round(studySessions.reduce((acc, session) => acc + session.score.percentage, 0) / totalSessions)
      : 0;

    // Get deck count
    const totalDecks = await Deck.countDocuments({ createdBy: userId });
    
    // Get flashcard count
    const totalFlashcards = await Flashcard.countDocuments({ createdBy: userId });

    // Get recent activity
    const recentSessions = await StudySession.find({
      user: userId,
      isCompleted: true
    })
    .populate('deck', 'name category')
    .sort({ createdAt: -1 })
    .limit(5);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDecks,
          totalFlashcards,
          totalSessions,
          totalStudyTime: Math.floor(totalStudyTime / 60), // in minutes
          averageScore
        },
        recentActivity: recentSessions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;