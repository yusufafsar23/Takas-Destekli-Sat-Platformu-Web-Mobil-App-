import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  Switch,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Banner, CategoryCard } from '../components';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { getProductImageUrl } from '../services/imageHelper';
import { bannerColors, categoryColors } from '../assets/images/images';
import { getBannerImage, getCategoryImage } from '../assets/images/ImageLoader';
import { OfflineIndicator } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper fonksiyonlar
const getCategoryIcon = (categoryName) => {
  if (!categoryName) return 'grid-outline';
  
  const name = categoryName.toLowerCase();
  if (name.includes('elektronik') || name.includes('telefon')) return 'phone-portrait';
  if (name.includes('bilgisay')) return 'laptop';
  if (name.includes('kitap') || name.includes('yayin')) return 'book';
  if (name.includes('giyim') || name.includes('kiyafet')) return 'shirt';
  if (name.includes('ev') || name.includes('mobilya')) return 'home';
  if (name.includes('spor') || name.includes('fitness')) return 'football';
  if (name.includes('oyun') || name.includes('konsol')) return 'game-controller';
  if (name.includes('müzik') || name.includes('enstrüman')) return 'musical-notes';
  if (name.includes('kamera') || name.includes('fotoğraf')) return 'camera';
  return 'grid-outline'; // Varsayılan ikon
};

const getCategoryName = (product) => {
  if (product.category) {
    if (typeof product.category === 'object') {
      return product.category.name || 'Kategori Yok';
    }
    if (typeof product.category === 'string') {
      return product.category;
    }
  }
  return 'Kategori Yok';
};

// Banner verileri
const bannerData = [
  {
    title: "Modern Takas Platformu",
    description: "İhtiyacınız olmayan ürünleri takas edin",
    backgroundColor: bannerColors.modern,
    imageUrl: getBannerImage('modern')
  },
  {
    title: "Uygun Fiyatlı Alışveriş",
    description: "İkinci el ürünleri uygun fiyata alın",
    backgroundColor: bannerColors.shopping,
    imageUrl: getBannerImage('shopping')
  },
  {
    title: "Güvenli Takas",
    description: "Güvenli ödeme sistemi ve kullanıcı puanlaması",
    backgroundColor: bannerColors.secure,
    imageUrl: getBannerImage('secure')
  }
];

// Kategori verileri
const featuredCategories = [
  {
    id: 'games',
    title: 'Oyun Takası',
    description: 'Oynadığınız oyunları takas edin, koleksiyonunuzu büyütün',
    iconName: 'game-controller',
    buttonText: 'Oyunları Gör',
    backgroundColor: categoryColors.games,
    imageUrl: getCategoryImage('games')
  },
  {
    id: 'books',
    title: 'Kitap Takası',
    description: 'Okuduğunuz kitapları paylaşın, yeni kitaplar keşfedin',
    iconName: 'book',
    buttonText: 'Kitapları Gör',
    backgroundColor: categoryColors.books,
    imageUrl: getCategoryImage('books')
  },
  {
    id: 'sports',
    title: 'Spor Ürünleri',
    description: 'Spor malzemelerinizi değerlendirin veya uygun fiyata alın',
    iconName: 'football',
    buttonText: 'Spor Ürünlerini Gör',
    backgroundColor: categoryColors.sports,
    imageUrl: getCategoryImage('sports')
  }
];

// Tüm kategoriler - Sabit kategoriler
const allCategories = [
  {
    id: 'electronics',
    name: 'Elektronik',
    icon: 'phone-portrait',
    slug: 'elektronik',
    description: 'Telefon, bilgisayar ve elektronik ürünler',
    color: '#FF6B6B', // Kırmızı
    mongoId: '68137aaf358c748f63723fc9' // Backend ID'si
  },
  {
    id: 'home',
    name: 'Ev Eşyaları',
    icon: 'home',
    slug: 'ev-esyalari',
    description: 'Mobilya ve ev dekorasyon ürünleri',
    color: '#4ECDC4', // Turkuaz
    mongoId: '68137aaf358c748f63723fca' // Backend ID'si
  },
  {
    id: 'fashion',
    name: 'Giyim',
    icon: 'shirt',
    slug: 'giyim',
    description: 'Giyim ve moda ürünleri',
    color: '#FF8A5B', // Turuncu
    mongoId: '68137ab0358c748f63723fcb' // Backend ID'si
  },
  {
    id: 'books',
    name: 'Kitap & Hobi',
    icon: 'book',
    slug: 'kitap-hobi',
    description: 'Kitaplar ve hobi malzemeleri',
    color: '#6A5ACD', // Mor
    mongoId: '68137ab0358c748f63723fcc' // Backend ID'si
  },
  {
    id: 'sports',
    name: 'Spor',
    icon: 'football',
    slug: 'spor',
    description: 'Spor ekipmanları ve giyim',
    color: '#1E90FF', // Mavi
    mongoId: '68137ab3358c748f63723fee' // Backend ID'si
  },
  {
    id: 'games',
    name: 'Oyun & Konsol',
    icon: 'game-controller',
    slug: 'oyun-konsol',
    description: 'Video oyunları ve konsollar',
    color: '#7CB518', // Yeşil
    mongoId: '68137ab2358c748f63723fe5' // Backend ID'si
  }
];

const HomeScreen = ({ navigation }) => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [latestProducts, setLatestProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    isOfflineMode, 
    toggleOfflineMode, 
    checkNetworkConnectivity,
    isNetworkChecking,
    setIsOfflineMode,
    forceOnlineMode
  } = useApp();

  // İlk yüklemede online moda geçiş yap
  useEffect(() => {
    const enableOnlineMode = async () => {
      try {
        await forceOnlineMode();
        console.log('Online mod aktifleştirildi');
      } catch (error) {
        console.error('Online mod ayarlanırken hata:', error);
      }
    };
    
    enableOnlineMode();
  }, []);

  // Verileri yükle
  const loadData = useCallback(async () => {
    setError(null);
    
    try {
      // Sabit kategorileri kullan
      setCategories(allCategories);
      
      // Öne çıkan ürünleri yükle
      try {
        const featuredResponse = await api.get('/products/featured');
        
        console.log("Öne çıkan ürünler yanıtı:", JSON.stringify({
          status: "success",
          count: featuredResponse.data?.count || featuredResponse.data?.data?.length || 0
        }));
        
        // API'den gelen veriyi kontrol et ve doğru şekilde ayarla
        if (featuredResponse && featuredResponse.data) {
          // Backend API'sindeki data dizisini kullan
          if (featuredResponse.data.success && Array.isArray(featuredResponse.data.data)) {
            const productsData = featuredResponse.data.data.map(product => ({
              ...product,
              id: product._id, // MongoDB _id'yi id'ye çevir
              imageUrl: getProductImageUrl(product),
              categoryName: getCategoryName(product)
            }));
            setFeaturedProducts(productsData);
            console.log("Veritabanından öne çıkan ürünler yüklendi. Ürün sayısı:", productsData.length);
          } else if (Array.isArray(featuredResponse.data)) {
            const productsData = featuredResponse.data.map(product => ({
              ...product,
              id: product._id || product.id,
              imageUrl: getProductImageUrl(product),
              categoryName: getCategoryName(product)
            }));
            setFeaturedProducts(productsData);
            console.log("Veritabanından öne çıkan ürünler yüklendi. Ürün sayısı:", productsData.length);
          } else {
            console.log("Hiç öne çıkan ürün bulunamadı veya format beklenmeyen şekilde");
            // Öne çıkan ürün bulunamadı, normal ürünleri almayı dene
            const regularResponse = await api.get('/products', { params: { limit: 6 } });
            
            if (regularResponse.data && regularResponse.data.success && Array.isArray(regularResponse.data.data)) {
              const regularProductsData = regularResponse.data.data.map(product => ({
                ...product,
                id: product._id,
                imageUrl: getProductImageUrl(product),
                categoryName: getCategoryName(product)
              }));
              setFeaturedProducts(regularProductsData);
              console.log("Veritabanından normal ürünler yüklendi. Ürün sayısı:", regularProductsData.length);
            } else if (Array.isArray(regularResponse.data)) {
              const regularProductsData = regularResponse.data.map(product => ({
                ...product,
                id: product._id || product.id,
                imageUrl: getProductImageUrl(product),
                categoryName: getCategoryName(product)
              }));
              setFeaturedProducts(regularProductsData);
              console.log("Veritabanından normal ürünler yüklendi. Ürün sayısı:", regularProductsData.length);
            } else {
              setFeaturedProducts([]);
            }
          }
        } else {
          setFeaturedProducts([]);
        }
      } catch (productError) {
        console.error('Ürünler yüklenirken hata:', productError);
        // Ürünler alınamadıysa, normal ürünleri almayı dene
        try {
          console.log("Öne çıkan ürün bulunamadı, normal ürünleri alınıyor...");
          const regularResponse = await api.get('/products', { params: { limit: 6 } });
          
          if (regularResponse.data && regularResponse.data.success && Array.isArray(regularResponse.data.data)) {
            const regularProductsData = regularResponse.data.data.map(product => ({
              ...product,
              id: product._id,
              imageUrl: getProductImageUrl(product),
              categoryName: getCategoryName(product)
            }));
            setFeaturedProducts(regularProductsData);
            console.log("Veritabanından normal ürünler yüklendi. Ürün sayısı:", regularProductsData.length);
          } else {
            setFeaturedProducts([]);
          }
        } catch (altError) {
          console.error("Alternatif ürün verisi alınırken hata:", altError);
          setFeaturedProducts([]);
        }
      }
      
      // En son eklenen ürünleri yükle
      try {
        const latestResponse = await api.get('/products', { 
          params: { 
            limit: 4, // 4 ürün göster
            sort: '-createdAt' // Oluşturma tarihine göre ters sıralama (en yeni önce)
          } 
        });
        
        console.log("En son eklenen ürünler yanıtı:", JSON.stringify({
          status: "success",
          count: latestResponse.data?.count || latestResponse.data?.data?.length || 0
        }));
        
        // API'den gelen veriyi kontrol et ve doğru şekilde ayarla
        if (latestResponse && latestResponse.data) {
          // Backend API'sindeki data dizisini kullan
          if (latestResponse.data.success && Array.isArray(latestResponse.data.data)) {
            const latestData = latestResponse.data.data.map(product => ({
              ...product,
              id: product._id, // MongoDB _id'yi id'ye çevir
              imageUrl: getProductImageUrl(product),
              categoryName: getCategoryName(product)
            }));
            setLatestProducts(latestData);
            console.log("Veritabanından en son eklenen ürünler yüklendi. Ürün sayısı:", latestData.length);
          } else if (Array.isArray(latestResponse.data)) {
            const latestData = latestResponse.data.map(product => ({
              ...product,
              id: product._id || product.id,
              imageUrl: getProductImageUrl(product),
              categoryName: getCategoryName(product)
            }));
            setLatestProducts(latestData);
            console.log("Veritabanından en son eklenen ürünler yüklendi. Ürün sayısı:", latestData.length);
          }
        }
      } catch (error) {
        console.error("En son eklenen ürünleri yüklerken hata:", error);
      }
      
      // Offline mod ayarı
      // ... existing code ...
      
    } catch (e) {
      console.error('Ana sayfa verileri yüklenirken hata:', e);
      setError(e.customMessage || 'Veriler yüklenirken bir hata oluştu. Çevrimdışı mod etkinleştirin veya internet bağlantınızı kontrol edin.');
      setCategories([]);
      setFeaturedProducts([]);
      setLatestProducts([]);
    }
  }, [isOfflineMode]);

  // İlk yüklemede verileri getir
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sayfa yenileme işlemi
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await loadData();
    } catch (error) {
      // Hata zaten loadData içinde işleniyor
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // Ürün detayına gitme
  const goToProductDetail = (productId) => {
    navigation.navigate('ProductDetail', { productId });
  };

  // Kategori ürünlerine gitme 
  const navigateToCategory = (categoryId, categoryName, categorySlug) => {
    // Hafif dokunmatik geri bildirim
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.log('Haptic feedback desteklenmiyor', err);
    }
    
    // Seçilen kategoriyi bul
    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    
    console.log('Kategoriye yönlendiriliyor:', { 
      id: categoryId, 
      name: categoryName, 
      slug: categorySlug,
      mongoId: selectedCategory?.mongoId 
    });
    
    // Kategori filtresini hazırla
    const params = { 
      title: categoryName || 'Ürünler',
      categoryName: categoryName, // Kategori adını gönder
      categorySlug: categorySlug, // Kategori slug'ını gönder
      exactCategory: true, // Tam eşleşme isteğini belirt
      isMainCategory: true, // Ana kategori olduğunu belirt
    };
    
    // MongoDB ID'si varsa ekle
    if (selectedCategory?.mongoId) {
      params.categoryId = selectedCategory.mongoId;
      
      // Elektronik kategorisi için özel işlem
      if (categoryId === 'electronics' || categoryName.toLowerCase() === 'elektronik') {
        params.isElektronikFilter = true;
        console.log('Elektronik kategorisi için özel filtreleme parametresi eklendi');
      }
    }
    
    // Kategori ürünlerini getir (Stack navigasyonu kullan)
    navigation.navigate('ProductListScreen', params);
  };

  // Ürün kartını render eden fonksiyon
  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => goToProductDetail(item.id)}
    >
      <Card
        imageUrl={item.imageUrl}
        title={item.title}
        description={item.categoryName}
        price={item.price}
      />
    </TouchableOpacity>
  );

  // Küçük ürün kartını render eden fonksiyon
  const renderSmallProductItem = (product) => (
    <TouchableOpacity 
      key={product.id}
      style={styles.latestProductCard}
      onPress={() => goToProductDetail(product.id)}
    >
      <View style={styles.smallerCard}>
        <Image 
          source={{ uri: product.imageUrl }}
          style={styles.smallerCardImage}
          resizeMode="cover"
        />
        <View style={styles.smallerCardContent}>
          <Text style={styles.smallerCardTitle} numberOfLines={1}>{product.title}</Text>
          <Text style={styles.smallerCardDescription} numberOfLines={1}>{product.categoryName}</Text>
          <Text style={styles.smallerCardPrice}>{product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₺</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Offline göstergesi */}
      <OfflineIndicator />
      
      {/* Offline mod kontrol alanı */}
      <View style={styles.offlineSwitchContainer}>
        <Text style={styles.offlineText}>Çevrimdışı Mod</Text>
        <Switch
          value={isOfflineMode}
          onValueChange={toggleOfflineMode}
          trackColor={{ false: "#ccc", true: "#FF6B6B" }}
          thumbColor={isOfflineMode ? "#fff" : "#f4f3f4"}
        />
      </View>
      
      {error && (
        <TouchableOpacity 
          style={styles.errorContainer}
          onPress={checkNetworkConnectivity}
          disabled={isNetworkChecking}
        >
          <Ionicons name="warning-outline" size={20} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
          {isNetworkChecking ? (
            <Text style={styles.retryText}>Kontrol ediliyor...</Text>
          ) : (
            <Text style={styles.retryText}>Tekrar dene</Text>
          )}
        </TouchableOpacity>
      )}
      
      {/* Banner Slider */}
      <Banner items={bannerData} />

      {/* Öne Çıkan Kategoriler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Öne Çıkan Kategoriler</Text>
        <View style={styles.categoryCardsContainer}>
          {featuredCategories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              iconName={category.iconName}
              buttonText={category.buttonText}
              imageUrl={category.imageUrl}
              localImage={category.localImage}
              backgroundColor={category.backgroundColor}
              onPress={() => navigateToCategory(category.id, category.title, category.slug)}
            />
          ))}
        </View>
      </View>
      
      {/* Kategoriler */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kategoriler</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ProductListScreen', { title: 'Tüm Kategoriler' })}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
            <Ionicons name="chevron-forward" size={14} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.categoriesContainer}>
          {allCategories.map((category) => (
              <TouchableOpacity 
              key={category.id}
                style={styles.categoryItem}
              onPress={() => navigateToCategory(
                category.id, 
                category.name, 
                category.slug
              )}
              activeOpacity={0.7}
              >
              <View style={[styles.categoryIcon, { backgroundColor: category.color ? `${category.color}20` : '#EFF6FF' }]}>
                <Ionicons name={category.icon} size={26} color={category.color || '#FF6B6B'} />
                </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Öne Çıkan Ürünler */}
      {featuredProducts.length > 0 && (
      <View style={styles.section}>
          <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Öne Çıkan Ürünler</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ProductListScreen', { title: 'Tüm Ürünler' })}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="chevron-forward" size={14} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productsContainer}>
            {featuredProducts.map((product) => (
              <Card
                key={product.id}
                title={product.title}
                description={product.categoryName || 'Genel'}
                price={product.price}
                imageUrl={product.imageUrl}
                style={styles.productCard}
                onPress={() => goToProductDetail(product.id)}
              />
            ))}
          </View>
        </View>
        )}
        
        {/* En Son Eklenen İlanlar Bölümü */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>En Son Eklenen İlanlar</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('ProductListScreen', { title: 'Tüm İlanlar' })}
            >
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
          
          {latestProducts.length > 0 ? (
            <View style={styles.latestProductsGrid}>
              {latestProducts.map(product => renderSmallProductItem(product))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Henüz ilan bulunamadı</Text>
            </View>
          )}
        </View>
        
        {/* Bottom padding for scrolling */}
        <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  offlineSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  categoryCardsContainer: {
    marginBottom: 18,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 0,
    paddingVertical: 5,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    height: 100,
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  categoryName: {
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  productsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    marginBottom: 12,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  latestProductsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  latestProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  latestProductCard: {
    width: '48%',
    marginBottom: 12,
  },
  smallerCard: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  smallerCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  smallerCardContent: {
    padding: 10,
  },
  smallerCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  smallerCardDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  smallerCardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 2,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
});

export default HomeScreen; 