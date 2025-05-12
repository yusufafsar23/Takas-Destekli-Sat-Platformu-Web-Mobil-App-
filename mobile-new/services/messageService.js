import api from './api';

const messageService = {
  // Tüm konuşmaları getirme
  async getConversations() {
    try {
      const response = await api.get('/messages/conversations');
      return response.data;
    } catch (error) {
      throw error;
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
      return response.data;
    } catch (error) {
      throw error;
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
      return response.data;
    } catch (error) {
      throw error;
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
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mesajları okundu olarak işaretleme
  async markAsRead(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Konuşmayı arşivleme
  async archiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/archive`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Konuşmayı arşivden çıkarma
  async unarchiveConversation(conversationId) {
    try {
      const response = await api.put(`/messages/conversations/${conversationId}/unarchive`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Okunmamış mesaj sayısını getirme
  async getUnreadCount() {
    try {
      const response = await api.get('/messages/unread/count');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mesaj arama
  async searchMessages(query) {
    try {
      const response = await api.get('/messages/search', { params: { q: query } });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default messageService; 