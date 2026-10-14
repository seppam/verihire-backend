const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// NOTE: The /webhook route below is a placeholder.
// The actual webhook route is mounted in app.js BEFORE express.json()
// so the raw body can be captured for HMAC verification.
// The app.js mounts it at: app.post("/api/payment/webhook", ...)
router.post('/checkout', protect, paymentController.checkout);

module.exports = router;
