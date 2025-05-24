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

  // Arşivlenmiş konuşmaları getirme
  async getArchivedConversations() {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  },

  // Kullanıcı ile olan konuşmayı getirme veya oluşturma
  async getOrCreateConversation(userId) {
    try {
      const response = await api.post('/messages/conversations', { userId });
      return response.data;
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
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

  // Konuşmayı silme
  async deleteConversation(conversationId) {
    try {
      const response = await api.delete(`/messages/conversations/${conversationId}`);
      return response.data;
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