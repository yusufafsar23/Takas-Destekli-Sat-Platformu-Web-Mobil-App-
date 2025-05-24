import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import productService from '../services/productService';
import tradeOfferService from '../services/tradeOfferService';
import { getProductImageUrl, getImageUrl } from '../services/imageHelper';

// Örnek kullanıcı verileri
const DUMMY_USER = {
  id: 999,
  name: 'Fatma Yıldız',
  email: 'fatma.yildiz@example.com',
  location: 'İstanbul, Üsküdar',
  phone: '+90 555 123 4567',
  profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=FY',
  bio: 'Elektronik cihazlar, kitaplar ve koleksiyon ürünleriyle ilgileniyorum. Kullanmadığım eşyaları değerlendirmek için buradayım.',
  rating: 4.6,
  ratingCount: 18,
  joinDate: '2022-03-15',
  productsCount: 8,
  tradesCount: 12
};

// Örnek ürün verileri
const DUMMY_USER_PRODUCTS = [
  {
    id: 10,
    title: 'Apple Watch Series 7',
    description: 'Çok az kullanılmış, kutulu Apple Watch Series 7',
    price: 8500,
    imageUrl: 'https://placehold.co/600x400/4169E1/FFFFFF?text=Apple+Watch',
    category: 'Elektronik'
  },
  {
    id: 11,
    title: 'Harry Potter Seti',
    description: 'Tüm kitaplar, özel kutusuyla birlikte',
    price: 1200,
    imageUrl: 'https://placehold.co/600x400/228B22/FFFFFF?text=Harry+Potter',
    category: 'Kitap & Hobi'
  },
  {
    id: 12,
    title: 'Vintage Polaroid Kamera',
    description: 'Çalışır durumda, koleksiyonluk Polaroid kamera',
    price: 3200,
    imageUrl: 'https://placehold.co/600x400/A0522D/FFFFFF?text=Polaroid',
    category: 'Koleksiyon'
  }
];

const ProfileScreen = ({ route, navigation }) => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trades, setTrades] = useState({
    sent: [],
    received: [],
    completed: []
  });
  const [tradesLoading, setTradesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const { logout } = useAuth();
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      setLoading(true);
      
      try {
        // Token kontrolü yap
        const userToken = await AsyncStorage.getItem('authToken');
        
        if (!userToken) {
          // Kullanıcı giriş yapmamışsa
          setIsLoggedIn(false);
          setLoading(false);
          return;
        }
        
        // Kullanıcı giriş yapmışsa
        setIsLoggedIn(true);
        
        // Önce boş bir kullanıcı objesi oluştur (null yerine)
        setUser({
          name: 'Kullanıcı',
          profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=User',
          rating: 0,
          ratingCount: 0,
          productsCount: 0,
          tradesCount: 0,
          location: 'Konum belirtilmemiş',
          joinDate: new Date().toISOString(),
        });
        
        // Route'dan kullanıcı ID'si gelirse o kullanıcının profilini göster, gelmezse kendi profilini göster
        const viewingUserId = route.params?.userId;
        
        if (viewingUserId) {
          // Başka bir kullanıcının profilini gösteriyoruz
          setIsCurrentUser(false);
          
          // Kullanıcı bilgisini API'den al
          try {
            const userInfo = await authService.getUserProfile(viewingUserId);
            if (userInfo && userInfo.user) {
              setUser(userInfo.user);
            }
          } catch (error) {
            console.error('Kullanıcı profili alınırken hata:', error);
            // Hata durumunda varsayılan değerlerle devam et
            setUser(prev => ({
              ...prev,
              id: viewingUserId,
              name: `Kullanıcı ${viewingUserId}`,
              profileImage: `https://placehold.co/200x200/E0E0E0/333333?text=${viewingUserId}`,
            }));
          }
          
          // Kullanıcının ürünlerini al
          fetchUserProducts(viewingUserId);
        } else {
          // Kendi profilimizi gösteriyoruz
          setIsCurrentUser(true);
          
          // Kullanıcı bilgilerini AsyncStorage'dan al
          try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              
              // Kendi ürünlerini ve takaslarını al
              fetchCurrentUserData(parsedUser.id || parsedUser._id);
            } else {
              // Yoksa API'den kullanıcı bilgilerini al
              try {
                const userInfo = await authService.getCurrentUser();
                if (userInfo && userInfo.success && userInfo.user) {
                  setUser(userInfo.user);
                  // Kullanıcı bilgilerini AsyncStorage'a kaydet
                  await AsyncStorage.setItem('user', JSON.stringify(userInfo.user));
                  
                  // Kendi ürünlerini ve takaslarını al
                  fetchCurrentUserData(userInfo.user.id || userInfo.user._id);
                }
              } catch (error) {
                console.error('Kullanıcı bilgileri alınamadı:', error);
                // Hata işlendi, varsayılan değerlerle devam et
              }
            }
          } catch (storageError) {
            console.error('AsyncStorage hatası:', storageError);
            // Storage hatası işlendi, varsayılan değerlerle devam et
          }
        }
      } catch (error) {
        console.error('Profil bilgisi alınırken hata:', error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoginStatus();
  }, [route.params]);
  
  // UserTradesScreen'den geri dönüşlerde güncellemeler için focus listener ekle
  useEffect(() => {
    // Ekrana her dönüşte verileri yenile
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id || user?._id) {
        // Hızlı tepki için async olarak yeni veri çekelim
        fetchUserTrades().catch(error => {
          console.error('Odaklandığında takas teklifleri güncellenirken hata:', error);
        });
      }
    });
    
    // Cleanup
    return unsubscribe;
  }, [navigation, user]);
  
  // Kullanıcı verilerini alma fonksiyonunu güncelliyoruz
  const fetchCurrentUserData = async (userId) => {
    if (!userId) return;
    
    try {
      // Kullanıcının ürünlerini al
      const productResponse = await fetchUserProducts(userId);
      
      // Kullanıcının takas tekliflerini al
      const tradeResponse = await fetchUserTrades();
      
      // Ürün ve takas sayılarını güncelle
      if (productResponse) {
        // Ürün sayısını kullanıcı bilgilerine ekle
        setUser(prev => ({
          ...prev,
          productsCount: products.length,
        }));
      }
      
      if (tradeResponse) {
        // Takas sayısını kullanıcı bilgilerine ekle
        const totalTrades = trades.sent.length + trades.received.length + trades.completed.length;
        setUser(prev => ({
          ...prev,
          tradesCount: totalTrades,
        }));
      }
    } catch (error) {
      console.error('Kullanıcı verileri alınırken hata:', error);
    }
  };
  
  // Kullanıcı ürünlerini al - Fonksiyondan response döndürelim
  const fetchUserProducts = async (userId) => {
    setProductsLoading(true);
    try {
      const response = await productService.getUserProducts(userId);
      if (response && response.success && Array.isArray(response.data)) {
        setProducts(response.data);
        return response;
      } else if (response && Array.isArray(response)) {
        setProducts(response);
        return response;
      } else {
        setProducts([]);
        return null;
      }
    } catch (error) {
      console.error('Ürünler alınırken hata:', error);
      setProducts([]);
      return null;
    } finally {
      setProductsLoading(false);
    }
  };
  
  // Kullanıcının takas tekliflerini al - Fonksiyondan response döndürelim
  const fetchUserTrades = async () => {
    setTradesLoading(true);
    try {
      // Gönderilen teklifler
      const sentResponse = await tradeOfferService.getSentTradeOffers();
      const sentTrades = sentResponse && sentResponse.success && Array.isArray(sentResponse.data) 
        ? sentResponse.data 
        : (Array.isArray(sentResponse) ? sentResponse : []);
      
      // Alınan teklifler
      const receivedResponse = await tradeOfferService.getReceivedTradeOffers();
      const receivedTrades = receivedResponse && receivedResponse.success && Array.isArray(receivedResponse.data) 
        ? receivedResponse.data 
        : (Array.isArray(receivedResponse) ? receivedResponse : []);
      
      // Takas tekliflerini durumlarına göre ayır
      const completed = [...sentTrades, ...receivedTrades].filter(
        trade => trade.status === 'completed' || trade.status === 'accepted'
      );
      
      // Ana state'i güncelle
      setTrades({
        sent: sentTrades.filter(trade => trade.status !== 'completed' && trade.status !== 'accepted'),
        received: receivedTrades.filter(trade => trade.status !== 'completed' && trade.status !== 'accepted'),
        completed
      });
      
      return { sent: sentTrades, received: receivedTrades };
    } catch (error) {
      console.error('Takas teklifleri alınırken hata:', error);
      return null;
    } finally {
      setTradesLoading(false);
    }
  };
  
  // Yenileme işlemi - daha kapsamlı
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (user?.id || user?._id) {
        const userId = user?.id || user?._id;
        
        // Paralel olarak hem ürün hem de takas verilerini güncelle
        const [productsResult, tradesResult] = await Promise.allSettled([
          fetchUserProducts(userId),
          fetchUserTrades()
        ]);
        
        // Sonuçları kontrol et
        if (productsResult.status === 'rejected') {
          console.error('Ürünler yenilenirken hata:', productsResult.reason);
        }
        
        if (tradesResult.status === 'rejected') {
          console.error('Takaslar yenilenirken hata:', tradesResult.reason);
        }
      }
    } catch (error) {
      console.error('Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          onPress: async () => {
            try {
              // AuthContext üzerinden çıkış yap
              await logout();
              
              // Login ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Çıkış yapılırken hata:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
        },
      ],
    );
  };

  const navigateToEditProfile = () => {
    navigation.navigate('ProfileEdit', { user });
  };

  const navigateToUserProducts = () => {
    navigation.navigate('UserProducts', { 
      userId: user?.id || user?._id,
      isCurrentUser: true // Kendi ürünlerini gösterdiğimizi belirt
    });
  };

  const navigateToUserTrades = () => {
    // Halihazırda profil ekranında gösterilen takas verilerini de gönderelim
    // Bu şekilde detay sayfasına geçişte veri kaybı olmayacak
    navigation.navigate('UserTrades', { 
      userId: user?.id || user?._id,
      isCurrentUser: true,
      initialTradeData: trades, // Mevcut takas verilerini aktar
      onTradeUpdated: () => {
        // Takas işlemi yapıldığında veriyi güncelle (callback)
        fetchUserTrades();
      }
    });
  };

  const formatJoinDate = (dateString) => {
    try {
      if (!dateString) return 'Bilinmiyor';
      
      // Geçerli bir tarih mi kontrol et
      const date = new Date(dateString);
      
      // Eğer geçersiz tarih ise (Invalid Date)
      if (isNaN(date.getTime())) {
        return 'Bilinmiyor';
      }
      
      return new Intl.DateTimeFormat('tr-TR', { 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
    } catch (error) {
      console.error('Tarih formatı hatası:', error);
      return 'Bilinmiyor';
    }
  };

  const formatUserName = (user) => {
    if (!user) return 'Kullanıcı';
    
    // Ad ve soyadını almaya çalış
    const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    
    // Eğer fullName varsa onu kullan
    if (fullName && fullName !== '') {
      return fullName;
    }
    
    // Sadece name varsa onu kullan
    if (user.name && user.name !== '') {
      return user.name;
    }
    
    // Kullanıcı adı/email çıkarma dene
    if (user.email) {
      // Email'den @ işaretinden öncesini al
      const username = user.email.split('@')[0];
      if (username) return username;
    }
    
    // Hiçbiri yoksa kullanıcı yaz
    return 'Kullanıcı';
  };

  const renderProductItem = ({ item }) => {
    // Ürün kimliğini kontrol et
    const productId = item.id || item._id;
    
    // Ürün bilgileri yoksa önlem al
    if (!productId) {
      console.warn('Ürün ID bilgisi eksik');
      return (
        <View style={styles.errorItem}>
          <Text>Ürün bilgisi hatalı</Text>
        </View>
      );
    }
    
    // Güvenli şekilde veri hazırla
    const title = item.title || 'İsimsiz Ürün';
    const description = item.description || '';
    const price = item.price || 0;
    // imageHelper kullanarak resim URL'sini al
    const imageUrl = getProductImageUrl(item);
    
    return (
    <Card
        title={title}
        description={description.length > 50 ? description.substring(0, 50) + '...' : description}
        price={price}
        imageUrl={imageUrl}
        onPress={() => {
          // Hata kontrolü yaparak geçiş
          try {
            console.log('Ürün detayına geçiliyor, ID:', productId, 'isCurrentUser:', isCurrentUser);
            
            // ÖNEMLİ: Ürün sahip bilgisi kullanıcının kendi profilinden açıldığında
            navigation.navigate('ProductDetail', { 
              productId: productId, // productId kullanıldığından emin olalım
              fromUserProducts: isCurrentUser, // Kullanıcının kendi profilinden
              isOwner: isCurrentUser, // Kendi profilinden geliyorsa kesinlikle sahibidir
              fromUserProfile: isCurrentUser // Ek parametre - profil sayfasından geldiğini belirt
            });
          } catch (error) {
            console.error('Ürün detayına geçiş hatası:', error);
            Alert.alert('Hata', 'Ürün detayları yüklenirken hata oluştu.');
          }
        }}
      style={{ marginBottom: 16 }}
    />
  );
  };
  
  // Takas kartı render fonksiyonu
  const renderTradeItem = ({ item, tradeType }) => {
    const statusText = {
      'pending': 'Beklemede',
      'accepted': 'Kabul Edildi',
      'rejected': 'Reddedildi',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    
    const statusColor = {
      'pending': '#FFA500',  // Turuncu
      'accepted': '#4CAF50', // Yeşil
      'rejected': '#F44336', // Kırmızı
      'completed': '#2196F3', // Mavi
      'cancelled': '#9E9E9E'  // Gri
    };
    
    const isSent = tradeType === 'sent';
    const otherPartyName = isSent ? (item.receiverName || 'Alıcı') : (item.senderName || 'Gönderici');
    
    // Takas kimliğini güvenli şekilde al
    const tradeId = item.id || item._id;
    
    // Takas ürünlerinin başlıklarını güvenli şekilde al
    const offeredProductTitle = item.offeredProductTitle || (item.offeredProduct?.title) || 'Ürün bilgisi alınamadı';
    const requestedProductTitle = item.requestedProductTitle || (item.requestedProduct?.title) || 'Ürün bilgisi alınamadı';
    
    // Ürün resimlerini imageHelper kullanarak güvenli şekilde al
    const offeredProductImage = 
      item.offeredProduct ? getProductImageUrl(item.offeredProduct) : 
      'https://placehold.co/600x400/e2e2e2/FFFFFF?text=No+Image';
      
    const requestedProductImage = 
      item.requestedProduct ? getProductImageUrl(item.requestedProduct) : 
      'https://placehold.co/600x400/e2e2e2/FFFFFF?text=No+Image';
    
    // Takas detayına geçiş işlevi
    const handleTradePress = (item) => {
      try {
        if (!item || !item._id) {
          console.error('Takas ID bulunamadı, detay sayfasına geçilemedi');
          Alert.alert('Hata', 'Takas detayları alınamadı. Lütfen daha sonra tekrar deneyin.');
          return;
        }
        
        // TradeOfferDetail ekranına yönlendir
        navigation.navigate('TradeOfferDetail', { 
          tradeId: item._id
        });
      } catch (error) {
        console.error('Takas detay sayfasına geçişte hata:', error);
        Alert.alert('Hata', 'Takas detayları alınamadı. Lütfen daha sonra tekrar deneyin.');
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.tradeItem}
        onPress={() => handleTradePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tradeHeader}>
          <View style={styles.tradeParty}>
            <Ionicons name={isSent ? "arrow-forward-circle-outline" : "arrow-back-circle-outline"} size={22} color="#666" />
            <Text style={styles.tradePartyText}>
              {isSent ? `${otherPartyName}'e Gönderildi` : `${otherPartyName}'den Alındı`}
            </Text>
          </View>
          <View style={[styles.tradeStatus, { backgroundColor: statusColor[item.status] || '#9E9E9E' }]}>
            <Text style={styles.tradeStatusText}>{statusText[item.status] || 'Bilinmiyor'}</Text>
          </View>
        </View>
        
        <View style={styles.tradeContent}>
          <View style={styles.tradeProducts}>
            <View style={styles.offerSide}>
              <Text style={styles.offerTitle}>Sizin Ürününüz:</Text>
              <Image source={{ uri: offeredProductImage }} style={styles.productThumbnail} />
              <Text style={styles.offerProductName} numberOfLines={2}>
                {offeredProductTitle}
              </Text>
            </View>
            
            <View style={styles.swapIconContainer}>
              <Ionicons name="swap-horizontal" size={24} color="#FF6B6B" style={styles.swapIcon} />
            </View>
            
            <View style={styles.offerSide}>
              <Text style={styles.offerTitle}>Karşı Ürün:</Text>
              <Image source={{ uri: requestedProductImage }} style={styles.productThumbnail} />
              <Text style={styles.offerProductName} numberOfLines={2}>
                {requestedProductTitle}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.tradeFooter}>
          <Text style={styles.tradeDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : 'Tarih bilgisi yok'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  // Kullanıcı giriş yapmamışsa login ekranını göster
  if (!isLoggedIn) {
    return (
      <View style={styles.notLoggedInContainer}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.notLoggedInTitle}>Profilinizi Görüntülemek İçin Giriş Yapın</Text>
        <Text style={styles.notLoggedInText}>
          Ürünlerinizi yönetmek, takaslarınızı görüntülemek ve mesajlarınızı okumak için giriş yapmanız gerekmektedir.
        </Text>
        <View style={styles.authButtonsContainer}>
          <Button 
            text="Giriş Yap" 
            onPress={navigateToLogin} 
            style={styles.loginButton}
          />
          <Button 
            text="Kayıt Ol" 
            onPress={navigateToRegister} 
            type="outline"
            style={styles.registerButton}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#FF6B6B']}
        />
      }
    >
      {/* Profil Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: user?.profileImage || 'https://placehold.co/200x200/E0E0E0/333333?text=User' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.userName}>{formatUserName(user)}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{user?.rating || 0} ({user?.ratingCount || 0} değerlendirme)</Text>
        </View>
        <Text style={styles.joinDate}>Üyelik: {formatJoinDate(user?.joinDate)}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.productsCount || products.length || 0}</Text>
            <Text style={styles.statLabel}>Ürün</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {user?.tradesCount || (trades.sent.length + trades.received.length + trades.completed.length) || 0}
            </Text>
            <Text style={styles.statLabel}>Takas</Text>
          </View>
        </View>
      </View>
      
      {/* Profil Detayları */}
      <View style={styles.profileDetails}>
        {user?.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        )}
        
        {/* Kişisel Bilgiler */}
        <View style={styles.personalInfoSection}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          
          {/* İsim Soyisim */}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#666" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>İsim Soyisim:</Text>
            <Text style={styles.infoValue}>
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.fullName || formatUserName(user)}
            </Text>
          </View>
          
          {/* E-posta */}
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#666" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>E-posta:</Text>
            <Text style={styles.infoValue}>{user?.email || 'Belirtilmemiş'}</Text>
          </View>
        </View>
        
        {/* Konum Bilgisi */}
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Konum</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={18} color="#666" style={styles.locationIcon} />
            <Text style={styles.locationText}>{user?.location || 'Konum belirtilmemiş'}</Text>
          </View>
        </View>
        
        {/* İşlemler Menüsü */}
          {isCurrentUser && (
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton} onPress={navigateToEditProfile}>
              <Ionicons name="create-outline" size={22} color="#333" />
              <Text style={styles.actionButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#333" />
              <Text style={styles.actionButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Son Takas Teklifleri */}
      <View style={styles.tradesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Takas Teklifleri</Text>
          <TouchableOpacity onPress={navigateToUserTrades}>
            <Text style={styles.seeAllButton}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        
        {tradesLoading ? (
          <ActivityIndicator size="small" color="#FF6B6B" style={{ marginVertical: 20 }} />
        ) : trades.sent.length === 0 && trades.received.length === 0 && trades.completed.length === 0 ? (
          <View style={styles.emptyTradesContainer}>
            <Ionicons name="swap-horizontal" size={40} color="#ccc" />
            <Text style={styles.emptyTradesText}>
              {isCurrentUser ? 
                'Henüz bir takas teklifiniz bulunmuyor.' :
                'Bu kullanıcının henüz bir takas teklifi bulunmuyor.'}
            </Text>
            {isCurrentUser && (
              <Text style={styles.emptyTradesSubText}>
                Takas yapmak istediğiniz ürünleri inceleyin ve teklif gönderin.
              </Text>
            )}
          </View>
        ) : (
          <View>
            {/* Bekleyen & Aktif Takaslar */}
            {trades.sent.length > 0 || trades.received.length > 0 ? (
              <View>
                <Text style={styles.tradeListTitle}>Aktif Takaslar</Text>
                <FlatList
                  data={[...trades.sent, ...trades.received].slice(0, 2)}
                  renderItem={({ item }) => renderTradeItem({ 
                    item, 
                    tradeType: trades.sent.includes(item) ? 'sent' : 'received' 
                  })}
                  keyExtractor={(item) => (item.id || item._id).toString()}
                  horizontal={false}
                  scrollEnabled={false}
                />
              </View>
            ) : null}
            
            {/* Tamamlanan Takaslar */}
            {trades.completed.length > 0 ? (
              <View style={{marginTop: 16}}>
                <Text style={styles.tradeListTitle}>Tamamlanan Takaslar</Text>
                <FlatList
                  data={trades.completed.slice(0, 2)}
                  renderItem={({ item }) => renderTradeItem({ 
                    item, 
                    tradeType: 'completed' 
                  })}
                  keyExtractor={(item) => (item.id || item._id).toString()}
                  horizontal={false}
                  scrollEnabled={false}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
      
      {/* Kullanıcının Ürünleri */}
      <View style={styles.userProductsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ürünler</Text>
          <TouchableOpacity onPress={navigateToUserProducts}>
            <Text style={styles.seeAllButton}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        
        {productsLoading ? (
          <ActivityIndicator size="small" color="#FF6B6B" style={{ marginVertical: 20 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyProductsContainer}>
            <Ionicons name="cube" size={40} color="#ccc" />
            <Text style={styles.emptyProductsText}>
              {isCurrentUser ? 
                'Henüz bir ürününüz bulunmuyor.' :
                'Bu kullanıcının henüz bir ürünü bulunmuyor.'}
            </Text>
            {isCurrentUser && (
              <Text style={styles.emptyProductsSubText}>
                Ürünlerinizi ekleyin ve takas yapın.
              </Text>
            )}
          </View>
        ) : (
          <View>
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => (item.id || item._id).toString()}
              horizontal={false}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  profileHeader: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e1e4e8',
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  joinDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
    width: '60%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  profileDetails: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  bioSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  personalInfoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  tradesSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  tradeListTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    marginBottom: 12,
  },
  emptyTradesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  emptyTradesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyTradesSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  userProductsSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 16,
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyProductsSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  tradeItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeParty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradePartyText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tradeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tradeStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tradeContent: {
    marginBottom: 12,
  },
  tradeProducts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerSide: {
    flex: 1,
    alignItems: 'center',
  },
  offerTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
  },
  offerProductName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#444',
  },
  swapIconContainer: {
    marginHorizontal: 6,
  },
  swapIcon: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 3,
  },
  tradeFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tradeDate: {
    fontSize: 12,
    color: '#888',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notLoggedInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  notLoggedInText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  authButtonsContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginButton: {
    flex: 1,
    marginRight: 8,
  },
  registerButton: {
    flex: 1,
    marginLeft: 8,
  },
});

export default ProfileScreen; 