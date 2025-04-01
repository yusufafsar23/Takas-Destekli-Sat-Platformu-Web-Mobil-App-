const express = require('express');
const router = express.Router();
const { createConversation, sendMessage, getConversations, getMessages } = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Tüm route'lar protected
router.use(auth);

// Konuşma route'ları
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);

// Mesaj route'ları
router.post('/messages', sendMessage);
router.get('/conversations/:conversationId/messages', getMessages);

module.exports = router; 