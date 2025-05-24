import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import tradeOfferService from '../services/tradeOfferService';
import productService from '../services/productService';
import api from '../services/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// Sabit API URL tanımı
const API_BASE_URL = 'http://192.168.1.61:5000';
const API_IMAGE_URL = 'http://192.168.1.61:5000/uploads';

const UserTradesScreen = ({ route, navigation }) => {
  const { userId, initialTradeData } = route.params || {};
  const [trades, setTrades] = useState({
    sent: [],
    received: [],
    completed: []
  });
  const [displayTrades, setDisplayTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [authError, setAuthError] = useState(false);
  const { user, token, refreshUserData, authState, isLoggedIn } = useAuth();
  
  // Ekran her odaklandığında kontrol et
  useFocusEffect(
    React.useCallback(() => {
      // Navigation params'ta refresh parametresi varsa veya
      // initialTradeData değişmişse verileri yeniden yükle
      if (route.params?.refresh) {
        console.log('UserTradesScreen: Refreshing trades due to refresh parameter');
        onRefresh();
        
        // refresh parametresini temizle (bir kere kullanılması için)
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params?.refresh])
  );
  
  // İlk yükleme anında ProfileScreen'den gelen takas verilerini kullan
  useEffect(() => {
    // ProfileScreen'den takas verileri geldiyse onları hemen kullan
    if (initialTradeData && 
        (initialTradeData.sent?.length > 0 || 
         initialTradeData.received?.length > 0 || 
         initialTradeData.completed?.length > 0)) {
      console.log('UserTradesScreen: Using initial trade data from ProfileScreen');
      setTrades(initialTradeData);
      setLoading(false);
    }
  }, [initialTradeData]);
  
  // Doğrudan API'den takas tekliflerini çekme fonksiyonu
  const fetchTradesDirectly = async (userId) => {
    try {
      console.log('UserTradesScreen: Trying to fetch trade offers for user:', userId);
      
      // Önce kullanıcının authentication token'ını al
      const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
      if (!authToken) {
        console.error('UserTradesScreen: No auth token available');
        setAuthError(true);
        return null;
      }
      
      // Try different possible endpoints to find trade offers in the server
      console.log('UserTradesScreen: Attempting to fetch all trade offers from multiple possible endpoints');
      
      // List of potential endpoints to try - backend'de gerçekte olan endpoints
      const potentialEndpoints = [
        // Backend endpoints that should work
        `/api/trade-offers/my-offers`,  // Controller: getMyTradeOffers
        `/api/trade-offers/history`,    // Controller: getUserTradeHistory
        `/api/trade-offers/sent`,       // Controller: getSentTradeOffers
        `/api/trade-offers/received`,   // Controller: getReceivedTradeOffers
        
        // Alternative spelling without hyphen
        `/api/tradeoffers/my-offers`,
        `/api/tradeoffers/history`,
        `/api/tradeoffers/sent`,
        `/api/tradeoffers/received`,
        
        // User-specific endpoints
        `/api/trade-offers/user/${userId}/history`, 
        `/api/tradeoffers/user/${userId}/history`
      ];
      
      // Tüm potansiyel endpointleri tek tek dene
      let tradeData = null;
      let lastError = null;
      let userIdToFilter = userId;
      
      // Kullanıcının kendi ID'sini kullanma durumu
      if (!userIdToFilter && user) {
        userIdToFilter = user.id || user._id;
        console.log('UserTradesScreen: Using current user ID for filtering:', userIdToFilter);
      }
      
      if (!userIdToFilter) {
        console.error('UserTradesScreen: No user ID available for fetching trades');
        setAuthError(true);
        return null;
      }
      
      // ID normalleştirme fonksiyonu
      const normalizeId = (id) => {
        if (!id) return '';
        return typeof id === 'string' ? id : id.toString();
      };
      
      // Takas tekliflerini kullanıcı için filtrele
      const filterTradesForUser = (trades) => {
        if (!Array.isArray(trades)) {
          console.error('UserTradesScreen: Trades is not an array in filterTradesForUser, data type:', typeof trades);
          
          // Obje durumunda ve trades özelliği varsa
          if (typeof trades === 'object' && trades !== null) {
            if (trades.trades && Array.isArray(trades.trades)) {
              console.log('UserTradesScreen: Found trades array in trades.trades');
              return filterTradesForUser(trades.trades);
            }
            
            if (trades.data && Array.isArray(trades.data)) {
              console.log('UserTradesScreen: Found trades array in trades.data');
              return filterTradesForUser(trades.data);
            }
            
            // Doğrudan sent, received, completed yapısındaysa
            if (trades.sent || trades.received || trades.completed) {
              console.log('UserTradesScreen: Data already in sent/received/completed format');
              return {
                sent: Array.isArray(trades.sent) ? trades.sent : [],
                received: Array.isArray(trades.received) ? trades.received : [],
                completed: Array.isArray(trades.completed) ? trades.completed : []
              };
            }
            
            // Herhangi bir dizi bulunmaya çalışılır
            for (const key in trades) {
              if (Array.isArray(trades[key])) {
                console.log(`UserTradesScreen: Found trades array in trades.${key}`);
                return filterTradesForUser(trades[key]);
              }
            }
          }
          
          return { sent: [], received: [], completed: [] };
        }
        
        console.log(`UserTradesScreen: Filtering ${trades.length} trades for user ${userIdToFilter}`);
        
        // Örnek olarak ilk birkaç ticaret verisi incele
        if (trades.length > 0) {
          const sample = trades[0];
          console.log('UserTradesScreen: Sample trade structure:', Object.keys(sample).join(', '));
          
          // Veri yapısını analiz et
          if (sample.isSender !== undefined || sample.isReceiver !== undefined) {
            console.log('UserTradesScreen: Found isSender/isReceiver structure from My-Offers');
            
            // getMyTradeOffers endpoint'inden gelen veri
            const sent = trades.filter(trade => trade.isSender && !trade.isReceiver && 
                                       trade.status !== 'completed' && trade.status !== 'accepted');
            const received = trades.filter(trade => !trade.isSender && trade.isReceiver && 
                                          trade.status !== 'completed' && trade.status !== 'accepted');
            const completed = trades.filter(trade => 
                             (trade.status === 'completed' || trade.status === 'accepted'));
            
            return { sent, received, completed };
          }
        }
        
        // Kullanıcı ID'sini normalize et
        const normalizedUserId = normalizeId(userIdToFilter);
        
        // Takas tekliflerini filtrele - geniş bir eşleşme algoritması kullanarak
        const sent = trades.filter(trade => {
          const match = (normalizeId(trade.offeredBy) === normalizedUserId || 
                       normalizeId(trade.sender) === normalizedUserId ||
                       normalizeId(trade.senderId) === normalizedUserId ||
                      (trade.userId && normalizeId(trade.userId) === normalizedUserId && trade.type === 'sent')) &&
                     (trade.status !== 'completed' && trade.status !== 'accepted');
          return match;
        });
        
        const received = trades.filter(trade => {
          const match = (normalizeId(trade.requestedFrom) === normalizedUserId || 
                       normalizeId(trade.receiver) === normalizedUserId ||
                       normalizeId(trade.receiverId) === normalizedUserId ||
                      (trade.userId && normalizeId(trade.userId) === normalizedUserId && trade.type === 'received')) &&
                     (trade.status !== 'completed' && trade.status !== 'accepted');
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
        
        console.log(`UserTradesScreen: Filtered results - Sent: ${sent.length}, Received: ${received.length}, Completed: ${completed.length}`);
        
        return { sent, received, completed };
      };
      
      // Birden çok endpoint'i deneme fonksiyonu
      const tryEndpoints = async () => {
      for (const endpoint of potentialEndpoints) {
        try {
          console.log(`UserTradesScreen: Trying endpoint: ${endpoint}`);
            
            // API çağrısı yap
            const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
            if (response.status === 200 && response.data) {
            console.log(`UserTradesScreen: Success with endpoint: ${endpoint}`);
            console.log('UserTradesScreen: Response data type:', typeof response.data);
              console.log('UserTradesScreen: Response keys:', Array.isArray(response.data) 
                ? 'Is Array with length: ' + response.data.length 
                : Object.keys(response.data).join(', '));
            
            // Veri formatını analiz et
            if (Array.isArray(response.data)) {
              console.log(`UserTradesScreen: Found ${response.data.length} trades in array`);
                return filterTradesForUser(response.data);
            } else if (response.data.sent || response.data.received || response.data.completed) {
              console.log('UserTradesScreen: Response already has sent/received/completed structure');
                return {
                sent: response.data.sent || [],
                received: response.data.received || [],
                completed: response.data.completed || []
              };
            } else if (response.data.trades) {
              console.log(`UserTradesScreen: Found trades in data.trades with ${response.data.trades.length} items`);
                return filterTradesForUser(response.data.trades);
              } else if (response.data.data) {
              console.log('UserTradesScreen: Found trades in data.data');
                return filterTradesForUser(response.data.data);
            } else {
                console.log('UserTradesScreen: Unknown response format, attempting to parse');
                return filterTradesForUser(response.data);
            }
          }
        } catch (error) {
          lastError = error;
          console.error(`UserTradesScreen: Error with endpoint ${endpoint}:`, error.message);
        }
      }
      
        // Tüm endpoint'ler başarısız olduysa
        throw lastError || new Error('Could not fetch trade offers from any endpoint');
      };
      
      // Endpoint'leri dene
      const result = await tryEndpoints();
      
      if (result) {
        return result;
      } else {
        throw new Error('No valid trade data found in response');
      }
    } catch (error) {
      console.error('UserTradesScreen: Error in fetchTradesDirectly:', error);
      throw error;
    }
  };

  // Ana veri çekme fonksiyonu
  const fetchTrades = async () => {
    // Eğer halihazırda ProfileScreen'den gelen veriler varsa ve yenileme yapılmıyorsa
    // veri çekmeyi atla (sadece refreshing true ise veya initialTradeData yoksa veri çek)
    if (initialTradeData && 
        !refreshing && 
        (initialTradeData.sent?.length > 0 || 
         initialTradeData.received?.length > 0 || 
         initialTradeData.completed?.length > 0)) {
      console.log('UserTradesScreen: Skipping fetchTrades, using initialTradeData');
      return;
    }
    
    setLoading(true);
    try {
      // Determine user ID to fetch trades for
      const targetUserId = userId || (user ? (user.id || user._id) : null);
      setIsCurrentUser(!userId || (user && (userId === user.id || userId === user._id)));
      
      console.log('UserTradesScreen: Fetching trades for userId:', targetUserId);
      
      if (!targetUserId) {
        console.error('UserTradesScreen: No target user ID available for fetching trades');
        setAuthError(true);
        return;
      }
      
      try {
        // Önce tradeOfferService'i kullanmayı dene
        console.log('UserTradesScreen: Attempting to fetch trades using tradeOfferService');
        let serviceResult;
        try {
          if (userId) {
            serviceResult = await tradeOfferService.getUserTrades(targetUserId);
          } else {
            serviceResult = await tradeOfferService.getCurrentUserTrades();
          }
          
          // Veriyi kontrol et
          if (serviceResult) {
            console.log('UserTradesScreen: Service result type:', typeof serviceResult);
            console.log('UserTradesScreen: Service result keys:', Object.keys(serviceResult).join(', '));
            
            // Veri formatını düzeltelim
            const normalizeTradeData = (data) => {
              // Eğer veri zaten doğru formattaysa
              if (data.sent || data.received || data.completed) {
                return {
                  sent: Array.isArray(data.sent) ? data.sent : [],
                  received: Array.isArray(data.received) ? data.received : [],
                  completed: Array.isArray(data.completed) ? data.completed : []
                };
              }
              
              // Eğer veri bir diziyse
              if (Array.isArray(data)) {
                // ID normalleştirme fonksiyonu
                const normalizeId = (id) => {
                  if (!id) return '';
                  return typeof id === 'string' ? id : id.toString();
                };
                
                const normalizedUserId = normalizeId(targetUserId);
                
                // Gönderilen, alınan ve tamamlanan teklifleri ayır
                const sent = data.filter(trade => {
                  return (normalizeId(trade.offeredBy) === normalizedUserId || 
                          normalizeId(trade.sender) === normalizedUserId ||
                          normalizeId(trade.senderId) === normalizedUserId) &&
                        trade.status !== 'completed' && trade.status !== 'accepted';
                });
                
                const received = data.filter(trade => {
                  return (normalizeId(trade.requestedFrom) === normalizedUserId || 
                          normalizeId(trade.receiver) === normalizedUserId ||
                          normalizeId(trade.receiverId) === normalizedUserId) &&
                         trade.status !== 'completed' && trade.status !== 'accepted';
                });
                
                const completed = data.filter(trade => {
                  const isMine = normalizeId(trade.offeredBy) === normalizedUserId || 
                               normalizeId(trade.requestedFrom) === normalizedUserId ||
                               normalizeId(trade.sender) === normalizedUserId ||
                               normalizeId(trade.senderId) === normalizedUserId ||
                               normalizeId(trade.receiver) === normalizedUserId ||
                               normalizeId(trade.receiverId) === normalizedUserId;
                  
                  return isMine && (trade.status === 'completed' || trade.status === 'accepted');
                });
                
                return { sent, received, completed };
              }
              
              // Veri yapısını bulamadıysak
              console.error('UserTradesScreen: Unknown trade data format:', data);
              return { sent: [], received: [], completed: [] };
            };
            
            const normalizedData = normalizeTradeData(serviceResult);
            console.log('UserTradesScreen: Normalized data -', 
              `Sent: ${normalizedData.sent.length}`,
              `Received: ${normalizedData.received.length}`,
              `Completed: ${normalizedData.completed.length}`);
              
            setTrades(normalizedData);
        } else {
            throw new Error('No trade data found in service response');
          }
        } catch (innerError) {
          console.error('UserTradesScreen: Error processing service result:', innerError);
          throw new Error('Error processing service result');
        }
      } catch (serviceError) {
        console.error('UserTradesScreen: Error using tradeOfferService, trying direct API call:', serviceError);
        
        // Servis başarısız olursa doğrudan API çağrısı yap
        const apiResult = await fetchTradesDirectly(targetUserId);
        
        if (apiResult) {
          console.log('UserTradesScreen: Successfully fetched trades using direct API call');
          setTrades(apiResult);
        } else {
          throw new Error('Direct API call returned invalid data');
        }
      }
    } catch (error) {
      console.error('UserTradesScreen: Error fetching trades:', error);
      if (error.response?.status === 401 || error.message?.includes('auth')) {
        setAuthError(true);
      }
      setTrades({ sent: [], received: [], completed: [] });
    } finally {
      setLoading(false);
    }
  };
  
  // Filtreleri uygulama
  const filterTrades = (tradeObj, filterType) => {
    let result = [];
    
    switch (filterType) {
      case 'sent':
        result = tradeObj.sent.map(trade => ({ ...trade, type: 'sent' }));
        break;
      case 'received':
        result = tradeObj.received.map(trade => ({ ...trade, type: 'received' }));
        break;
      case 'completed':
        result = tradeObj.completed.map(trade => ({ ...trade, type: 'completed' }));
        break;
      case 'all':
      default:
        result = [
          ...tradeObj.sent.map(trade => ({ ...trade, type: 'sent' })),
          ...tradeObj.received.map(trade => ({ ...trade, type: 'received' })),
          ...tradeObj.completed.map(trade => ({ ...trade, type: 'completed' }))
        ];
    }
    
    setDisplayTrades(result);
  };
  
  // Filtre butonları komponenti
  const FilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, activeFilter === 'all' && styles.activeFilterButton]}
        onPress={() => setActiveFilter('all')}
      >
        <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
          Tümü ({trades.sent.length + trades.received.length + trades.completed.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, activeFilter === 'sent' && styles.activeFilterButton]}
        onPress={() => setActiveFilter('sent')}
      >
        <Text style={[styles.filterText, activeFilter === 'sent' && styles.activeFilterText]}>
          Gönderilen ({trades.sent.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, activeFilter === 'received' && styles.activeFilterButton]}
        onPress={() => setActiveFilter('received')}
      >
        <Text style={[styles.filterText, activeFilter === 'received' && styles.activeFilterText]}>
          Alınan ({trades.received.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, activeFilter === 'completed' && styles.activeFilterButton]}
        onPress={() => setActiveFilter('completed')}
      >
        <Text style={[styles.filterText, activeFilter === 'completed' && styles.activeFilterText]}>
          Tamamlanan ({trades.completed.length})
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  // Set up initial data load
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      if (!isLoggedIn) {
        // User is not authenticated or missing user ID
        console.log('UserTradesScreen: User is not authenticated, attempting refresh');
        
        // Try to refresh user data
        if (refreshUserData) {
          try {
            console.log('UserTradesScreen: Attempting to refresh user data');
            const refreshedUser = await refreshUserData();
            
            // Check if refresh was successful
            if (!refreshedUser || !refreshedUser._id) {
              console.log('UserTradesScreen: User refresh failed, prompting login');
              Alert.alert(
                'Oturum Hatası',
                'Kullanıcı bilgilerinize erişilemiyor. Lütfen tekrar giriş yapın.',
                [
                  { 
                    text: 'Giriş Yap', 
                    onPress: () => navigation.navigate('Login', { 
                      returnScreen: 'UserTrades',
                      returnParams: route.params
                    }) 
                  },
                  { 
                    text: 'İptal', 
                    style: 'cancel'
                  }
                ]
              );
              return;
            }
            
            console.log('UserTradesScreen: User refresh successful, loading trades');
            fetchTrades();
          } catch (error) {
            console.error('UserTradesScreen: Error refreshing user data:', error);
            
            Alert.alert(
              'Oturum Hatası',
              'Kullanıcı bilgilerinize erişilemiyor. Lütfen tekrar giriş yapın.',
              [
                { 
                  text: 'Giriş Yap', 
                  onPress: () => navigation.navigate('Login', { 
                    returnScreen: 'UserTrades',
                    returnParams: route.params
                  }) 
                },
                { 
                  text: 'İptal', 
                  style: 'cancel'
                }
              ]
            );
          }
        } else {
          // No refresh function available, just redirect to login
          Alert.alert(
            'Oturum Hatası',
            'Takas tekliflerinizi görüntülemek için giriş yapmalısınız.',
            [
              { 
                text: 'Giriş Yap', 
                onPress: () => navigation.navigate('Login', { 
                  returnScreen: 'UserTrades',
                  returnParams: route.params
                }) 
              },
              { 
                text: 'İptal', 
                style: 'cancel'
              }
            ]
          );
          return;
        }
      } else {
        // User is already authenticated, load trades
        // Eğer ProfileScreen'den gelen veriler yoksa yeni veri çek
        if (!initialTradeData || 
            (initialTradeData.sent?.length === 0 && 
             initialTradeData.received?.length === 0 && 
             initialTradeData.completed?.length === 0)) {
        fetchTrades();
        }
      }
    };
    
    checkAuthAndLoadData();
  }, [userId, isLoggedIn, authState]);

  // Handle auth errors from fetch trades
  useEffect(() => {
    if (authError) {
      console.log('UserTradesScreen: Handling auth error');
      Alert.alert(
        'Oturum Hatası',
        'Kullanıcı bilgilerinize erişilemiyor. Lütfen tekrar giriş yapın.',
        [
          { 
            text: 'Giriş Yap', 
            onPress: () => navigation.navigate('Login', { 
              returnScreen: 'UserTrades',
              returnParams: route.params
            }) 
          },
          { 
            text: 'İptal', 
            style: 'cancel'
          }
        ]
      );
    }
  }, [authError]);

  // Apply filter when activeFilter changes
  useEffect(() => {
    if (trades) {
      filterTrades(trades, activeFilter);
    }
  }, [activeFilter, trades]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    
    // Check authentication before refreshing
    if (!isLoggedIn) {
      console.log('UserTradesScreen: User not authenticated during refresh, attempting refresh');
      try {
        const refreshedUser = await refreshUserData();
        if (!refreshedUser) {
          setAuthError(true);
        } else {
          await fetchTrades();
        }
      } catch (error) {
        console.error('Error refreshing user during pull-to-refresh:', error);
        setAuthError(true);
      }
    } else {
      await fetchTrades();
    }
    
    setRefreshing(false);
  };
  
  const handleTradePress = (trade) => {
    navigation.navigate('TradeOfferDetail', { tradeId: trade.id || trade._id });
  };
  
  const getStatusColor = (type) => {
    switch (type) {
      case 'sent':
        return '#FF9800'; // Orange
      case 'received':
        return '#2196F3'; // Blue
      case 'completed':
        return '#4CAF50'; // Green
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Ürün detaylarını alma
  const getProductDetails = async (productId) => {
    try {
      // Farklı formatları kontrol et
      const normalizedProductId = typeof productId === 'object' ? productId.id || productId._id : productId;
      
      if (!normalizedProductId) {
        return null;
      }
      
      const product = await productService.getProductDetails(normalizedProductId);
      return product;
    } catch (error) {
      console.error(`Error getting product details for ID ${productId}:`, error);
      return null;
    }
  };
  
  // Empty state component improved
  const EmptyTradesView = ({ isCurrentUser, activeFilter }) => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={authError ? "alert-circle-outline" : "swap-horizontal-outline"} 
        size={60} 
        color={authError ? "#ff6b6b" : "#ccc"} 
      />
      <Text style={styles.emptyText}>
        {authError 
          ? 'Oturum hatası. Kullanıcı bilgilerinize erişilemiyor.'
          : isCurrentUser 
              ? activeFilter !== 'all' 
                  ? `Henüz ${activeFilter === 'sent' ? 'gönderilen' : activeFilter === 'received' ? 'alınan' : 'tamamlanan'} takas teklifiniz bulunmamaktadır.`
                  : 'Henüz takas teklifiniz bulunmamaktadır.'
              : 'Bu kullanıcının henüz takas teklifi bulunmamaktadır.'}
      </Text>
      {authError ? (
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login', { 
            returnScreen: 'UserTrades',
            returnParams: route.params
          })}
        >
          <Text style={styles.loginButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRefresh}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  // Loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Takaslar Yükleniyor...</Text>
      </View>
    );
  }

  // Takas kartı render etme fonksiyonu
  const renderTradeItem = ({ item }) => {
    // Null/undefined kontrolü
    if (!item) {
      console.error('renderTradeItem: item is null or undefined');
      return null;
    }
    
    // Takas durumunu belirleme
    const getStatusText = (item) => {
      switch (item.status) {
        case 'pending':
          return item.type === 'sent' ? 'Bekliyor' : 'Onay Bekliyor';
        case 'rejected':
          return 'Reddedildi';
        case 'cancelled':
          return 'İptal Edildi';
        case 'accepted':
        case 'completed':
          return 'Tamamlandı';
        default:
          return 'Bilinmeyen';
      }
    };

    // Ürünlerin verileri - popüle edilmiş ürün bilgisini kullan veya ID'yi göster
    // Teklif edilen ürün (benim ürünüm veya bana gelen teklifteki karşı ürün)
    const offeredProduct = item.offeredProduct || {};
    const offeredProductTitle = offeredProduct.title || 'Ürün bilgisi yok';
    const offeredProductId = offeredProduct._id || item.offeredProductId || 'ID yok';
    
    // İstenen ürün (başkasının ürünü veya benim istediğim karşı ürün)
    const requestedProduct = item.requestedProduct || {};
    const requestedProductTitle = requestedProduct.title || 'Ürün bilgisi yok';
    const requestedProductId = requestedProduct._id || item.requestedProductId || 'ID yok';
    
    // Güvenli resim URL oluşturma helper
    const safeGetImageUrl = (url) => {
      if (!url) return false;
      if (typeof url !== 'string') return false;
      
      // URL'in http ile başlayıp başlamadığını kontrol et
      if (url.startsWith('http')) {
        return url;
      }
      
      // URL başlangıcını temizle (kesme işaretleri veya gereksiz ön ekler)
      let cleanUrl = url;
      if (url.startsWith('/')) {
        cleanUrl = url.substring(1);
      }
      
      // uploads/ ön eki zaten varsa ekleme
      if (cleanUrl.startsWith('uploads/')) {
        return `${API_BASE_URL}/${cleanUrl}`;
      }
      
      // Aksi takdirde uploads/ ön ekini ekle
      return `${API_BASE_URL}/uploads/${cleanUrl}`;
    };
    
    // Resim URL'leri oluşturma
    const getImageUrl = (product) => {
      try {
        if (!product) return 'https://via.placeholder.com/100x100?text=No+Image';
        
        // 1. Resim URL'si doğrudan mevcutsa kullan
        if (product.imageUrl) {
          const imgUrl = safeGetImageUrl(product.imageUrl);
          if (imgUrl) return imgUrl;
        }
        
        // 2. Resim URL'si image alanında olabilir
        if (product.image) {
          const imgUrl = safeGetImageUrl(product.image);
          if (imgUrl) return imgUrl;
        }
        
        // 3. CloudinaryPublicId özelliği
        if (product.cloudinaryPublicId) {
          return `https://res.cloudinary.com/dzfqihfvj/image/upload/${product.cloudinaryPublicId}`;
        }
        
        // 4. Resimler listesi - daha kapsamlı kontrollerle
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          const firstImage = product.images[0];
          
          // 4.1 String URL kontrolü
          if (firstImage && typeof firstImage === 'string') {
            const imgUrl = safeGetImageUrl(firstImage);
            if (imgUrl) return imgUrl;
          } 
          // 4.2 Nesne kontrolü (Cloudinary veya başka format olabilir)
          else if (firstImage && typeof firstImage === 'object') {
            // 4.2.1 URL özelliği kontrolü
            if (firstImage.url && typeof firstImage.url === 'string') {
              const imgUrl = safeGetImageUrl(firstImage.url);
              if (imgUrl) return imgUrl;
            }
            // 4.2.2 secure_url özelliği kontrolü (Cloudinary)
            else if (firstImage.secure_url && typeof firstImage.secure_url === 'string') {
              return firstImage.secure_url;
            }
            // 4.2.3 path özelliği kontrolü
            else if (firstImage.path && typeof firstImage.path === 'string') {
              const imgUrl = safeGetImageUrl(firstImage.path);
              if (imgUrl) return imgUrl;
            }
            // 4.2.4 filename özelliği kontrolü
            else if (firstImage.filename && typeof firstImage.filename === 'string') {
              const imgUrl = safeGetImageUrl(`products/${firstImage.filename}`);
              if (imgUrl) return imgUrl;
            }
            // 4.2.5 public_id özelliği kontrolü (Cloudinary)
            else if (firstImage.public_id && typeof firstImage.public_id === 'string') {
              return `https://res.cloudinary.com/dzfqihfvj/image/upload/${firstImage.public_id}`;
            }
          }
        }
        
        // Resim bulunamadı - varsayılan resim göster
        return 'https://via.placeholder.com/100x100?text=No+Image';
      } catch (error) {
        console.error('Error in getImageUrl:', error);
        return 'https://via.placeholder.com/100x100?text=Error';
      }
    };
    
    // İşlem butonları - Sadece bekleyen ve "alınan" teklif türünde işlem butonları göster
    const showActionButtons = item.status === 'pending' && item.type === 'received';
    
    // Teklifi kabul et
    const handleAcceptTrade = async () => {
      try {
        const tradeId = item.id || item._id;
        if (!tradeId) {
          Alert.alert('Hata', 'Takas ID bilgisi bulunamadı.');
          return;
        }
        
        // Kullanıcıya onay sorma
        Alert.alert(
          'Takas Teklifi Onay',
          'Bu takas teklifini kabul etmek istediğinize emin misiniz?',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Kabul Et',
              onPress: async () => {
                try {
                  setLoading(true);
                  
                  // Teklifi kabul et
                  const result = await tradeOfferService.acceptTradeOffer(tradeId);
                  
                  console.log('Takas teklifi kabul edildi:', result);
                  
                  // Onay mesajı göster
                  Alert.alert(
                    'Başarılı',
                    'Takas teklifi başarıyla kabul edildi! Karşı taraf bilgilendirildi.',
                    [{ text: 'Tamam' }]
                  );
                  
                  // Takas listesini yenile
                  await onRefresh();
                  
                  // Callback varsa ana profil sayfasına bilgi ver
                  if (route.params?.onTradeUpdated) {
                    route.params.onTradeUpdated();
                  }
                } catch (error) {
                  console.error('Takas teklifi kabul edilirken hata:', error);
                  
                  // Hata mesajını API'den alabiliyorsak göster, alamıyorsak genel hata mesajı göster
                  const errorMessage = error.response?.data?.message || 
                                      'Takas teklifi kabul edilemedi. Lütfen tekrar deneyin.';
                  
                  Alert.alert('Hata', errorMessage);
                } finally {
                  setLoading(false);
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('Takas teklifi kabul işlemi sırasında hata:', error);
        Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    };
    
    // Teklifi reddet
    const handleRejectTrade = async () => {
      try {
        const tradeId = item.id || item._id;
        if (!tradeId) {
          Alert.alert('Hata', 'Takas ID bilgisi bulunamadı.');
          return;
        }
        
        // Kullanıcıya onay sorma
        Alert.alert(
          'Takas Teklifi Red',
          'Bu takas teklifini reddetmek istediğinize emin misiniz?',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Reddet',
              style: 'destructive',
              onPress: async () => {
                try {
                  setLoading(true);
                  
                  // İsteğe bağlı red nedeni girme
                  const redNedeni = ''; // İsteğe bağlı: Kullanıcıdan alınabilir
                  
                  // Teklifi reddet
                  const result = await tradeOfferService.rejectTradeOffer(tradeId, redNedeni);
                  
                  console.log('Takas teklifi reddedildi:', result);
                  
                  // Bilgilendirme mesajı göster
                  Alert.alert(
                    'Bilgi',
                    'Takas teklifi reddedildi. Karşı taraf bilgilendirildi.',
                    [{ text: 'Tamam' }]
                  );
                  
                  // Takas listesini yenile
                  await onRefresh();
                  
                  // Callback varsa ana profil sayfasına bilgi ver
                  if (route.params?.onTradeUpdated) {
                    route.params.onTradeUpdated();
                  }
                } catch (error) {
                  console.error('Takas teklifi reddedilirken hata:', error);
                  
                  // Hata mesajını API'den alabiliyorsak göster, alamıyorsak genel hata mesajı göster
                  const errorMessage = error.response?.data?.message || 
                                      'Takas teklifi reddedilemedi. Lütfen tekrar deneyin.';
                  
                  Alert.alert('Hata', errorMessage);
                } finally {
                  setLoading(false);
                }
              }
            }
          ]
        );
      } catch (error) {
        console.error('Takas teklifi red işlemi sırasında hata:', error);
        Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    };

    // Nakit teklif
    const cashOffer = item.additionalCashOffer || item.cashOffer || 0;
    
    // Return the component
    return (
      <TouchableOpacity
        style={styles.tradeItem}
        onPress={() => handleTradePress(item)}
      >
        <View style={styles.tradeHeader}>
          <View style={styles.tradeInfo}>
            <View style={[styles.tradeType, { backgroundColor: getStatusColor(item.type) }]}>
              <Text style={styles.tradeTypeText}>
                {item.type === 'sent' ? 'Gönderilen' : item.type === 'received' ? 'Alınan' : 'Tamamlanan'}
              </Text>
            </View>
            <Text style={styles.tradeDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : 'Bilinmeyen tarih'}
            </Text>
          </View>
          <View style={styles.tradeStatus}>
            <Text style={styles.statusText}>{getStatusText(item)}</Text>
          </View>
        </View>

        <View style={styles.tradeProducts}>
          <View style={styles.productInfo}>
            <Image 
              source={{ uri: getImageUrl(offeredProduct) }} 
              style={styles.productImage} 
              resizeMode="cover"
            />
            <Text style={styles.productName}>{offeredProductTitle}</Text>
            <Text style={styles.productId}>ID: {offeredProductId}</Text>
          </View>
          
          <View style={styles.swapContainer}>
          <Ionicons name="swap-horizontal" size={24} color="#666" />
            {cashOffer > 0 && (
              <Text style={styles.cashText}>+{cashOffer} ₺</Text>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Image 
              source={{ uri: getImageUrl(requestedProduct) }} 
              style={styles.productImage} 
              resizeMode="cover"
            />
            <Text style={styles.productName}>{requestedProductTitle}</Text>
            <Text style={styles.productId}>ID: {requestedProductId}</Text>
          </View>
        </View>
        
        {showActionButtons && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAcceptTrade}
            >
              <Text style={styles.actionButtonText}>Kabul Et</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectTrade}
            >
              <Text style={styles.actionButtonText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Header with title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isCurrentUser ? 'Takaslarım' : 'Kullanıcının Takasları'}
        </Text>
      </View>
      
      {/* Filter buttons */}
      <FilterButtons />
      
      {/* Trades list */}
      {displayTrades.length === 0 ? (
        <EmptyTradesView 
          isCurrentUser={isCurrentUser} 
          activeFilter={activeFilter} 
        />
      ) : (
        <FlatList
          data={displayTrades}
          renderItem={renderTradeItem}
          keyExtractor={(item, index) => ((item.id || item._id || `trade-${index}`).toString())}
          contentContainerStyle={styles.tradesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B6B']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#FF6B6B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  activeFilterButton: {
    backgroundColor: '#FF6B6B',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 50,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  tempText: {
    padding: 20,
    fontSize: 16,
    textAlign: 'center'
  },
  tradesList: {
    padding: 12,
  },
  tradeItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeType: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  tradeTypeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  tradeDate: {
    fontSize: 12,
    color: '#888',
  },
  tradeStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
  tradeProducts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  productInfo: {
    flex: 1,
    alignItems: 'center',
    padding: 5,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productName: {
    fontSize: 13,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  productId: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  swapContainer: {
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cashText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  cashOfferContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  cashOfferText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default UserTradesScreen; 