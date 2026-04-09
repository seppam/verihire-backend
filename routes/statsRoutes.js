const express = require('express');
const statsController = require('../controllers/statsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// PUBLIC ROUTE: Siapapun (termasuk landing page tanpa login) bisa akses data ini
router.get('/public', statsController.getLandingPageStats);

// PRIVATE ROUTE: Hanya user login yang bisa lihat statistik miliknya sendiri
router.get('/my-stats', protect, statsController.getUserStats);

module.exports = router;