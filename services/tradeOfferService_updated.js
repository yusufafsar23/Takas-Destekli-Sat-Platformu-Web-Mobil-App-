import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Backend API temel URL
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
  
  // Endpoint'leri sırayla deneme
  let lastError = null;
  for (const endpoint of endpointPaths) {
    try {
      console.log(`TradeOfferService: Trying endpoint: ${endpoint}`);
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.status === 200) {
        console.log(`TradeOfferService: Success with endpoint: ${endpoint}`);
        console.log('TradeOfferService: Response data type:', typeof response.data);
        console.log('TradeOfferService: Response data structure:', 
          Array.isArray(response.data) ? 'Array' : 
          response.data.sent ? 'Object with sent/received properties' : 'Other object');
        
        // Veri formatını analiz et
        if (Array.isArray(response.data)) {
          console.log(`TradeOfferService: Found ${response.data.length} trades in array`);
          
          // Kullanıcı filtreleme gerekiyorsa
          if (userId) {
            return filterTradesForUser(response.data, userId);
          } else {
            const currentUser = await getCurrentUserId();
            if (!currentUser.id) throw new Error('No current user ID available');
            return filterTradesForUser(response.data, currentUser.id); 
          }
        } else if (response.data.sent || response.data.received || response.data.completed) {
          console.log('TradeOfferService: Response already has sent/received/completed structure');
          return {
            success: true,
            sent: response.data.sent || [],
            received: response.data.received || [],
            completed: response.data.completed || []
          };
        } else if (response.data.trades) {
          console.log(`TradeOfferService: Found trades in data.trades with ${response.data.trades.length} items`);
          // Trades özelliğini kontrol et ve işle
          const trades = response.data.trades;
          if (userId) {
            return filterTradesForUser(trades, userId);
          } else {
            const currentUser = await getCurrentUserId();
            if (!currentUser.id) throw new Error('No current user ID available');
            return filterTradesForUser(trades, currentUser.id);
          }
        } else if (response.data.data && (Array.isArray(response.data.data) || response.data.data.trades)) {
          console.log('TradeOfferService: Found trades in data.data');
          const tradeData = Array.isArray(response.data.data) ? response.data.data : response.data.data.trades;
          if (userId) {
            return filterTradesForUser(tradeData, userId);
          } else {
            const currentUser = await getCurrentUserId();
            if (!currentUser.id) throw new Error('No current user ID available');
            return filterTradesForUser(tradeData, currentUser.id);
          }
        } else {
          console.log('TradeOfferService: Unknown response format, trying to inspect for trade data');
          // İçeriği kaba kuvvetle incele
          let possibleTrades = null;
          
          // Cevabın içindeki ilk dizi veya "trades" gibi bir özelliği bul
          Object.keys(response.data).forEach(key => {
            if (Array.isArray(response.data[key])) {
              console.log(`TradeOfferService: Found array in response.data.${key} with ${response.data[key].length} items`);
              possibleTrades = response.data[key];
            }
          });
          
          if (possibleTrades && possibleTrades.length > 0) {
            console.log('TradeOfferService: Using found trades array');
            if (userId) {
              return filterTradesForUser(possibleTrades, userId);
            } else {
              const currentUser = await getCurrentUserId();
              if (!currentUser.id) throw new Error('No current user ID available');
              return filterTradesForUser(possibleTrades, currentUser.id);
            }
          }
          
          // Anlayamıyorsak veriyi olduğu gibi döndür, en azından debug için görelim
          console.log('TradeOfferService: Returning raw response for debugging:', JSON.stringify(response.data).substring(0, 200) + '...');
          return {
            success: true,
            raw: response.data,
            sent: [],
            received: [],
            completed: []
          };
        }
      }
    } catch (error) {
      lastError = error;
      console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
    }
  }
  
  // Tüm endpoint'ler başarısız olduysa son hatayı fırlat
  throw lastError || new Error('All trade offer endpoints failed');
};

// Mevcut kullanıcı ID'sini al
const getCurrentUserId = async () => {
  try {
    // Kullanıcı verilerini AsyncStorage'dan al
    const keys = ['user', 'user_data', 'userData'];
    let userData = null;
    
    for (const key of keys) {
      const storedData = await AsyncStorage.getItem(key);
      if (storedData) {
        try {
          userData = JSON.parse(storedData);
          break;
        } catch (e) {
          console.error(`TradeOfferService: Error parsing ${key}:`, e);
        }
      }
    }
    
    if (!userData) {
      throw new Error('No user data found in storage');
    }
    
    // ID'yi normalize et
    const userId = userData.id || userData._id;
    if (!userId) {
      throw new Error('No user ID found in user data');
    }
    
    return { id: userId, userData };
  } catch (error) {
    console.error('TradeOfferService: Error getting current user ID:', error);
    return { id: null, error };
  }
};

// Takas tekliflerini kullanıcı için filtrele
const filterTradesForUser = (trades, userId) => {
  if (!Array.isArray(trades)) {
    console.error('TradeOfferService: Trades is not an array in filterTradesForUser');
    return {
      success: true,
      sent: [],
      received: [],
      completed: []
    };
  }
  
  console.log(`TradeOfferService: Filtering ${trades.length} trades for user ${userId}`);
  
  // Örnek olarak ilk birkaç ticaret verisi incele
  if (trades.length > 0) {
    const sample = trades[0];
    console.log('TradeOfferService: Sample trade structure:', Object.keys(sample).join(', '));
    console.log('TradeOfferService: Sample trade (first entry):', JSON.stringify(sample).substring(0, 300));
  }
  
  // ID normalleştirme fonksiyonu
  const normalizeId = (id) => {
    if (!id) return '';
    return typeof id === 'string' ? id : id.toString();
  };
  
  // Kullanıcı ID'sini normalize et
  const normalizedUserId = normalizeId(userId);
  console.log(`TradeOfferService: Normalized user ID: ${normalizedUserId}`);
  
  // Takas tekliflerini filtrele - geniş bir eşleşme algoritması kullanarak
  const sent = trades.filter(trade => {
    const match = normalizeId(trade.offeredBy) === normalizedUserId || 
                  normalizeId(trade.sender) === normalizedUserId ||
                  normalizeId(trade.senderId) === normalizedUserId ||
                  (trade.userId && normalizeId(trade.userId) === normalizedUserId && trade.type === 'sent');
    return match;
  });
  
  const received = trades.filter(trade => {
    const match = normalizeId(trade.requestedFrom) === normalizedUserId || 
                 normalizeId(trade.receiver) === normalizedUserId ||
                 normalizeId(trade.receiverId) === normalizedUserId ||
                 (trade.userId && normalizeId(trade.userId) === normalizedUserId && trade.type === 'received');
    return match;
  });
  
  const completed = trades.filter(trade => {
    const isMine = normalizeId(trade.offeredBy) === normalizedUserId || 
                  normalizeId(trade.requestedFrom) === normalizedUserId ||
                  normalizeId(trade.sender) === normalizedUserId ||
                  normalizeId(trade.senderId) === normalizedUserId ||
                  normalizeId(trade.receiver) === normalizedUserId ||
                  normalizeId(trade.receiverId) === normalizedUserId ||
                  (normalizeId(trade.userId) === normalizedUserId);
    
    const isCompleted = trade.status === 'completed' || trade.status === 'accepted';
    
    return isMine && isCompleted;
  });
  
  console.log(`TradeOfferService: Filtered results - Sent: ${sent.length}, Received: ${received.length}, Completed: ${completed.length}`);
  
  return {
    success: true,
    sent,
    received,
    completed
  };
};

// API fonksiyonları
const getAllTradeOffers = async () => {
  try {
    const endpoints = ['/api/tradeoffers', '/tradeoffers', '/api/trade-offers', '/trade-offers'];
    const response = await tryMultipleEndpoints(endpoints);
    return response;
  } catch (error) {
    console.error('TradeOfferService: Error getting all trade offers:', error);
    throw error;
  }
};

// Gönderilen takas tekliflerini getirme
const getSentTradeOffers = async () => {
  try {
    const endpoints = ['/api/tradeoffers/sent', '/tradeoffers/sent', '/api/trade-offers/sent', '/trade-offers/sent'];
    const response = await tryMultipleEndpoints(endpoints);
    return response.sent || [];
  } catch (error) {
    console.error('TradeOfferService: Error getting sent trade offers:', error);
    throw error;
  }
};

// Alınan takas tekliflerini getirme
const getReceivedTradeOffers = async () => {
  try {
    const endpoints = ['/api/tradeoffers/received', '/tradeoffers/received', '/api/trade-offers/received', '/trade-offers/received'];
    const response = await tryMultipleEndpoints(endpoints);
    return response.received || [];
  } catch (error) {
    console.error('TradeOfferService: Error getting received trade offers:', error);
    throw error;
  }
};

// Takas teklifi detayını getirme
const getTradeOffer = async (id) => {
  try {
    const endpoints = [`/api/tradeoffers/${id}`, `/tradeoffers/${id}`, `/api/trade-offers/${id}`, `/trade-offers/${id}`];
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
      }
    }
    throw new Error(`Could not find trade offer with ID ${id}`);
  } catch (error) {
    console.error(`TradeOfferService: Error getting trade offer ${id}:`, error);
    throw error;
  }
};

// Takas teklifi gönderme
const createTradeOffer = async (offerData) => {
  try {
    const endpoints = ['/api/tradeoffers', '/tradeoffers', '/api/trade-offers', '/trade-offers'];
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, offerData, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (response.status === 200 || response.status === 201) {
          return response.data;
        }
      } catch (error) {
        console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
      }
    }
    throw new Error('Could not create trade offer');
  } catch (error) {
    console.error('TradeOfferService: Error creating trade offer:', error);
    throw error;
  }
};

// Mevcut kullanıcının takas tekliflerini getirme
const getCurrentUserTrades = async () => {
  try {
    console.log('TradeOfferService: Fetching current user trades');
    
    // Alternatif endpointler
    const endpoints = [
      '/api/tradeoffers/me',
      '/tradeoffers/me',
      '/api/trade-offers/me',
      '/trade-offers/me',
      '/api/trades/me',
      '/trades/me',
      '/api/tradeoffers',
      '/tradeoffers',
      '/api/trade-offers',
      '/trade-offers'
    ];
    
    return await tryMultipleEndpoints(endpoints);
  } catch (error) {
    console.error('TradeOfferService: Error getting current user trades:', error);
    throw error;
  }
};

// Belli bir kullanıcının takas tekliflerini getirme
const getUserTrades = async (userId) => {
  try {
    console.log(`TradeOfferService: Fetching trades for user ${userId}`);
    
    // Alternatif endpointler
    const endpoints = [
      `/api/tradeoffers/user/${userId}`,
      `/tradeoffers/user/${userId}`,
      `/api/trade-offers/user/${userId}`,
      `/trade-offers/user/${userId}`,
      `/api/trades/user/${userId}`,
      `/trades/user/${userId}`,
      '/api/tradeoffers',
      '/tradeoffers',
      '/api/trade-offers',
      '/trade-offers'
    ];
    
    return await tryMultipleEndpoints(endpoints, userId);
  } catch (error) {
    console.error(`TradeOfferService: Error getting trades for user ${userId}:`, error);
    throw error;
  }
};

// Diğer takas işlemleri
const acceptTradeOffer = async (id, responseMessage) => {
  try {
    const endpoints = [
      `/api/tradeoffers/${id}/accept`, 
      `/tradeoffers/${id}/accept`, 
      `/api/trade-offers/${id}/accept`, 
      `/trade-offers/${id}/accept`
    ];
    
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.put(`${API_BASE_URL}${endpoint}`, { responseMessage }, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
      }
    }
    throw new Error(`Could not accept trade offer with ID ${id}`);
  } catch (error) {
    console.error(`TradeOfferService: Error accepting trade offer ${id}:`, error);
    throw error;
  }
};

const rejectTradeOffer = async (id, responseMessage) => {
  try {
    const endpoints = [
      `/api/tradeoffers/${id}/reject`, 
      `/tradeoffers/${id}/reject`, 
      `/api/trade-offers/${id}/reject`, 
      `/trade-offers/${id}/reject`
    ];
    
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.put(`${API_BASE_URL}${endpoint}`, { responseMessage }, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
      }
    }
    throw new Error(`Could not reject trade offer with ID ${id}`);
  } catch (error) {
    console.error(`TradeOfferService: Error rejecting trade offer ${id}:`, error);
    throw error;
  }
};

const cancelTradeOffer = async (id) => {
  try {
    const endpoints = [
      `/api/tradeoffers/${id}/cancel`, 
      `/tradeoffers/${id}/cancel`, 
      `/api/trade-offers/${id}/cancel`, 
      `/trade-offers/${id}/cancel`
    ];
    
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.put(`${API_BASE_URL}${endpoint}`, {}, {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.error(`TradeOfferService: Error with endpoint ${endpoint}:`, error.message);
      }
    }
    throw new Error(`Could not cancel trade offer with ID ${id}`);
  } catch (error) {
    console.error(`TradeOfferService: Error canceling trade offer ${id}:`, error);
    throw error;
  }
};

const tradeOfferService = {
  getAllTradeOffers,
  getSentTradeOffers,
  getReceivedTradeOffers,
  getTradeOffer,
  createTradeOffer,
  acceptTradeOffer,
  rejectTradeOffer,
  cancelTradeOffer,
  getCurrentUserTrades,
  getUserTrades,
  
  // Debug için özel fonksiyonlar
  debugGetEndpoints: async () => {
    try {
      // Mümkün olan tüm endpoint'leri kontrol et ve açık olanları döndür
      const endpoints = [
        '/api/tradeoffers',
        '/tradeoffers',
        '/api/trade-offers',
        '/trade-offers',
        '/api/trades',
        '/trades'
      ];
      
      const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (response.status === 200) {
            results.push({
              endpoint,
              success: true,
              dataType: typeof response.data,
              isArray: Array.isArray(response.data),
              length: Array.isArray(response.data) ? response.data.length : 'not an array',
              sample: Array.isArray(response.data) && response.data.length > 0 ? 
                JSON.stringify(response.data[0]).substring(0, 100) + '...' : 'no sample'
            });
          }
        } catch (error) {
          results.push({
            endpoint,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('TradeOfferService: Error in debugGetEndpoints:', error);
      return { error: error.message };
    }
  }
};

export default tradeOfferService; 