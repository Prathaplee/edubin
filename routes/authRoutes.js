const express = require('express');
const router = express.Router();
const {
  register,
  login,
  sendOtp,
  verifyOtp,
  resetPassword,
  guestLogin,
  googleSignIn,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/guest-login', guestLogin);
router.post('/google-signin', googleSignIn);

module.exports = router;
