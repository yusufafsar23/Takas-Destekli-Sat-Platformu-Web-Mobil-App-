import api from './api';

const userService = {
  // Kullanıcı profil bilgilerini getirme
  async getUserProfile(userId) {
    try {
      const response = await api.get(`/users/${userId}/profile`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı adreslerini getirme
  async getUserAddresses() {
    try {
      const response = await api.get('/users/addresses');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı adresini ekleme
  async addUserAddress(addressData) {
    try {
      const response = await api.post('/users/addresses', addressData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı adresini güncelleme
  async updateUserAddress(addressId, addressData) {
    try {
      const response = await api.put(`/users/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı adresini silme
  async deleteUserAddress(addressId) {
    try {
      const response = await api.delete(`/users/addresses/${addressId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı bildirim ayarlarını getirme
  async getNotificationSettings() {
    try {
      const response = await api.get('/users/notification-settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı bildirim ayarlarını güncelleme
  async updateNotificationSettings(settingsData) {
    try {
      const response = await api.put('/users/notification-settings', settingsData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı değerlendirmelerini getirme
  async getUserReviews(userId) {
    try {
      const response = await api.get(`/users/${userId}/reviews`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı değerlendirmesi ekleme
  async addUserReview(userId, reviewData) {
    try {
      const response = await api.post(`/users/${userId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default userService; 