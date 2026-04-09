const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/checkout', protect, paymentController.checkout);
router.post('/webhook', express.json(), paymentController.webhook); // Use express.json() raw for webhook if needed, but app.js already has it

module.exports = router;
