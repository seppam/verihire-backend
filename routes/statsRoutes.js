const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Endpoint: GET /api/stats
router.get('/', statsController.getGeneralStats);

module.exports = router;