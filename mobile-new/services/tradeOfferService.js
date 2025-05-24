import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.61:5000';

// Geliştirilmiş API çağrısı ve hata yakalama fonksiyonu
const tryMultipleEndpoints = async (endpointPaths, userId = null) => {
  console.log(`TradeOfferService: Trying multiple endpoints for ${userId ? `user ${userId}` : 'current user'}`);
  
  // Token alma
  const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
  if (!authToken) {
    console.error('TradeOfferService: No auth token available');
    throw new Error('No auth token available');
  }
  
  // Backend üzerindeki gerçek endpoint'leri ilk sıraya koyalım
  const prioritizedEndpoints = [];
  
  // my-offers endpoint'i getMyTradeOffers controller'ını kullanır ve oldukça güvenilirdir
  endpointPaths.forEach(endpoint => {
    if (endpoint.includes('/my-offers')) {
      prioritizedEndpoints.unshift(endpoint); // En yüksek öncelik
    } else if (endpoint.includes('/history')) {
      prioritizedEndpoints.push(endpoint); // İkinci öncelik
    } else {
      prioritizedEndpoints.push(endpoint); // Normal öncelik
    }
  });
  
  // Endpoint'leri sırayla deneme
  let lastError = null;
  for (const endpoint of prioritizedEndpoints) {
    try {
      // URL'nin /api ile başladığından emin olalım
      const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      console.log(`TradeOfferService: Trying endpoint: ${normalizedEndpoint}`);
      
      const response = await axios.get(`${API_BASE_URL}${normalizedEndpoint}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.status === 200) {
        console.log(`TradeOfferService: Success with endpoint: ${normalizedEndpoint}`);
        console.log(`TradeOfferService: Response data type:`, typeof response.data);
        console.log(`TradeOfferService: Response data format:`, 
          Array.isArray(response.data) 
            ? `Array with ${response.data.length} items` 
            : Object.keys(response.data).join(', '));
            
        // getMyTradeOffers endpoint'inden gelen veriyi kontrol edelim - isSender, isReceiver özellikleri vardır
        if (Array.isArray(response.data) && response.data.length > 0 && 
            (response.data[0].isSender !== undefined || response.data[0].isReceiver !== undefined)) {
          console.log(`TradeOfferService: Found enhanced trade offer format from my-offers endpoint`);
          
          // Backend'in getMyTradeOffers endpoint'inden gelen veriyi sent/received/completed yapısına dönüştür
          const sent = response.data.filter(offer => offer.isSender && !offer.isReceiver && 
                                           offer.status !== 'completed' && offer.status !== 'accepted');
          const received = response.data.filter(offer => !offer.isSender && offer.isReceiver && 
                                              offer.status !== 'completed' && offer.status !== 'accepted');
          const completed = response.data.filter(offer => 
                                              offer.status === 'completed' || offer.status === 'accepted');
          
          console.log(`TradeOfferService: Processed data - Sent: ${sent.length}, Received: ${received.length}, Completed: ${completed.length}`);
          
          return { sent, received, completed };
        }
        
        return response.data;
      }
    } catch (error) {
      lastError = error;
      console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
    }
  }
  
  // Tüm endpoint'ler başarısız olduysa son hatayı fırlat
  throw lastError || new Error('All trade offer endpoints failed');
};

/**
 * API dışı doğrudan erişim için kullanılan fonksiyon 
 * (Backend API erişilemez olduğunda)
 */
const directApiAccess = async (endpoint, method = 'GET', data = null) => {
  try {
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error(`Error in direct API access to ${endpoint}:`, error);
    throw error;
  }
};

// Doğrudan HTTP isteği yapma yardımcı fonksiyonu
const makeRequest = async (url, method, data = {}) => {
  try {
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };

    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      headers
    });

    return response.data;
  } catch (error) {
    console.error(`TradeOfferService: Error in makeRequest ${method} to ${url}:`, error.message);
    throw error;
  }
};

// Bütün HTTP metodlarını deneme
const tryAllHttpMethods = async (url, data = {}) => {
  const methods = ['put', 'post', 'patch'];
  let lastError = null;

  for (const method of methods) {
    try {
      console.log(`TradeOfferService: Trying ${method.toUpperCase()} request to ${url}`);
      const result = await makeRequest(url, method, data);
      console.log(`TradeOfferService: Successful ${method.toUpperCase()} request to ${url}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`TradeOfferService: Failed ${method.toUpperCase()} request to ${url}:`, error.message);
    }
  }

  throw lastError || new Error(`All HTTP methods failed for ${url}`);
};

/**
 * Takas teklifleri ile ilgili servis işlemleri
 */
const tradeOfferService = {
  /**
   * Tüm takas tekliflerini getirir
   */
  getAllTradeOffers: async () => {
    try {
      const endpoints = ['/api/trade-offers/all', '/api/trade-offers', '/api/tradeoffers/all', '/api/tradeoffers'];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error('TradeOfferService: Error getting all trade offers:', error);
      throw error;
    }
  },

  /**
   * Belirli bir takas teklifini getirir
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  getTradeOfferById: async (tradeOfferId) => {
    try {
      const endpoints = [
        `/api/trade-offers/${tradeOfferId}`, 
        `/api/tradeoffers/${tradeOfferId}`
      ];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error(`Error fetching trade offer with ID ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Belirli bir takas teklifini getirir (TradeOfferScreen için)
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  getTradeOffer: async (tradeOfferId) => {
    try {
      const endpoints = [
        `/api/trade-offers/${tradeOfferId}`, 
        `/api/tradeoffers/${tradeOfferId}`
      ];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error(`Error fetching trade offer with ID ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Giriş yapmış kullanıcının gönderdiği takas tekliflerini getirir
   */
  getSentTradeOffers: async () => {
    try {
      const endpoints = ['/api/trade-offers/sent', '/api/tradeoffers/sent'];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error('TradeOfferService: Error getting sent trade offers:', error);
      throw error;
    }
  },

  /**
   * Giriş yapmış kullanıcının aldığı takas tekliflerini getirir
   */
  getReceivedTradeOffers: async () => {
    try {
      const endpoints = ['/api/trade-offers/received', '/api/tradeoffers/received'];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error('TradeOfferService: Error getting received trade offers:', error);
      throw error;
    }
  },

  /**
   * Mevcut kullanıcının takas tekliflerini getirir
   */
  getCurrentUserTrades: async () => {
    try {
      // Alternatif endpointler
      const endpoints = [
        '/api/trade-offers/my-offers',
        '/api/trade-offers/history',
        '/api/trade-offers/sent',
        '/api/trade-offers/received',
        '/api/tradeoffers/my-offers',
        '/api/tradeoffers/history',
        '/api/tradeoffers/sent',
        '/api/tradeoffers/received'
      ];
      
      return await tryMultipleEndpoints(endpoints);
    } catch (error) {
      console.error('TradeOfferService: Error getting current user trades:', error);
      throw error;
    }
  },

  /**
   * Belirli bir kullanıcının takas tekliflerini getirir
   * @param {string} userId - Kullanıcı ID'si
   */
  getUserTrades: async (userId) => {
    try {
      const endpoints = [
        `/api/trade-offers/user/${userId}/history`, 
        `/api/trade-offers/user/${userId}`,
        `/api/tradeoffers/user/${userId}/history`,
        `/api/tradeoffers/user/${userId}`
      ];
      const response = await tryMultipleEndpoints(endpoints);
      return response;
    } catch (error) {
      console.error(`Error fetching trades for user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Yeni bir takas teklifi oluşturur
   * @param {Object} tradeOfferData - Takas teklifi verileri
   */
  createTradeOffer: async (tradeOfferData) => {
    try {
      const response = await makeRequest('/api/trade-offers', 'post', tradeOfferData);
      return response;
    } catch (error) {
      // Birincil endpoint başarısız olursa alternatif endpoint'i dene
      try {
        const response = await makeRequest('/api/tradeoffers', 'post', tradeOfferData);
        return response;
      } catch (secondError) {
        console.error('Error creating trade offer:', secondError);
        throw secondError;
      }
    }
  },

  /**
   * Bir takas teklifini günceller
   * @param {string} tradeOfferId - Takas teklifi ID'si
   * @param {Object} updateData - Güncellenecek veriler
   */
  updateTradeOffer: async (tradeOfferId, updateData) => {
    try {
      const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'put', updateData);
      return response;
    } catch (error) {
      // Birincil endpoint başarısız olursa alternatif endpoint'i dene
      try {
        const response = await makeRequest(`/api/tradeoffers/${tradeOfferId}`, 'put', updateData);
        return response;
      } catch (secondError) {
        console.error(`Error updating trade offer ${tradeOfferId}:`, secondError);
        throw secondError;
      }
    }
  },

  /**
   * Bir takas teklifini kabul eder
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  acceptTradeOffer: async (tradeOfferId) => {
    try {
      // Olası tüm endpoint'leri deneyelim - URL formatlarında değişiklikler yaptık
      const possibleEndpoints = [
        `/api/trade-offers/${tradeOfferId}/accept`,
        `/api/trade-offers/accept/${tradeOfferId}`,
        `/api/tradeoffers/${tradeOfferId}/accept`,
        `/api/tradeoffers/accept/${tradeOfferId}`,
        `/api/trade-offers/${tradeOfferId}/status/accept`,
        `/api/tradeoffers/${tradeOfferId}/status/accept`,
        `/api/trades/${tradeOfferId}/accept`,
        `/api/trade/${tradeOfferId}/accept`,
        `/api/trade-offers/status/${tradeOfferId}/accept`,
        `/api/tradeoffers/status/${tradeOfferId}/accept`,
        `/api/trade-offers/${tradeOfferId}?action=accept`,
        `/api/tradeoffers/${tradeOfferId}?action=accept`,
        `/api/trades/status/${tradeOfferId}/accept`,
        `/api/trades/${tradeOfferId}/status/accept`
      ];
      
      // Endpointleri sırayla deneyelim
      let lastError = null;
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`TradeOfferService: Trying to accept trade offer using endpoint: ${endpoint}`);
          
          // Bütün HTTP metodlarını dene
          try {
            const response = await tryAllHttpMethods(endpoint, {});
            console.log(`TradeOfferService: Successfully accepted trade offer using endpoint: ${endpoint}`);
            return response;
          } catch (methodError) {
            console.log(`TradeOfferService: All HTTP methods failed for ${endpoint}`);
          }
        } catch (error) {
          lastError = error;
          console.error(`TradeOfferService: Error using endpoint ${endpoint}:`, error.message);
        }
      }
      
      // Son çare: Doğrudan status güncelleme
      try {
        console.log('TradeOfferService: Trying direct status update approach with multiple methods');
        
        // PUT metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'put', { 
            status: 'accepted' 
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT');
          return response;
        } catch (putError) {
          console.error('TradeOfferService: PUT update failed:', putError.message);
        }
        
        // PATCH metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'patch', { 
            status: 'accepted' 
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PATCH');
          return response;
        } catch (patchError) {
          console.error('TradeOfferService: PATCH update failed:', patchError.message);
        }
        
        // POST metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}/status`, 'post', { 
            status: 'accepted' 
          });
          console.log('TradeOfferService: Successfully updated trade offer status with POST to /status');
          return response;
        } catch (postError) {
          console.error('TradeOfferService: POST update failed:', postError.message);
        }
        
        // Alternatif endpoint formatları dene
        try {
          const response = await makeRequest(`/api/tradeoffers/${tradeOfferId}`, 'put', { 
            status: 'accepted' 
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT on alternative endpoint');
          return response;
        } catch (altError) {
          console.error('TradeOfferService: Alternative endpoint update failed:', altError.message);
        }
        
        throw new Error('All direct update approaches failed');
      } catch (updateError) {
        console.error('TradeOfferService: All direct updates failed:', updateError.message);
      }
      
      // Son hata
      throw lastError || new Error('All accept endpoints failed');
    } catch (error) {
      console.error(`Error accepting trade offer ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Bir takas teklifini reddeder
   * @param {string} tradeOfferId - Takas teklifi ID'si
   * @param {string} reason - Reddetme nedeni (opsiyonel)
   */
  rejectTradeOffer: async (tradeOfferId, reason = '') => {
    try {
      // Olası tüm endpoint'leri deneyelim - URL formatlarında değişiklikler yaptık
      const possibleEndpoints = [
        `/api/trade-offers/${tradeOfferId}/reject`,
        `/api/trade-offers/reject/${tradeOfferId}`,
        `/api/tradeoffers/${tradeOfferId}/reject`,
        `/api/tradeoffers/reject/${tradeOfferId}`,
        `/api/trade-offers/${tradeOfferId}/status/reject`,
        `/api/tradeoffers/${tradeOfferId}/status/reject`,
        `/api/trades/${tradeOfferId}/reject`,
        `/api/trade/${tradeOfferId}/reject`,
        `/api/trade-offers/status/${tradeOfferId}/reject`,
        `/api/tradeoffers/status/${tradeOfferId}/reject`,
        `/api/trade-offers/${tradeOfferId}?action=reject`,
        `/api/tradeoffers/${tradeOfferId}?action=reject`,
        `/api/trades/status/${tradeOfferId}/reject`,
        `/api/trades/${tradeOfferId}/status/reject`
      ];
      
      // Endpointleri sırayla deneyelim
      let lastError = null;
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`TradeOfferService: Trying to reject trade offer using endpoint: ${endpoint}`);
          
          // Bütün HTTP metodlarını dene
          try {
            const response = await tryAllHttpMethods(endpoint, { reason });
            console.log(`TradeOfferService: Successfully rejected trade offer using endpoint: ${endpoint}`);
            return response;
          } catch (methodError) {
            console.log(`TradeOfferService: All HTTP methods failed for ${endpoint}`);
          }
        } catch (error) {
          lastError = error;
          console.error(`TradeOfferService: Error using endpoint ${endpoint}:`, error.message);
        }
      }
      
      // Son çare: Doğrudan status güncelleme
      try {
        console.log('TradeOfferService: Trying direct status update approach with multiple methods');
        
        // PUT metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'put', { 
            status: 'rejected',
            rejectionReason: reason
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT');
          return response;
        } catch (putError) {
          console.error('TradeOfferService: PUT update failed:', putError.message);
        }
        
        // PATCH metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'patch', { 
            status: 'rejected',
            rejectionReason: reason
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PATCH');
          return response;
        } catch (patchError) {
          console.error('TradeOfferService: PATCH update failed:', patchError.message);
        }
        
        // POST metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}/status`, 'post', { 
            status: 'rejected',
            rejectionReason: reason
          });
          console.log('TradeOfferService: Successfully updated trade offer status with POST to /status');
          return response;
        } catch (postError) {
          console.error('TradeOfferService: POST update failed:', postError.message);
        }
        
        // Alternatif endpoint formatları dene
        try {
          const response = await makeRequest(`/api/tradeoffers/${tradeOfferId}`, 'put', { 
            status: 'rejected',
            rejectionReason: reason
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT on alternative endpoint');
          return response;
        } catch (altError) {
          console.error('TradeOfferService: Alternative endpoint update failed:', altError.message);
        }
        
        throw new Error('All direct update approaches failed');
      } catch (updateError) {
        console.error('TradeOfferService: All direct updates failed:', updateError.message);
      }
      
      // Son hata
      throw lastError || new Error('All reject endpoints failed');
    } catch (error) {
      console.error(`Error rejecting trade offer ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Bir takas teklifini iptal eder
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  cancelTradeOffer: async (tradeOfferId) => {
    try {
      // Olası tüm endpoint'leri deneyelim
      const possibleEndpoints = [
        `/api/trade-offers/${tradeOfferId}/cancel`,
        `/api/trade-offers/cancel/${tradeOfferId}`,
        `/api/tradeoffers/${tradeOfferId}/cancel`,
        `/api/tradeoffers/cancel/${tradeOfferId}`,
        `/api/trade-offers/${tradeOfferId}/status/cancel`,
        `/api/tradeoffers/${tradeOfferId}/status/cancel`,
        `/api/trades/${tradeOfferId}/cancel`,
        `/api/trade/${tradeOfferId}/cancel`,
        `/api/trades/status/${tradeOfferId}/cancel`,
        `/api/trades/${tradeOfferId}/status/cancel`
      ];
      
      // Endpointleri sırayla deneyelim
      let lastError = null;
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`TradeOfferService: Trying to cancel trade offer using endpoint: ${endpoint}`);
          
          // Bütün HTTP metodlarını dene
          try {
            const response = await tryAllHttpMethods(endpoint, {});
            console.log(`TradeOfferService: Successfully cancelled trade offer using endpoint: ${endpoint}`);
            return response;
          } catch (methodError) {
            console.log(`TradeOfferService: All HTTP methods failed for ${endpoint}`);
          }
        } catch (error) {
          lastError = error;
          console.error(`TradeOfferService: Error using endpoint ${endpoint}:`, error.message);
        }
      }
      
      // Son çare: Doğrudan status güncelleme
      try {
        console.log('TradeOfferService: Trying direct status update approach with multiple methods');
        
        // PUT metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'put', { 
            status: 'cancelled'
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT');
          return response;
        } catch (putError) {
          console.error('TradeOfferService: PUT update failed:', putError.message);
        }
        
        // PATCH metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'patch', { 
            status: 'cancelled'
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PATCH');
          return response;
        } catch (patchError) {
          console.error('TradeOfferService: PATCH update failed:', patchError.message);
        }
        
        // POST metodu ile dene
        try {
          const response = await makeRequest(`/api/trade-offers/${tradeOfferId}/status`, 'post', { 
            status: 'cancelled'
          });
          console.log('TradeOfferService: Successfully updated trade offer status with POST to /status');
          return response;
        } catch (postError) {
          console.error('TradeOfferService: POST update failed:', postError.message);
        }
        
        // Alternatif endpoint formatları dene
        try {
          const response = await makeRequest(`/api/tradeoffers/${tradeOfferId}`, 'put', { 
            status: 'cancelled'
          });
          console.log('TradeOfferService: Successfully updated trade offer status with PUT on alternative endpoint');
          return response;
        } catch (altError) {
          console.error('TradeOfferService: Alternative endpoint update failed:', altError.message);
        }
        
        throw new Error('All direct update approaches failed');
      } catch (updateError) {
        console.error('TradeOfferService: All direct updates failed:', updateError.message);
      }
      
      // Son hata
      throw lastError || new Error('All cancel endpoints failed');
    } catch (error) {
      console.error(`Error canceling trade offer ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Bir takas teklifini tamamlandı olarak işaretler
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  completeTradeOffer: async (tradeOfferId) => {
    try {
      const response = await makeRequest(`/api/trade-offers/${tradeOfferId}/complete`, 'put', {});
      return response;
    } catch (error) {
      // Birincil endpoint başarısız olursa alternatif endpoint'i dene
      try {
        const response = await makeRequest(`/api/tradeoffers/${tradeOfferId}/complete`, 'put', {});
        return response;
      } catch (secondError) {
        console.error(`Error completing trade offer ${tradeOfferId}:`, secondError);
        throw secondError;
      }
    }
  },

  /**
   * Karşı takas teklifi oluşturur
   * @param {string} originalTradeOfferId - Orijinal takas teklifi ID'si
   * @param {Object} counterOfferData - Karşı teklif verileri
   */
  createCounterOffer: async (originalTradeOfferId, counterOfferData) => {
    try {
      const response = await makeRequest(`/api/trade-offers/${originalTradeOfferId}/counter`, 'post', counterOfferData);
      return response;
    } catch (error) {
      console.error(`Error creating counter offer for trade ${originalTradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Bir takas teklifini siler
   * @param {string} tradeOfferId - Takas teklifi ID'si
   */
  deleteTradeOffer: async (tradeOfferId) => {
    try {
      const response = await makeRequest(`/api/trade-offers/${tradeOfferId}`, 'delete');
      return response;
    } catch (error) {
      console.error(`Error deleting trade offer ${tradeOfferId}:`, error);
      throw error;
    }
  },

  /**
   * Önbelleği temizler ve tüm takas verilerini yeniden yükler
   */
  refreshTradeOffers: async () => {
    return await tradeOfferService.getCurrentUserTrades();
  },

  // Doğrudan API erişimi
  directApiAccess
};

export default tradeOfferService;