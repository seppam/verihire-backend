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
  // UBAH 'name' JADI 'username' DI SINI
  const { username, email, password } = req.body;

  // UBAH JUGA DI SINI
  const cleanUsername = username ? validator.trim(username) : '';
  const cleanEmail = email ? validator.normalizeEmail(validator.trim(email)) : '';
  
  const newUser = await User.create({
    username: cleanUsername, // MASUKKAN KE DB
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

// --- 4. UPDATE PROFILE (Username, Email, Avatar) ---
exports.updateProfile = catchAsync(async (req, res, next) => {
  // 1. Cegah user ngubah password dari endpoint ini
  if (req.body.password || req.body.currentPassword || req.body.newPassword) {
    return res.status(400).json({
      success: false,
      message: 'This route is not for password updates. Please use /update-password.'
    });
  }

  // 2. Filter hanya field yang boleh diubah
  const filterBody = {};
  if (req.body.username) filterBody.username = req.body.username;
  if (req.body.email) filterBody.email = req.body.email;
  if (req.body.avatar !== undefined) filterBody.avatar = req.body.avatar; // Handle avatar dari FE

  // 3. Update document user
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});


// --- 5. UPDATE PASSWORD ---
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Validasi input: pastikan user mengisi password lama dan baru
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both your current password and new password.'
    });
  }

  // 2. Ambil user dari database beserta password-nya 
  // (Karena di model select: false, kita harus pakai +password)
  const user = await User.findById(req.user.id).select('+password');

  // 3. Verifikasi password lama menggunakan method dari model User.js
  const isPasswordCorrect = await user.correctPassword(currentPassword, user.password);

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: 'Your current password is incorrect!'
    });
  }

  // 4. Update dengan password baru
  user.password = newPassword;
  await user.save(); 

  // 5. Kirim response sukses
  res.status(200).json({
    success: true,
    message: 'Password updated successfully!'
  });
});