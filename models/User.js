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
    select: false
  },
  avatar: {
    type: String,
    default: ""
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
  // Canonical expiry field. Used for both checking premium status and
  // for cumulative extension in payment webhook.
  membershipExpires: {
    type: Date,
    default: null
  },
  scanLimit: {
    type: Number,
    default: 20
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
  // Idempotency list: prevents double-processing the same Mayar transaction
  processedTransactions: [{ type: String }]
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Verify password at login
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate password reset token (valid 10 minutes)
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Virtual: is membership currently active
userSchema.virtual('isMembershipActive').get(function() {
  if (!this.isPremium || !this.membershipExpires) return false;
  return new Date() < this.membershipExpires;
});

module.exports = mongoose.model('User', userSchema);
