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

module.exports = router;