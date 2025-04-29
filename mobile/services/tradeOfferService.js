import api from './api';

// Gönderilen ve alınan tüm takas tekliflerini getirme (Admin)
const getAllTradeOffers = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.userId) queryParams.append('userId', filters.userId);
  if (filters.productId) queryParams.append('productId', filters.productId);
  
  const url = `/trade-offers/all?${queryParams.toString()}`;
  const response = await api.get(url);
  return response.data;
};

// Gönderilen takas tekliflerini getirme
const getSentTradeOffers = async (status) => {
  const url = status ? `/trade-offers/sent?status=${status}` : '/trade-offers/sent';
  const response = await api.get(url);
  return response.data;
};

// Alınan takas tekliflerini getirme
const getReceivedTradeOffers = async (status) => {
  const url = status ? `/trade-offers/received?status=${status}` : '/trade-offers/received';
  const response = await api.get(url);
  return response.data;
};

// Kullanıcı takas geçmişini getirme
const getUserTradeHistory = async () => {
  const response = await api.get('/trade-offers/history');
  return response.data;
};

// Diğer kullanıcının takas geçmişini getirme (Admin)
const getOtherUserTradeHistory = async (userId) => {
  const response = await api.get(`/trade-offers/user/${userId}/history`);
  return response.data;
};

// Takas teklifi detayını getirme
const getTradeOfferById = async (id) => {
  const response = await api.get(`/trade-offers/${id}`);
  return response.data;
};

// Takas teklifi gönderme
const createTradeOffer = async (offerData) => {
  const response = await api.post('/trade-offers', offerData);
  return response.data;
};

// Karşı teklif gönderme
const createCounterOffer = async (counterOfferData) => {
  const response = await api.post('/trade-offers/counter-offer', counterOfferData);
  return response.data;
};

// Takas teklifini kabul etme
const acceptTradeOffer = async (id, responseMessage) => {
  const response = await api.put(`/trade-offers/${id}/accept`, { responseMessage });
  return response.data;
};

// Takas teklifini reddetme
const rejectTradeOffer = async (id, responseMessage) => {
  const response = await api.put(`/trade-offers/${id}/reject`, { responseMessage });
  return response.data;
};

// Takas teklifini iptal etme
const cancelTradeOffer = async (id) => {
  const response = await api.put(`/trade-offers/${id}/cancel`);
  return response.data;
};

// Takas işlemini tamamlama
const completeTradeOffer = async (id) => {
  const response = await api.put(`/trade-offers/${id}/complete`);
  return response.data;
};

// Ürün için akıllı eşleştirmeleri getirme
const getSmartMatchesForProduct = async (productId) => {
  const response = await api.get(`/trade-offers/smart-matches/${productId}`);
  return response.data;
};

const tradeOfferService = {
  getAllTradeOffers,
  getSentTradeOffers,
  getReceivedTradeOffers,
  getUserTradeHistory,
  getOtherUserTradeHistory,
  getTradeOfferById,
  createTradeOffer,
  createCounterOffer,
  acceptTradeOffer,
  rejectTradeOffer,
  cancelTradeOffer,
  completeTradeOffer,
  getSmartMatchesForProduct
};

export default tradeOfferService; 