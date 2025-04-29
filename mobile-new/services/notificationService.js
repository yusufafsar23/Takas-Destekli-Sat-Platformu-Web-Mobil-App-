import api from './api';

const notificationService = {
  // Tüm bildirimleri getirme
  async getNotifications() {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Okunmamış bildirimleri getirme
  async getUnreadNotifications() {
    try {
      const response = await api.get('/notifications/unread');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Okunmamış bildirim sayısını getirme
  async getUnreadCount() {
    try {
      const response = await api.get('/notifications/unread/count');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bildirimi okuma
  async markAsRead(notificationId) {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tüm bildirimleri okundu olarak işaretleme
  async markAllAsRead() {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bildirimi silme
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tüm bildirimleri silme
  async deleteAllNotifications() {
    try {
      const response = await api.delete('/notifications/all');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default notificationService; 