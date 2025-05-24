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

// Sabit API URL tanımı
const API_BASE_URL = 'http://192.168.1.61:5000';
const API_IMAGE_URL = 'http://192.168.1.61:5000/uploads';

const UserTradesScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
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
      
      // List of potential endpoints to try
      const potentialEndpoints = [
        `${API_BASE_URL}/api/tradeoffers`,
        `${API_BASE_URL}/api/tradeoffers/user/${userId}`,
        `${API_BASE_URL}/api/tradeoffers/me`,
        `${API_BASE_URL}/api/trade-offers`,
        `${API_BASE_URL}/api/trade-offers/user/${userId}`,
        `${API_BASE_URL}/api/trade-offers/me`,
        `${API_BASE_URL}/api/trades`,
        `${API_BASE_URL}/api/trades/user/${userId}`,
        `${API_BASE_URL}/api/trades/me`,
        `${API_BASE_URL}/tradeoffers`,
        `${API_BASE_URL}/tradeoffers/user/${userId}`,
        `${API_BASE_URL}/tradeoffers/me`,
        `${API_BASE_URL}/trade-offers`,
        `${API_BASE_URL}/trade-offers/user/${userId}`,
        `${API_BASE_URL}/trade-offers/me`,
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
          console.error('UserTradesScreen: Trades is not an array in filterTradesForUser');
          return { sent: [], received: [], completed: [] };
        }
        
        console.log(`UserTradesScreen: Filtering ${trades.length} trades for user ${userIdToFilter}`);
        
        // Örnek olarak ilk birkaç ticaret verisi incele
        if (trades.length > 0) {
          const sample = trades[0];
          console.log('UserTradesScreen: Sample trade structure:', Object.keys(sample).join(', '));
        }
        
        // Kullanıcı ID'sini normalize et
        const normalizedUserId = normalizeId(userIdToFilter);
        
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
        
        console.log(`UserTradesScreen: Filtered results - Sent: ${sent.length}, Received: ${received.length}, Completed: ${completed.length}`);
        
        return { sent, received, completed };
      };
      
      for (const endpoint of potentialEndpoints) {
        try {
          console.log(`UserTradesScreen: Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (response.status === 200) {
            console.log(`UserTradesScreen: Success with endpoint: ${endpoint}`);
            console.log('UserTradesScreen: Response data type:', typeof response.data);
            console.log('UserTradesScreen: Response data structure:', 
              Array.isArray(response.data) ? 'Array' : 
              response.data.sent ? 'Object with sent/received properties' : 'Other object');
            
            // Veri formatını analiz et
            if (Array.isArray(response.data)) {
              console.log(`UserTradesScreen: Found ${response.data.length} trades in array`);
              tradeData = filterTradesForUser(response.data);
              break;
            } else if (response.data.sent || response.data.received || response.data.completed) {
              console.log('UserTradesScreen: Response already has sent/received/completed structure');
              tradeData = {
                sent: response.data.sent || [],
                received: response.data.received || [],
                completed: response.data.completed || []
              };
              break;
            } else if (response.data.trades) {
              console.log(`UserTradesScreen: Found trades in data.trades with ${response.data.trades.length} items`);
              tradeData = filterTradesForUser(response.data.trades);
              break;
            } else if (response.data.data && (Array.isArray(response.data.data) || response.data.data.trades)) {
              console.log('UserTradesScreen: Found trades in data.data');
              const rawTradeData = Array.isArray(response.data.data) ? response.data.data : response.data.data.trades;
              tradeData = filterTradesForUser(rawTradeData);
              break;
            } else {
              console.log('UserTradesScreen: Unknown response format, trying to inspect for trade data');
              // İçeriği kaba kuvvetle incele
              let possibleTrades = null;
              
              // Cevabın içindeki ilk dizi veya "trades" gibi bir özelliği bul
              Object.keys(response.data).forEach(key => {
                if (Array.isArray(response.data[key])) {
                  console.log(`UserTradesScreen: Found array in response.data.${key} with ${response.data[key].length} items`);
                  possibleTrades = response.data[key];
                }
              });
              
              if (possibleTrades && possibleTrades.length > 0) {
                console.log('UserTradesScreen: Using found trades array');
                tradeData = filterTradesForUser(possibleTrades);
                break;
              }
            }
          }
        } catch (error) {
          lastError = error;
          console.error(`UserTradesScreen: Error with endpoint ${endpoint}:`, error.message);
        }
      }
      
      if (tradeData) {
        console.log('UserTradesScreen: Successfully fetched trade data from API');
        return tradeData;
      } else {
        console.error('UserTradesScreen: Failed to fetch trades from all endpoints');
        if (lastError) {
          throw lastError;
        } else {
          throw new Error('Could not fetch trade offers from any endpoint');
        }
      }
    } catch (error) {
      console.error('UserTradesScreen: Error in fetchTradesDirectly:', error);
      throw error;
    }
  };

  // Ana veri çekme fonksiyonu
  const fetchTrades = async () => {
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
        const serviceResult = userId 
          ? await tradeOfferService.getUserTrades(targetUserId)
          : await tradeOfferService.getCurrentUserTrades();
        
        if (serviceResult && (serviceResult.sent || serviceResult.received || serviceResult.completed)) {
          console.log('UserTradesScreen: Successfully fetched trades using tradeOfferService');
          setTrades(serviceResult);
        } else {
          throw new Error('tradeOfferService returned invalid data');
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
        fetchTrades();
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

    // Ürünlerin ID'leri
    const myProductId = item.type === 'sent' ? item.offeredProductId : item.requestedProductId;
    const otherProductId = item.type === 'sent' ? item.requestedProductId : item.offeredProductId;

    // Nakit teklif
    const cashOffer = item.cashOffer || 0;
    
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
            <Text style={styles.productLabel}>Ürün ID: {myProductId}</Text>
          </View>
          
          <Ionicons name="swap-horizontal" size={24} color="#666" />
          
          <View style={styles.productInfo}>
            <Text style={styles.productLabel}>Ürün ID: {otherProductId}</Text>
          </View>
        </View>
        
        {cashOffer > 0 && (
          <View style={styles.cashOfferContainer}>
            <Text style={styles.cashOfferText}>
              + {cashOffer} ₺ Nakit Teklif
            </Text>
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
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
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
    marginVertical: 8,
  },
  productInfo: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  productLabel: {
    fontSize: 14,
    color: '#333',
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