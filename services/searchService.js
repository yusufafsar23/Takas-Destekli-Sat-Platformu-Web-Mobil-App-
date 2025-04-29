import api from './api';

const searchService = {
  // Genel arama
  async search(query, options = {}) {
    try {
      const response = await api.get('/search', { 
        params: { 
          q: query,
          ...options
        } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Ürün araması
  async searchProducts(query, filters = {}) {
    try {
      const response = await api.get('/search/products', { 
        params: { 
          q: query,
          ...filters 
        } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı araması
  async searchUsers(query) {
    try {
      const response = await api.get('/search/users', { 
        params: { q: query } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kategori araması
  async searchCategories(query) {
    try {
      const response = await api.get('/search/categories', { 
        params: { q: query } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Gelişmiş arama önerilerini getirme
  async getAutocompleteSuggestions(query) {
    try {
      const response = await api.get('/search/autocomplete', { 
        params: { q: query } 
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Arama geçmişini getirme
  async getSearchHistory() {
    try {
      const response = await api.get('/search/history');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Arama geçmişini temizleme
  async clearSearchHistory() {
    try {
      const response = await api.delete('/search/history');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default searchService; 