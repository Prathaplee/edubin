const mongoose = require('mongoose');

const errorCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flashcardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flashcard', required: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ErrorCard', errorCardSchema);
