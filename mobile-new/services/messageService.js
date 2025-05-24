import api from './api';

const messageService = {
  // Tüm konuşmaları getirme
  async getConversations() {
    try {
      const response = await api.get('/messages/conversations');
      console.log('Conversations response:', response);
      // API direkt olarak array dönüyor
      return response || [];
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  },

  // Arşivlenmiş konuşmaları getirme
  async getArchivedConversations() {
    try {
      const response = await api.get('/messages/conversations/archived');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bir konuşmanın mesajlarını getirme
  async getConversationMessages(conversationId, params = {}) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`, { params });
      console.log('Messages response:', response);
      // API direkt olarak array dönüyor
      return response || [];
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  },

  // Kullanıcı ile olan konuşmayı getirme veya oluşturma
  async createConversation(participantId, productId, tradeOfferId) {
    try {
      const response = await api.post('/messages/conversations', { 
        participantId, 
        ...(productId && { productId }),
        ...(tradeOfferId && { tradeOfferId })
      });
      return response || {};
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
    }
  },

  // Mesaj gönderme
  async sendMessage(conversationId, text, attachments) {
    try {
      const payload = { text };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }
      const response = await api.post(`/messages/conversations/${conversationId}`, payload);
      return response || {};
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  },

  // Mesajları okundu olarak işaretleme
  async markAsRead(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/read`);
      return response || {};
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return null;
    }
  },

  // Konuşmayı arşivleme
  async archiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/archive`);
      return response || {};
    } catch (error) {
      console.error('Error in archiveConversation:', error);
      return null;
    }
  },

  // Konuşmayı arşivden çıkarma
  async unarchiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/unarchive`);
      return response || {};
    } catch (error) {
      console.error('Error in unarchiveConversation:', error);
      return null;
    }
  },

  // Okunmamış mesaj sayısını getirme
  async getUnreadCount() {
    try {
      const response = await api.get('/messages/unread/count');
      return response || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  },

  // Mesaj arama
  async searchMessages(query) {
    try {
      const response = await api.get('/messages/search', { params: { q: query } });
      return response || [];
    } catch (error) {
      console.error('Error in searchMessages:', error);
      return [];
    }
  }
};

export default messageService; 