const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Please login to access this feature' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const currentUser = await User.findById(decoded.id);
  
  if (!currentUser) {
    return res.status(401).json({ message: 'The user belonging to this token no longer exists' });
  }

  // Simpan data user ke request agar bisa dipakai di controller selanjutnya
  req.user = currentUser;
  next();
});

exports.optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser; // User terdeteksi login
      }
    }
    next();
  } catch (err) {
    next(); // Jika token salah/expired, tetap lanjut sebagai guest
  }
};