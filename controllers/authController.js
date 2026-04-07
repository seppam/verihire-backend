const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// --- 1. REGISTER ---
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  const cleanUsername = username ? validator.trim(username) : '';
  
  // FIX: Disable removing dots on Gmail
  const cleanEmail = email ? validator.normalizeEmail(validator.trim(email), { gmail_remove_dots: false }) : '';
  
  const newUser = await User.create({
    username: cleanUsername,
    email: cleanEmail,
    password: password,
  });

  const emailData = {
      subject: 'Welcome to VeriHire! 🎉',
      title: 'Welcome Aboard!',
      message: `Hello ${newUser.username},\n\nThank you for joining VeriHire! We are ready to help you analyze your CV and detect fake job vacancies.\n\nEnjoy exploring our features!`,
      buttonText: 'Start Scanning Now'
  };

  try {
    await sendEmail({
      email: newUser.email,
      subject: emailData.subject,
      title: emailData.title,
      message: emailData.message,
      buttonText: emailData.buttonText,
      buttonLink: 'http://localhost:3001' 
    });
  } catch (err) {
    console.log('Welcome email failed to send:', err);
  }

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

  // FIX: Match the normalization method used during registration
  const normalizedEmail = validator.normalizeEmail(email, { gmail_remove_dots: false });
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({ success: false, message: 'Incorrect email or password' });
  }

  const token = signToken(user._id);
  res.status(200).json({ success: true, token });
});

// --- 3. GET CURRENT USER (ME) ---
exports.getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

// --- 4. UPDATE PROFILE ---
exports.updateProfile = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.currentPassword || req.body.newPassword) {
    return res.status(400).json({ success: false, message: 'This route is not for password updates. Please use /update-password.' });
  }

  const filterBody = {};
  if (req.body.username) filterBody.username = req.body.username;
  if (req.body.email) filterBody.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false }); // FIX email edit
  if (req.body.avatar !== undefined) filterBody.avatar = req.body.avatar; 

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: updatedUser });
});

// --- 5. UPDATE PASSWORD ---
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide both your current password and new password.' });
  }

  const user = await User.findById(req.user.id).select('+password');
  const isPasswordCorrect = await user.correctPassword(currentPassword, user.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({ success: false, message: 'Your current password is incorrect!' });
  }

  user.password = newPassword;
  await user.save(); 

  res.status(200).json({ success: true, message: 'Password updated successfully!' });
});

// --- 6. FORGOT PASSWORD ---
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const normalizedEmail = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false }); // FIX search email
  const user = await User.findOne({ email: normalizedEmail });
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'Email not found.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `http://localhost:3001/reset-password/${resetToken}`;


  const emailData = {
      subject: 'VeriHire - Password Reset Request',
      title: 'Reset Your Password',
      message: 'We received a request to reset your password. Click the button below to create a new password. This link is only valid for 10 minutes.',
      buttonText: 'Reset Password'
  };

  try {
    await sendEmail({
      email: user.email,
      subject: emailData.subject,
      title: emailData.title,
      message: emailData.message,
      buttonText: emailData.buttonText,
      buttonLink: resetURL
    });

    res.status(200).json({ success: true, message: 'Password reset token has been sent to email.' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

// --- 7. RESET PASSWORD ---
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); 

  res.status(200).json({ success: true, message: 'Password successfully changed! Please login.' });
});