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

  // Bir konuşmanın mesajlarını getirme
  async getConversationMessages(conversationId, params = {}) {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı ile olan konuşmayı getirme veya oluşturma
  async getOrCreateConversation(userId) {
    try {
      const response = await api.post('/messages/conversations', { userId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Mesaj gönderme
  async sendMessage(conversationId, content) {
    try {
      const response = await api.post(`/messages/conversations/${conversationId}`, { content });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Medya mesajı gönderme
  async sendMediaMessage(conversationId, media) {
    try {
      const formData = new FormData();
      formData.append('media', media);

      const response = await api.post(`/messages/conversations/${conversationId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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

  // Konuşmayı silme
  async deleteConversation(conversationId) {
    try {
      const response = await api.delete(`/messages/conversations/${conversationId}`);
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