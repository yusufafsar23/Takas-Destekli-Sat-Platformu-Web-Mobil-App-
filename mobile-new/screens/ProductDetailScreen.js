import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Share,
  Alert,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { productService } from '../services';
import { getProductImageUrl, getProductImages } from '../services/imageHelper';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ekran genişliğini alalım
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

// Helper fonksiyonları
const getCategoryName = (product) => {
  if (!product.category) return 'Kategori Yok';
  
  if (typeof product.category === 'object') {
    return product.category.name || 'Kategori Yok';
  }
  
  return product.category;
};

const getSellerInfo = (product) => {
  // Debug log to see what we're working with
  console.log('Product data for seller info:', {
    seller: product.seller ? 'exists' : 'missing',
    owner: product.owner ? 'exists' : 'missing',
    createdBy: product.createdBy ? 'exists' : 'missing',
    userId: product.userId || 'missing',
    location: product.location || 'missing'
  });
  
  // Collect possible seller information from multiple possible sources
  const possibleSellers = [];
  
  // Try from seller object
  if (product.seller && typeof product.seller === 'object') {
    possibleSellers.push({
      id: product.seller._id || product.seller.id || '',
      // Ensure consistent name format - prefer fullName then firstName+lastName, then username
      name: product.seller.fullName || 
           ((product.seller.firstName || '') + ' ' + (product.seller.lastName || '')).trim() ||
           product.seller.username || product.seller.name || '',
      rating: product.seller.ratings?.averageRating || product.seller.rating || 0,
      location: product.seller.location || product.seller.address || product.location || '',
      profileImage: product.seller.profilePicture || product.seller.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    });
  }
  
  // Try from owner object
  if (product.owner && typeof product.owner === 'object') {
    possibleSellers.push({
      id: product.owner._id || product.owner.id || '',
      // Ensure consistent name format - prefer fullName then firstName+lastName, then username
      name: product.owner.fullName || 
           ((product.owner.firstName || '') + ' ' + (product.owner.lastName || '')).trim() ||
           product.owner.username || product.owner.name || '',
      rating: product.owner.ratings?.averageRating || product.owner.rating || 0,
      location: product.owner.location || product.owner.address || product.location || '',
      profileImage: product.owner.profilePicture || product.owner.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    });
  }
  
  // Try from createdBy object
  if (product.createdBy && typeof product.createdBy === 'object') {
    possibleSellers.push({
      id: product.createdBy._id || product.createdBy.id || '',
      // Ensure consistent name format - prefer fullName then firstName+lastName, then username
      name: product.createdBy.fullName || 
           ((product.createdBy.firstName || '') + ' ' + (product.createdBy.lastName || '')).trim() ||
           product.createdBy.username || product.createdBy.name || '',
      rating: product.createdBy.ratings?.averageRating || product.createdBy.rating || 0,
      location: product.createdBy.location || product.createdBy.address || product.location || '',
      profileImage: product.createdBy.profilePicture || product.createdBy.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    });
  }
  
  // Try from product.user object if it exists
  if (product.user && typeof product.user === 'object') {
    possibleSellers.push({
      id: product.user._id || product.user.id || '',
      // Ensure consistent name format - prefer fullName then firstName+lastName, then username
      name: product.user.fullName || 
           ((product.user.firstName || '') + ' ' + (product.user.lastName || '')).trim() ||
           product.user.username || product.user.name || '',
      rating: product.user.ratings?.averageRating || product.user.rating || 0,
      location: product.user.location || product.user.address || product.location || '',
      profileImage: product.user.profilePicture || product.user.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    });
  }
  
  // If product has direct location property, create a seller with that location
  if (product.location && possibleSellers.length === 0) {
    possibleSellers.push({
      id: 'unknown',
      name: 'İsimsiz Satıcı',
      rating: 0,
      location: product.location,
      profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    });
  }
  
  // Find the most complete seller info
  let bestSeller = null;
  let highestScore = -1;
  
  for (const seller of possibleSellers) {
    // Score based on completeness
    let score = 0;
    if (seller.id) score += 2;
    if (seller.name) score += 3;
    if (seller.rating > 0) score += 1;
    if (seller.location) score += 1;
    if (seller.profileImage && !seller.profileImage.includes('placehold.co')) score += 1;
    
    if (score > highestScore) {
      highestScore = score;
      bestSeller = seller;
    }
  }
  
  // If we found a good seller, return it
  if (bestSeller && bestSeller.name) {
    console.log('Found best seller:', bestSeller);
    return {
      id: bestSeller.id || 'unknown',
      name: bestSeller.name,
      rating: bestSeller.rating || 0,
      location: bestSeller.location || product.location || 'Konum belirtilmemiş',
      profileImage: bestSeller.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User'
    };
  }
  
  // Fallback with unknown seller
  console.log('No good seller info found, falling back to default');
  return {
    id: 'unknown',
    name: 'İsimsiz Satıcı',
    rating: 0,
    location: product.location || 'Konum belirtilmemiş',
    profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=User'
  };
};

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState([]);
  const [sellerInfo, setSellerInfo] = useState(null);
  const { user, refreshUserData, isLoggedIn } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [localUser, setLocalUser] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  // AsyncStorage'dan kullanıcı bilgilerini al
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Önce AuthContext'deki refreshUserData metodunu kullan
        const userData = await refreshUserData();
        if (userData) {
          console.log('AuthContext refreshUserData kullanılarak kullanıcı bilgileri yüklendi:', userData);
        } else {
          // Yedek plan: doğrudan AsyncStorage'dan oku
          const userString = await AsyncStorage.getItem('user');
          if (userString) {
            const userObj = JSON.parse(userString);
            console.log('AsyncStorage\'dan kullanıcı bilgileri yüklendi:', userObj);
            setLocalUser(userObj);
          } else {
            console.log('AsyncStorage\'da kullanıcı bilgisi bulunamadı!');
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri alınırken hata:', error);
      }
    };
    
    loadUserData();
  }, []);

  useEffect(() => {
    fetchProductDetails();
    
    return () => {};
  }, [productId]);
  
  // Product değiştiğinde veya kullanıcı bilgileri güncellendiğinde sahiplik kontrolünü tekrar yap
  useEffect(() => {
    if (product) {
      checkIfUserIsOwner(product);
    }
  }, [product, user, localUser, route.params]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Ürün detayları yükleniyor, ID: ${productId}`);
      // API'den ürün detaylarını getir
      const response = await productService.getProduct(productId);
      
      // API yanıtını kontrol et
      let productData = null;
      
      if (response && response.success && response.data) {
        // Standart API yanıt yapısı: { success: true, data: {...} }
        console.log('Ürün detayları başarıyla yüklendi (success/data yapısı)');
        productData = response.data;
      } else if (response && response.data) {
        // Alternatif yanıt yapısı: { data: {...} }
        console.log('Ürün detayları başarıyla yüklendi (data yapısı)');
        productData = response.data;
      } else if (response && typeof response === 'object' && !response.error) {
        // Direkt ürün verisi döndüyse
        console.log('Ürün detayları başarıyla yüklendi (direkt veri)');
        productData = response;
      }
      
      if (productData) {
        console.log('Ürün verisi işleniyor:', JSON.stringify(productData).substring(0, 200));
        setProduct(productData);
        
        // Ürün resimlerini işle
        const images = getProductImages(productData);
        setProductImages(images);
        
        // Satıcı bilgilerini işle
        const seller = getSellerInfo(productData);
        setSellerInfo(seller);
      } else {
        console.error('Geçersiz API yanıtı:', response);
        setError('Ürün verisi alınamadı.');
      }
    } catch (err) {
      console.error('Ürün detayları alınırken hata:', err);
      setError('Ürün detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcının ürün sahibi olup olmadığını kontrol etmek için ayrı bir fonksiyon
  const checkIfUserIsOwner = (productData) => {
    console.log('========== OWNER DETECTION DEBUG ==========');
    
    // Önce route params'da isOwner veya fromUserProducts kontrolü yap
    if (route?.params) {
      if (route.params.isOwner === true || route.params.fromUserProducts === true) {
        console.log('Route parametrelerine göre sahibi: TRUE');
        setIsOwner(true);
        console.log('========== DEBUG BİTTİ ==========');
        return;
      }
    }
    
    // AuthContext'den veya localStorage'den kullanıcı bilgisini al
    const currentUser = user || localUser;
    
    if (!currentUser) {
      console.log('Kullanıcı giriş yapmamış veya bilgileri alınamadı, sahibi değil');
      setIsOwner(false);
      console.log('========== DEBUG BİTTİ ==========');
      return;
    }
    
    // ID bilgilerini ekrana yazdır
    console.log('USER ID BILGILERI:');
    console.log('- currentUser._id:', currentUser._id);
    console.log('- currentUser.id:', currentUser.id);
    
    console.log('URUN OWNER BILGILERI:');
    if (typeof productData.owner === 'object') {
      console.log('- owner._id:', productData.owner._id);
      console.log('- owner.id:', productData.owner.id);
    } else {
      console.log('- owner (string):', productData.owner);
    }
    
    // ID'leri string formatına çevir
    const userIdStr = String(currentUser._id || currentUser.id || '');
    let ownerIdStr = '';
    
    if (typeof productData.owner === 'object') {
      ownerIdStr = String(productData.owner._id || productData.owner.id || '');
    } else {
      ownerIdStr = String(productData.owner || '');
    }
    
    console.log('KARŞILAŞTIRMA İÇİN STRING DEĞERLER:');
    console.log('- userIdStr:', userIdStr);
    console.log('- ownerIdStr:', ownerIdStr);
    
    // 1. Tam eşleşme kontrolü
    if (userIdStr && ownerIdStr && userIdStr === ownerIdStr) {
      console.log('ID\'ler tam olarak eşleşti - Kullanıcı ürünün sahibi!');
      setIsOwner(true);
      console.log('========== DEBUG BİTTİ ==========');
      return;
    }
    
    // 2. MongoDB ObjectId'nin son kısmını karşılaştır
    if (userIdStr && ownerIdStr && userIdStr.length >= 5 && ownerIdStr.length >= 5) {
      const userIdEnd = userIdStr.slice(-5);
      const ownerIdEnd = ownerIdStr.slice(-5);
      
      console.log('SON 5 KARAKTER KARŞILAŞTIRMASI:');
      console.log('- userIdEnd:', userIdEnd);
      console.log('- ownerIdEnd:', ownerIdEnd);
      
      if (userIdEnd === ownerIdEnd) {
        console.log('ID\'lerin son 5 karakteri eşleşti - Kullanıcı ürünün sahibi!');
        setIsOwner(true);
        console.log('========== DEBUG BİTTİ ==========');
        return;
      }
    }
    
    // createdBy ile kontrol et
    if (productData.createdBy) {
      const createdByIdStr = typeof productData.createdBy === 'object' 
        ? String(productData.createdBy._id || productData.createdBy.id || '')
        : String(productData.createdBy || '');
      
      console.log('CREATEDBY KARŞILAŞTIRMASI:');
      console.log('- createdByIdStr:', createdByIdStr);
      
      if (userIdStr && createdByIdStr && (userIdStr === createdByIdStr || 
         (createdByIdStr.length >= 5 && userIdStr.length >= 5 && 
          createdByIdStr.slice(-5) === userIdStr.slice(-5)))) {
        console.log('CreatedBy ID eşleşti - Kullanıcı ürünün sahibi!');
        setIsOwner(true);
        console.log('========== DEBUG BİTTİ ==========');
        return;
      }
    }
    
    // Hiçbir eşleşme bulunamadı
    console.log('Sahiplik doğrulanamadı - Kullanıcı ürünün sahibi değil');
    setIsOwner(false);
    console.log('========== DEBUG BİTTİ ==========');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${product.title} - ${product.price} TL - Takas Platform'da`,
        url: `https://takasplatform.com/products/${product._id || product.id}`,
      });
    } catch (error) {
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu');
    }
  };

  const handleContact = () => {
    // Mesajlaşma sayfasına yönlendir
    navigation.navigate('Messages', { 
      recipientId: sellerInfo.id,
      productId: product._id || product.id
    });
  };

  const handleSendTradeOffer = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        "Giriş Gerekli",
        "Takas teklifi göndermek için giriş yapmanız gerekiyor.",
        [
          { text: "İptal", style: "cancel" },
          { 
            text: "Giriş Yap", 
            onPress: () => navigation.navigate('Login', { 
              redirectTo: 'ProductDetail',
              productId: productId
            }) 
          }
        ]
      );
      return;
    }
    
    // User is logged in, navigate to trade offer screen
    // Note: This will be implemented in the future
    navigation.navigate('TradeOffer', { 
      productId: product._id || product.id,
      sellerId: sellerInfo.id,
      productTitle: product.title
    });
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const formattedDate = new Intl.DateTimeFormat('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
      return formattedDate;
    } catch (error) {
      return 'Belirtilmemiş';
    }
  };

  const formatPrice = (price) => {
    if (!price) return '0 ₺';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " ₺";
  };

  // Debug Panel için currentUser değişkeni
  const currentUser = user || localUser;

  // Resim görüntüleyici için fonksiyonlar
  const openImageViewer = (index) => {
    setFullscreenImageIndex(index);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
  };

  const goToPreviousImage = () => {
    if (fullscreenImageIndex > 0) {
      setFullscreenImageIndex(fullscreenImageIndex - 1);
    } else {
      // Eğer ilk resimdeyse son resme git (döngü)
      setFullscreenImageIndex(productImages.length - 1);
    }
  };

  const goToNextImage = () => {
    if (fullscreenImageIndex < productImages.length - 1) {
      setFullscreenImageIndex(fullscreenImageIndex + 1);
    } else {
      // Eğer son resimdeyse ilk resme git (döngü)
      setFullscreenImageIndex(0);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Ürün bilgileri yükleniyor...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Ürün bulunamadı'}</Text>
        <Button 
          text="Tekrar Dene" 
          onPress={fetchProductDetails}
        />
        <Button 
          text="Geri Dön" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Ürün Görselleri */}
      <View style={styles.imageContainer}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.floor(event.nativeEvent.contentOffset.x / windowWidth);
            setCurrentImageIndex(slideIndex);
          }}
        >
          {productImages.map((image, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={() => openImageViewer(index)}
            >
              <Image
                source={{ uri: image }}
                style={styles.productImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* İndikatör */}
        {productImages.length > 1 && (
          <View style={styles.indicatorContainer}>
            {productImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>
      
      {/* Tam Ekran Resim Görüntüleyici Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={closeImageViewer}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: productImages[fullscreenImageIndex] }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          
          {productImages.length > 1 && (
            <>
              <TouchableOpacity 
                style={[styles.navigationButton, styles.leftButton]} 
                onPress={goToPreviousImage}
              >
                <Ionicons name="chevron-back" size={36} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navigationButton, styles.rightButton]} 
                onPress={goToNextImage}
              >
                <Ionicons name="chevron-forward" size={36} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.fullscreenIndicatorContainer}>
                <Text style={styles.imageCounter}>
                  {fullscreenImageIndex + 1} / {productImages.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
      
      {/* Ürün Bilgileri */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{product.title}</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-social-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        {product.acceptsTradeOffers && (
          <View style={styles.tradeAcceptedContainer}>
            <Ionicons name="swap-horizontal" size={16} color="#4CAF50" />
            <Text style={styles.tradeAcceptedText}>Takas Kabul Edilir</Text>
          </View>
        )}
        <Text style={styles.date}>Yayınlanma: {formatDate(product.createdAt)}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Detaylar</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Kategori</Text>
            <Text style={styles.detailValue}>{getCategoryName(product)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Durum</Text>
            <Text style={styles.detailValue}>{product.condition || 'Belirtilmemiş'}</Text>
          </View>
        </View>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Konum</Text>
            <Text style={styles.detailValue}>
              {product.location || (sellerInfo && sellerInfo.location) || 'Belirtilmemiş'}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Açıklama</Text>
        <Text style={styles.description}>{product.description || 'Açıklama yok'}</Text>
        
        {product.tradePreferences && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Takas Seçenekleri</Text>
            <View style={styles.tradeOptionsContainer}>
              {product.tradePreferences.acceptsAnyTrade && (
                <View style={styles.tradeOption}>
                  <Ionicons name="swap-horizontal" size={16} color="#FF6B6B" />
                  <Text style={styles.tradeOptionText}>Tüm tekliflere açık</Text>
                </View>
              )}
              {product.tradePreferences.description && (
                <View style={styles.tradeOption}>
                  <Ionicons name="information-circle" size={16} color="#FF6B6B" />
                  <Text style={styles.tradeOptionText}>{product.tradePreferences.description}</Text>
                </View>
              )}
              {product.tradePreferences.preferredCategories && product.tradePreferences.preferredCategories.length > 0 && (
                product.tradePreferences.preferredCategories.map((cat, index) => (
                  <View key={index} style={styles.tradeOption}>
                    <Ionicons name="pricetag" size={16} color="#FF6B6B" />
                    <Text style={styles.tradeOptionText}>{typeof cat === 'object' ? cat.name : cat}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
        
        <View style={styles.divider} />
        
        {/* Satıcı Bilgileri */}
        {sellerInfo && (
          <>
            <Text style={styles.sectionTitle}>Satıcı</Text>
            <TouchableOpacity 
              style={styles.sellerContainer}
              onPress={() => navigation.navigate('Profile', { userId: sellerInfo.id })}
            >
              <Image
                source={{ uri: sellerInfo.profileImage }}
                style={styles.sellerImage}
              />
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{sellerInfo.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>{sellerInfo.rating}</Text>
                </View>
                <Text style={styles.location}>{sellerInfo.location}</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* İletişim Butonu */}
      <View style={styles.actionContainer}>
        {isOwner ? (
          // Kullanıcının kendi ürünü için SADECE düzenleme butonu göster
          <Button 
            text="Ürünü Düzenle" 
            onPress={() => navigation.navigate('EditProduct', { productId: product._id || product.id })}
            type="secondary"
            style={styles.contactButton}
          />
        ) : (
          // Başkasının ürünü için mesaj ve takas butonları göster
          <>
            <Button 
              text="Satıcıya Mesaj Gönder" 
              onPress={handleContact}
              type="secondary"
              style={styles.contactButton}
            />
            {product.acceptsTradeOffers && (
              <Button
                text="Takas Teklifi Gönder"
                onPress={handleSendTradeOffer}
                type="primary"
                style={styles.tradeButton}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
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
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: windowWidth,
    height: 300,
    backgroundColor: '#e1e4e8',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 10,
    width: '100%',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  shareButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 8,
  },
  tradeAcceptedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  tradeAcceptedText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  tradeOptionsContainer: {
    marginTop: 5,
  },
  tradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeOptionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
  },
  sellerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e1e4e8',
  },
  sellerInfo: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  contactButton: {
    width: '100%',
  },
  tradeButton: {
    width: '100%',
    backgroundColor: '#4169E1',
  },
  backButton: {
    width: '100%',
    marginTop: 10,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: windowWidth,
    height: windowHeight,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftButton: {
    left: 10,
  },
  rightButton: {
    right: 10,
  },
  fullscreenIndicatorContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default ProductDetailScreen; 