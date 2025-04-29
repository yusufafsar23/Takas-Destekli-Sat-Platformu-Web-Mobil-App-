import api from './api';

const reviewService = {
  // Ürün değerlendirmelerini getirme
  async getProductReviews(productId) {
    try {
      const response = await api.get(`/products/${productId}/reviews`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Ürün değerlendirmesi ekleme
  async addProductReview(productId, reviewData) {
    try {
      const response = await api.post(`/products/${productId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Ürün değerlendirmesi güncelleme
  async updateProductReview(productId, reviewId, reviewData) {
    try {
      const response = await api.put(`/products/${productId}/reviews/${reviewId}`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Ürün değerlendirmesi silme
  async deleteProductReview(productId, reviewId) {
    try {
      const response = await api.delete(`/products/${productId}/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Takas değerlendirmelerini getirme
  async getTradeReviews(tradeId) {
    try {
      const response = await api.get(`/trades/${tradeId}/reviews`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Takas değerlendirmesi ekleme
  async addTradeReview(tradeId, reviewData) {
    try {
      const response = await api.post(`/trades/${tradeId}/reviews`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcının yaptığı değerlendirmeleri getirme
  async getUserGivenReviews() {
    try {
      const response = await api.get('/reviews/given');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcının aldığı değerlendirmeleri getirme
  async getUserReceivedReviews() {
    try {
      const response = await api.get('/reviews/received');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default reviewService; 