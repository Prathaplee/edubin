const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'teacher', 'admin', 'guest'], default: 'student' },
  otp: String,
  otpExpiresAt: Date,
});

module.exports = mongoose.model('User', userSchema);
