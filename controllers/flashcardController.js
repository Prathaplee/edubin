const Deck = require('../models/Deck.js');
const Flashcard = require('../models/Flashcard');
const ErrorCard = require('../models/ErrorCard');

// Admin: Create deck
exports.createDeck = async (req, res) => {
  try {
    const { title, description } = req.body;
    const deck = new Deck({ title, description });
    await deck.save();
    res.status(201).json(deck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: Add flashcard
exports.addFlashcard = async (req, res) => {
  try {
    const { deckId, question, answer, isMicrobit } = req.body;
    const card = new Flashcard({ deckId, question, answer, isMicrobit });
    await card.save();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Student: Get all flashcards in a deck
exports.getDeckFlashcards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const cards = await Flashcard.find({ deckId });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Student: Get microbit cards
exports.getMicrobitFlashcards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const cards = await Flashcard.find({ deckId, isMicrobit: true });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Student: Add error card
exports.markErrorCard = async (req, res) => {
  try {
    const { userId, flashcardId, deckId } = req.body;
    const error = new ErrorCard({ userId, flashcardId, deckId });
    await error.save();
    res.status(201).json(error);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Student: Get all error cards for user
exports.getUserErrorCards = async (req, res) => {
  try {
    const { userId } = req.params;
    const cards = await ErrorCard.find({ userId }).populate('flashcardId');
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
