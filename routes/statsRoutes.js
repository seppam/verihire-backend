const express = require('express');
const statsController = require('../controllers/statsController');

const router = express.Router();

// PUBLIC ROUTE: Siapapun (termasuk landing page tanpa login) bisa akses data ini
router.get('/public', statsController.getLandingPageStats);

module.exports = router;