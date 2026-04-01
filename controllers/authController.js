const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// --- 1. REGISTER ---
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const cleanName = name ? validator.trim(name) : '';
  const cleanEmail = email ? validator.normalizeEmail(validator.trim(email)) : '';
  
  const newUser = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: password,
  });

  const token = signToken(newUser._id);
  newUser.password = undefined;

  res.status(201).json({
    success: true,
    token,
    data: { user: newUser }
  });
});

// --- 2. LOGIN ---
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email: validator.normalizeEmail(email) }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }

  const token = signToken(user._id);

  res.status(200).json({ success: true, token });
});

// --- 3. GET CURRENT USER (ME) ---
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { user: req.user }
  });
});