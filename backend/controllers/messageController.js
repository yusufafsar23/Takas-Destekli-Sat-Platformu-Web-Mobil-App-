const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Yeni Konuşma Başlatma
const createConversation = async (req, res) => {
    try {
        const { participantId, productId, tradeOfferId } = req.body;

        // Konuşma kontrolü
        const existingConversation = await Conversation.findOne({
            participants: { $all: [req.user._id, participantId] },
            // Eğer productId veya tradeOfferId belirtildiyse, bunlara göre de filtreleme yap
            ...(productId && { relatedProduct: productId }),
            ...(tradeOfferId && { relatedTradeOffer: tradeOfferId }),
        }).populate('participants', 'username email avatar');

        if (existingConversation) {
            return res.json(existingConversation);
        }

        const conversation = new Conversation({
            participants: [req.user._id, participantId],
            ...(productId && { relatedProduct: productId }),
            ...(tradeOfferId && { relatedTradeOffer: tradeOfferId }),
            unreadCount: { [participantId]: 0 }
        });

        await conversation.save();
        
        // Populate işlemi
        await conversation.populate('participants', 'username email avatar');
        
        res.status(201).json(conversation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Mesaj Gönderme
const sendMessage = async (req, res) => {
    try {
        // conversationId'yi hem URL parametresinden hem de gövdeden alabilir
        const paramConversationId = req.params.conversationId;
        const bodyConversationId = req.body.conversationId;
        const conversationId = paramConversationId || bodyConversationId;
        
        console.log('Received message request:', {
            paramId: paramConversationId,
            bodyId: bodyConversationId,
            finalId: conversationId,
            body: req.body
        });

        if (!conversationId) {
            return res.status(400).json({ error: 'Konuşma ID gereklidir.' });
        }

        const { text, attachments } = req.body;

        // Konuşma kontrolü
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Konuşma bulunamadı.', requestedId: conversationId });
        }

        // Katılımcı kontrolü
        if (!conversation.participants.includes(req.user._id)) {
            return res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok.' });
        }

        // Alıcıyı bulma
        const receiverId = conversation.participants.find(
            participantId => participantId.toString() !== req.user._id.toString()
        );

        const message = new Message({
            conversation: conversationId,
            sender: req.user._id,
            text,
            ...(attachments && { attachments })
        });

        await message.save();

        // Konuşmanın son mesajını ve unreadCount'u güncelle
        conversation.lastMessage = message._id;
        
        // Alıcının okunmamış mesaj sayısını artır
        if (!conversation.unreadCount) {
            conversation.unreadCount = {};
        }
        
        conversation.unreadCount[receiverId] = (conversation.unreadCount[receiverId] || 0) + 1;
        conversation.updatedAt = Date.now();
        
        await conversation.save();

        // Populate işlemi
        await message.populate('sender', 'username email avatar');

        // Socket.io ile karşı tarafa bildirim gönderme
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${receiverId}`).emit('newMessage', {
                ...message.toObject(),
                conversationId,
                receiverId
            });
        }

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Konuşmaları Listeleme
const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id,
            isActive: true
        })
            .populate('participants', 'username email avatar')
            .populate('lastMessage')
            .populate('relatedProduct', 'title photos')
            .populate('relatedTradeOffer', 'status')
            .sort({ updatedAt: -1 });

        // Her konuşma için unreadCount formatını düzenleme
        const formattedConversations = conversations.map(conversation => {
            const { unreadCount, ...rest } = conversation.toObject();
            return {
                ...rest,
                unreadCount: unreadCount ? (unreadCount[req.user._id] || 0) : 0
            };
        });

        res.json(formattedConversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mesajları Listeleme
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;

        // Konuşma kontrolü
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Konuşma bulunamadı.' });
        }

        // Katılımcı kontrolü
        if (!conversation.participants.includes(req.user._id)) {
            return res.status(403).json({ error: 'Bu konuşmaya erişim yetkiniz yok.' });
        }

        // Sorgu oluşturma
        let query = { conversation: conversationId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'username email avatar')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mesajları Okundu Olarak İşaretleme
const markAsRead = async (req, res) => {
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

        // Okunmamış mesajları işaretleme
        await Message.updateMany(
            { 
                conversation: conversationId,
                sender: { $ne: req.user._id },
                read: false
            },
            { read: true }
        );

        // Unread sayısını sıfırlama
        if (conversation.unreadCount && conversation.unreadCount[req.user._id]) {
            conversation.unreadCount[req.user._id] = 0;
            await conversation.save();
        }

        // Socket.io ile karşı tarafa bildirim gönderme
        const receiverId = conversation.participants.find(
            participantId => participantId.toString() !== req.user._id.toString()
        );
        
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${receiverId}`).emit('messagesRead', {
                conversationId,
                userId: req.user._id
            });
        }

        res.json({ success: true, message: 'Mesajlar okundu olarak işaretlendi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Konuşma Arşivleme
const archiveConversation = async (req, res) => {
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

        // Konuşmayı arşivleme (deaktif etme)
        conversation.isActive = false;
        await conversation.save();

        res.json({ success: true, message: 'Konuşma arşivlendi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Arşivden Çıkarma
const unarchiveConversation = async (req, res) => {
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

        // Konuşmayı arşivden çıkarma (aktif etme)
        conversation.isActive = true;
        await conversation.save();

        res.json({ success: true, message: 'Konuşma arşivden çıkarıldı.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Arşivlenmiş Konuşmaları Listeleme
const getArchivedConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: req.user._id,
            isActive: false
        })
            .populate('participants', 'username email avatar')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Okunmamış Mesaj Sayısını Getirme
const getUnreadCount = async (req, res) => {
    try {
        const result = await Conversation.aggregate([
            { $match: { participants: req.user._id, isActive: true } },
            { $project: { 
                unreadCount: { $ifNull: [`$unreadCount.${req.user._id}`, 0] } 
            }},
            { $group: { _id: null, total: { $sum: "$unreadCount" } } }
        ]);

        const totalUnread = result.length > 0 ? result[0].total : 0;
        res.json({ count: totalUnread });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createConversation,
    sendMessage,
    getConversations,
    getMessages,
    markAsRead,
    archiveConversation,
    unarchiveConversation,
    getArchivedConversations,
    getUnreadCount
}; 