import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the auth token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Endpoints
export const authService = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  profile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
};

export const productService = {
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export const tradeOfferService = {
  createTradeOffer: (offerData) => api.post('/trade-offers', offerData),
  getMyTradeOffers: () => api.get('/trade-offers/my-offers'),
  getTradeOfferById: (id) => api.get(`/trade-offers/${id}`),
  respondToTradeOffer: (id, response) => api.put(`/trade-offers/${id}/respond`, response),
};

export const messageService = {
  getConversations: () => api.get('/messages/conversations'),
  getArchivedConversations: () => api.get('/messages/conversations/archived'),
  getMessages: (conversationId, params) => api.get(`/messages/conversations/${conversationId}/messages`, { params }),
  createConversation: (participantId, productId, tradeOfferId) => 
    api.post('/messages/conversations', { participantId, productId, tradeOfferId }),
  sendMessage: (conversationId, text, attachments) => 
    api.post(`/messages/conversations/${conversationId}`, { text, attachments }),
  markAsRead: (conversationId) => api.put(`/messages/conversations/${conversationId}/read`),
  archiveConversation: (conversationId) => api.put(`/messages/conversations/${conversationId}/archive`),
  unarchiveConversation: (conversationId) => api.put(`/messages/conversations/${conversationId}/unarchive`),
  getUnreadCount: () => api.get('/messages/unread/count'),
};

export const categoryService = {
  getAllCategories: () => api.get('/categories'),
};

export default api; 