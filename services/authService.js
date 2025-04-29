import api from './api';

const authService = {
  // Kullanıcı girişi
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı kaydı
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı çıkışı
  async logout() {
    try {
      await api.post('/auth/logout');
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Şifremi unuttum
  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Şifre sıfırlama
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Email doğrulama
  async verifyEmail(token) {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Profil güncelleme
  async updateProfile(profileData) {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Şifre değiştirme
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı bilgilerini alma
  async getCurrentUser() {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Token doğrulama
  async validateToken(token) {
    try {
      const response = await api.post('/auth/validate-token', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default authService; 