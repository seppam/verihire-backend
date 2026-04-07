const express = require('express');
const router = express.Router();
// const chatController = require('../controllers/chatController');
const chatController = require('../controllers/eliceChatController');

router.post('/', chatController.getChatResponse);

module.exports = router;