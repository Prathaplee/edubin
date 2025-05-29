const express = require('express');
const router = express.Router();
const flashcardController = require('../controllers/flashcardController');

// Admin routes
router.post('/deck', flashcardController.createDeck);
router.post('/flashcard', flashcardController.addFlashcard);

// Student routes
router.get('/deck/:deckId', flashcardController.getDeckFlashcards);
router.get('/deck/:deckId/microbit', flashcardController.getMicrobitFlashcards);
router.post('/error', flashcardController.markErrorCard);
router.get('/error/:userId', flashcardController.getUserErrorCards);

module.exports = router;
