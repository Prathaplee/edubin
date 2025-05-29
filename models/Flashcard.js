const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  isMicrobit: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Flashcard', flashcardSchema);
