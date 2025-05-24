import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import tradeOfferService from '../services/tradeOfferService';
import productService from '../services/productService';
import { getProductImageUrl } from '../services/imageHelper';

// Varsayılan ürün resmi
const defaultProductImage = 'https://placehold.co/600x400/cccccc/ffffff?text=No+Image';

const TradeOfferDetailScreen = ({ route, navigation }) => {
  const { tradeId } = route.params || {};
  const [trade, setTrade] = useState(null);
  const [offeredProduct, setOfferedProduct] = useState(null);
  const [requestedProduct, setRequestedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [isTradeOfferer, setIsTradeOfferer] = useState(false);
  const [isTradeReceiver, setIsTradeReceiver] = useState(false);
  
  // Resim yükleme hata durumları için state'ler
  const [offeredImageError, setOfferedImageError] = useState(false);
  const [requestedImageError, setRequestedImageError] = useState(false);

  // Takas teklifi detaylarını yükle
  useEffect(() => {
    // Takas ID'si kontrolü
    if (!tradeId) {
      setLoading(false);
      setError('Geçersiz takas teklifi ID\'si. Lütfen tekrar deneyin.');
      return;
    }
    
    fetchTradeDetails();
  }, [tradeId]);

  const fetchTradeDetails = async () => {
    try {
      setLoading(true);
      
      // Takas ID'si kontrolü (ek güvenlik)
      if (!tradeId) {
        throw new Error('Geçersiz takas teklifi ID\'si');
      }
      
      console.log(`Takas teklifi detayları yükleniyor, ID: ${tradeId}`);
      
      // Takas teklifi detayını getir
      const response = await tradeOfferService.getTradeOffer(tradeId);
      
      console.log('Takas teklifi yanıtı:', response);
      
      let tradeData;
      if (response.data) {
        tradeData = response.data;
      } else if (response.tradeOffer) {
        tradeData = response.tradeOffer;
      } else if (response) {
        tradeData = response;
      }
      
      if (!tradeData) {
        setError('Takas teklifi bulunamadı');
        setLoading(false);
        return;
      }
      
      console.log('Takas teklifi verileri yüklendi:', tradeData);
      setTrade(tradeData);
      
      // Kullanıcı takas teklifinde hangi rolde kontrol et
      const currentUserId = user?.id || user?._id;
      const offererId = tradeData.offeredBy || tradeData.sender || tradeData.senderId;
      const receiverId = tradeData.requestedFrom || tradeData.receiver || tradeData.receiverId;
      
      setIsTradeOfferer(offererId === currentUserId);
      setIsTradeReceiver(receiverId === currentUserId);
      
      // Ürün detaylarını yükle
      await loadProductDetails(tradeData);
      
    } catch (err) {
      console.error('Takas teklifi detayları alınırken hata:', err);
      setError('Takas teklifi detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Ürün detaylarını yükle
  const loadProductDetails = async (tradeData) => {
    try {
      console.log('loadProductDetails için tradeData kontrol:', JSON.stringify(tradeData).substring(0, 200));
      
      // API server URL - doğrudan kullan
      const API_SERVER_URL = 'http://192.168.1.61:5000';
      
      // Teklif edilen ürün
      try {
        let offeredProductId = tradeData.offeredProduct || tradeData.offeredProductId;
        console.log('Teklif edilen ürün ID/data:', offeredProductId);
        
        // ID kontrolü - undefined veya null ise
        if (!offeredProductId) {
          console.log('Teklif edilen ürün ID\'si bulunamadı, varsayılan değer kullanılıyor');
          setOfferedProduct({
            title: 'Ürün bilgisi bulunamadı',
            price: '-',
            _id: 'unknown',
            id: 'unknown',
            image: null,
            imageUrl: null
          });
        } else if (typeof offeredProductId === 'object') {
          // Eğer zaten ürün nesnesi içeriyorsa
          console.log('Teklif edilen ürün zaten nesne formatında');
          setOfferedProduct(offeredProductId);
        } else {
          // Sadece ID varsa, ürün detaylarını getir
          console.log(`Teklif edilen ürün detayları getiriliyor, ID: ${offeredProductId}`);
          try {
            const offeredResponse = await productService.getProduct(offeredProductId);
            console.log('Teklif edilen ürün yanıtı:', JSON.stringify(offeredResponse).substring(0, 200));
            
            let productData = null;
            
            if (offeredResponse && offeredResponse.data) {
              productData = offeredResponse.data;
            } else if (offeredResponse) {
              productData = offeredResponse;
            }
            
            if (productData) {
              setOfferedProduct(productData);
            } else {
              // Ürün bulunamadı - varsayılan değer kullan
              setOfferedProduct({
                title: 'Ürün bulunamadı',
                price: '-',
                _id: offeredProductId,
                id: offeredProductId,
                image: null,
                imageUrl: null
              });
            }
          } catch (productError) {
            console.error(`Teklif edilen ürün (${offeredProductId}) getirme hatası:`, productError);
            // Ürün getirme hatası - varsayılan değer kullan
            setOfferedProduct({
              title: 'Ürün yüklenemedi',
              price: '-',
              _id: offeredProductId,
              id: offeredProductId,
              image: null,
              imageUrl: null
            });
          }
        }
      } catch (offeredError) {
        console.error('Teklif edilen ürün işleme hatası:', offeredError);
        setOfferedProduct({
          title: 'Ürün işlenirken hata oluştu',
          price: '-',
          _id: 'error',
          id: 'error'
        });
      }
      
      // İstenen ürün
      try {
        let requestedProductId = tradeData.requestedProduct || tradeData.requestedProductId;
        console.log('İstenen ürün ID/data:', requestedProductId);
        
        // ID kontrolü - undefined veya null ise
        if (!requestedProductId) {
          console.log('İstenen ürün ID\'si bulunamadı, varsayılan değer kullanılıyor');
          setRequestedProduct({
            title: 'Ürün bilgisi bulunamadı',
            price: '-',
            _id: 'unknown',
            id: 'unknown',
            image: null,
            imageUrl: null
          });
        } else if (typeof requestedProductId === 'object') {
          // Eğer zaten ürün nesnesi içeriyorsa
          console.log('İstenen ürün zaten nesne formatında');
          setRequestedProduct(requestedProductId);
        } else {
          // Sadece ID varsa, ürün detaylarını getir
          console.log(`İstenen ürün detayları getiriliyor, ID: ${requestedProductId}`);
          try {
            const requestedResponse = await productService.getProduct(requestedProductId);
            console.log('İstenen ürün yanıtı:', JSON.stringify(requestedResponse).substring(0, 200));
            
            let productData = null;
            
            if (requestedResponse && requestedResponse.data) {
              productData = requestedResponse.data;
            } else if (requestedResponse) {
              productData = requestedResponse;
            }
            
            if (productData) {
              setRequestedProduct(productData);
            } else {
              // Ürün bulunamadı - varsayılan değer kullan
              setRequestedProduct({
                title: 'Ürün bulunamadı',
                price: '-',
                _id: requestedProductId,
                id: requestedProductId,
                image: null,
                imageUrl: null
              });
            }
          } catch (productError) {
            console.error(`İstenen ürün (${requestedProductId}) getirme hatası:`, productError);
            // Ürün getirme hatası - varsayılan değer kullan
            setRequestedProduct({
              title: 'Ürün yüklenemedi',
              price: '-',
              _id: requestedProductId,
              id: requestedProductId,
              image: null,
              imageUrl: null
            });
          }
        }
      } catch (requestedError) {
        console.error('İstenen ürün işleme hatası:', requestedError);
        setRequestedProduct({
          title: 'Ürün işlenirken hata oluştu',
          price: '-',
          _id: 'error',
          id: 'error'
        });
      }
    } catch (err) {
      console.error('Ürün detayları yüklenirken hata:', err);
    }
  };

  // Takas teklifini kabul et
  const handleAcceptOffer = async () => {
    try {
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
      await tradeOfferService.acceptTradeOffer(tradeId);
                
                // Önbelleği temizle ve güncel verileri al
                await tradeOfferService.refreshTradeOffers();
                
                // Başarı mesajı
                Alert.alert('Başarılı', 'Takas teklifi kabul edildi!', [
                  { 
                    text: 'Tamam', 
                    onPress: () => {
                      // Profil ekranında takas verilerinin yenilenmesi için callback'i çağır
                      if (route.params?.onTradeUpdated) {
                        route.params.onTradeUpdated();
                      }
                      
                      // Takas geçmişi ekranına yönlendir
                      navigation.navigate('UserTrades', { refresh: true });
                    }
                  }
                ]);
    } catch (err) {
      console.error('Takas teklifi kabul edilirken hata:', err);
      Alert.alert('Hata', 'Takas teklifi kabul edilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Takas teklifi işlemleri sırasında hata:', err);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    }
  };

  // Takas teklifini reddet
  const handleRejectOffer = async () => {
    try {
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
      await tradeOfferService.rejectTradeOffer(tradeId);
                
                // Önbelleği temizle ve güncel verileri al
                await tradeOfferService.refreshTradeOffers();
                
                // Başarı mesajı
                Alert.alert('Bilgi', 'Takas teklifi reddedildi.', [
                  { 
                    text: 'Tamam', 
                    onPress: () => {
                      // Profil ekranında takas verilerinin yenilenmesi için callback'i çağır
                      if (route.params?.onTradeUpdated) {
                        route.params.onTradeUpdated();
                      }
                      
                      // Takas geçmişi ekranına yönlendir
                      navigation.navigate('UserTrades', { refresh: true });
                    }
                  }
                ]);
    } catch (err) {
      console.error('Takas teklifi reddedilirken hata:', err);
      Alert.alert('Hata', 'Takas teklifi reddedilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Takas teklifi işlemleri sırasında hata:', err);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    }
  };

  // Takas teklifini iptal et
  const handleCancelOffer = async () => {
    try {
      // Kullanıcıya onay sorma
      Alert.alert(
        'Takas Teklifi İptal',
        'Bu takas teklifini iptal etmek istediğinize emin misiniz?',
        [
          {
            text: 'İptal',
            style: 'cancel'
          },
          {
            text: 'Teklifi İptal Et',
            style: 'destructive',
            onPress: async () => {
    try {
      setLoading(true);
      await tradeOfferService.cancelTradeOffer(tradeId);
                
                // Önbelleği temizle ve güncel verileri al
                await tradeOfferService.refreshTradeOffers();
                
                // Başarı mesajı
                Alert.alert('Bilgi', 'Takas teklifi iptal edildi.', [
                  { 
                    text: 'Tamam', 
                    onPress: () => {
                      // Profil ekranında takas verilerinin yenilenmesi için callback'i çağır
                      if (route.params?.onTradeUpdated) {
                        route.params.onTradeUpdated();
                      }
                      
                      // Takas geçmişi ekranına yönlendir
                      navigation.navigate('UserTrades', { refresh: true });
                    }
                  }
                ]);
    } catch (err) {
      console.error('Takas teklifi iptal edilirken hata:', err);
      Alert.alert('Hata', 'Takas teklifi iptal edilirken bir sorun oluştu.');
    } finally {
      setLoading(false);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Takas teklifi işlemleri sırasında hata:', err);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu.');
    }
  };

  // Ürün detayına git
  const handleViewProduct = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id || product._id });
  };

  // Duruma göre renk
  const getStatusColor = () => {
    if (!trade) return '#999';
    
    switch(trade.status) {
      case 'pending': return '#FFC107';
      case 'accepted': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'canceled': return '#607D8B';
      case 'completed': return '#2196F3';
      default: return '#999';
    }
  };

  // Duruma göre metin
  const getStatusText = () => {
    if (!trade) return 'Bilinmiyor';
    
    switch(trade.status) {
      case 'pending': return 'Beklemede';
      case 'accepted': return 'Kabul Edildi';
      case 'rejected': return 'Reddedildi';
      case 'canceled': return 'İptal Edildi';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  // Tarih formatı
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Belirtilmemiş';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Takas teklifi yükleniyor...</Text>
      </View>
    );
  }

  if (error || !trade) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Takas teklifi bulunamadı'}</Text>
        <Button 
          text="Tekrar Dene" 
          onPress={fetchTradeDetails}
        />
        <Button 
          text="Geri Dön" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          type="secondary"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Durum Bilgisi */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Durum:</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>
      
      {/* Tarih Bilgisi */}
      <Text style={styles.dateText}>
        Teklif Tarihi: {formatDate(trade.createdAt || trade.date)}
      </Text>
      
      <View style={styles.divider} />
      
      {/* Teklif Edilen Ürün */}
      <Text style={styles.sectionTitle}>Teklif Edilen Ürün</Text>
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => offeredProduct && handleViewProduct(offeredProduct)}
      >
        <Image 
          source={{ 
            uri: offeredImageError ? 
              defaultProductImage :
              getProductImageUrl(offeredProduct)
          }} 
          style={styles.productImage}
          onError={() => {
            console.log('Teklif edilen ürün resmi yükleme hatası - fallback resim kullanılıyor');
            setOfferedImageError(true);
          }}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>
            {offeredProduct ? offeredProduct.title : 'Ürün bulunamadı'}
          </Text>
          <Text style={styles.productPrice}>
            {offeredProduct ? `${offeredProduct.price} ₺` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
      
      <View style={styles.divider} />
      
      {/* İstenen Ürün */}
      <Text style={styles.sectionTitle}>İstenen Ürün</Text>
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => requestedProduct && handleViewProduct(requestedProduct)}
      >
        <Image 
          source={{ 
            uri: requestedImageError ? 
              defaultProductImage :
              getProductImageUrl(requestedProduct)
          }} 
          style={styles.productImage}
          onError={() => {
            console.log('İstenen ürün resmi yükleme hatası - fallback resim kullanılıyor');
            setRequestedImageError(true);
          }}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>
            {requestedProduct ? requestedProduct.title : 'Ürün bulunamadı'}
          </Text>
          <Text style={styles.productPrice}>
            {requestedProduct ? `${requestedProduct.price} ₺` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#999" />
      </TouchableOpacity>
      
      <View style={styles.divider} />
      
      {/* Mesaj */}
      {trade.message && (
        <>
          <Text style={styles.sectionTitle}>Mesaj</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{trade.message}</Text>
          </View>
          <View style={styles.divider} />
        </>
      )}
      
      {/* İşlem Butonları - Duruma ve kullanıcı rolüne göre göster */}
      {trade.status === 'pending' && (
        <View style={styles.actionsContainer}>
          {isTradeReceiver && (
            <>
              <Button 
                text="Teklifi Kabul Et" 
                onPress={handleAcceptOffer}
                type="primary"
                style={styles.actionButton}
              />
              <Button 
                text="Teklifi Reddet" 
                onPress={handleRejectOffer}
                type="danger"
                style={styles.actionButton}
              />
            </>
          )}
          
          {isTradeOfferer && (
            <Button 
              text="Teklifi İptal Et" 
              onPress={handleCancelOffer}
              type="secondary"
              style={styles.actionButton}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateText: {
    padding: 16,
    color: '#666',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 4,
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: 16,
    marginBottom: 20,
  },
  actionButton: {
    marginBottom: 10,
  }
});

export default TradeOfferDetailScreen; 