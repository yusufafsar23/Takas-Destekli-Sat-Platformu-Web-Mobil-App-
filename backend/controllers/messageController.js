const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Yeni Konuşma Başlatma
const createConversation = async (req, res) => {
    try {
        const { participantId } = req.body;

        // Konuşma kontrolü
        const existingConversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId] }
        });

        if (existingConversation) {
            return res.json(existingConversation);
        }

        const conversation = new Conversation({
            participants: [req.user._id, participantId]
        });

        await conversation.save();
        res.status(201).json(conversation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mesaj Gönderme
const sendMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;

        // Konuşma kontrolü
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Konuşma bulunamadı.' });
        }

        // Katılımcı kontrolü
        if (!conversation.participants.includes(req.user._id)) {
            return res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok.' });
        }

        const message = new Message({
            conversation: conversationId,
            sender: req.user._id,
            content
        });

        await message.save();

        // Konuşmanın son mesajını güncelle
        conversation.lastMessage = message._id;
        await conversation.save();

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Konuşmaları Listeleme
const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
            .populate('participants', 'username')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mesajları Listeleme
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        // Konuşma kontrolü
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Konuşma bulunamadı.' });
        }

        // Katılımcı kontrolü
        if (!conversation.participants.includes(req.user._id)) {
            return res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok.' });
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'username')
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createConversation,
    sendMessage,
    getConversations,
    getMessages
}; 