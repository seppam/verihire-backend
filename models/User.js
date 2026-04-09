const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false // Agar password tidak ikut terbawa saat query find()
  },
  avatar: { 
    type: String,
    default: "" // Default-nya string kosong.
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumValidUntil: {
    type: Date,
    default: null
  },
  scanLimit: {
    type: Number,
    default: 20 // Free users get 20 tokens
  },
  phoneNumber: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// Middleware untuk hash password sebelum simpan
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method untuk verifikasi password saat login
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Berlaku 10 Menit

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);