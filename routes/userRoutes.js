const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
