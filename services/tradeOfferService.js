import api from './api';

// Gönderilen ve alınan tüm takas tekliflerini getirme
const getAllTradeOffers = async () => {
  const response = await api.get('/trade-offers');
  return response.data;
};

// Gönderilen takas tekliflerini getirme
const getSentTradeOffers = async () => {
  const response = await api.get('/trade-offers/sent');
  return response.data;
};

// Alınan takas tekliflerini getirme
const getReceivedTradeOffers = async () => {
  const response = await api.get('/trade-offers/received');
  return response.data;
};

// Takas teklifi detayını getirme
const getTradeOffer = async (id) => {
  const response = await api.get(`/trade-offers/${id}`);
  return response.data;
};

// Takas teklifi gönderme
const createTradeOffer = async (offerData) => {
  const response = await api.post('/trade-offers', offerData);
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

const tradeOfferService = {
  getAllTradeOffers,
  getSentTradeOffers,
  getReceivedTradeOffers,
  getTradeOffer,
  createTradeOffer,
  acceptTradeOffer,
  rejectTradeOffer,
  cancelTradeOffer
};

export default tradeOfferService; 