const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// --- PUBLIC ROUTES ---
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- PROTECTED ROUTES ---
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.put('/update-password', protect, authController.updatePassword);

// --- FORGOT PASSWORD ROUTES ---
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

module.exports = router;