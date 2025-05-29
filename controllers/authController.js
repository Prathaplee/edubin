const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Your App Name" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user._id);
  res.status(200).json({ token, user });
};

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000;

  const user = await User.findOneAndUpdate({ email }, { otp, otpExpiresAt });
  if (!user) return res.status(404).json({ error: 'User not found' });

  await sendEmail(email, 'Your OTP Code', `Your OTP is ${otp}`);
  res.json({ message: 'OTP sent to your email' });
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email, otp });

  if (!user || Date.now() > user.otpExpiresAt)
    return res.status(400).json({ error: 'Invalid or expired OTP' });

  res.json({ message: 'OTP verified' });
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email, otp });

  if (!user || Date.now() > user.otpExpiresAt)
    return res.status(400).json({ error: 'Invalid or expired OTP' });

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
};

exports.guestLogin = async (req, res) => {
  const guestId = `Guest${Date.now()}`;
  const email = `${guestId.toLowerCase()}@guest.com`;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({ name: guestId, email, password: '', role: 'guest' });
  }

  const token = generateToken(user._id);
  res.status(200).json({ token, user });
};

exports.googleSignIn = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email } = ticket.getPayload();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email, password: '', role: 'student' });
    }

    const token = generateToken(user._id);
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(400).json({ error: 'Google sign-in failed' });
  }
};
