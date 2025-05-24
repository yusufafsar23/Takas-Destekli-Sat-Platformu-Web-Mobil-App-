const express = require('express');
const router = express.Router();
const { 
  createConversation, 
  sendMessage, 
  getConversations, 
  getMessages,
  markAsRead,
  archiveConversation,
  unarchiveConversation,
  getArchivedConversations,
  getUnreadCount
} = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Tüm route'lar protected
router.use(auth);

// Konuşma route'ları
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/archived', getArchivedConversations);
router.put('/conversations/:conversationId/archive', archiveConversation);
router.put('/conversations/:conversationId/unarchive', unarchiveConversation);

// Mesaj route'ları
router.post('/conversations/:conversationId', sendMessage);
router.get('/conversations/:conversationId/messages', getMessages);
router.put('/conversations/:conversationId/read', markAsRead);

// Bildirim route'ları
router.get('/unread/count', getUnreadCount);

module.exports = router; 