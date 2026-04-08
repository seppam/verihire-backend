const express = require('express');
const router = express.Router();

const { optionalProtect } = require('../middlewares/authMiddleware');
const { chatLimiter } = require('../middlewares/rateLimiter'); 
const chatController = require('../controllers/eliceChatController');

// Alurnya: Cek Token (kalau ada) -> Limiter Chat (Beda 100/30) -> Controller
router.post('/', optionalProtect, chatLimiter, chatController.getChatResponse);

module.exports = router;