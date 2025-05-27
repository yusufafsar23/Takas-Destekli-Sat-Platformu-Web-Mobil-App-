import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Banner, CategoryCard } from '../components';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { getProductImageUrl } from '../services/imageHelper';

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
    title: "Takas Destekli Modern Pazar",
    description: "İhtiyacınız olmayan ürünleri takas ederek hem doğayı koruyun hem de bütçenize katkı sağlayın."
  },
  {
    title: "Uygun Fiyatlı Alışveriş",
    description: "İkinci el ürünleri uygun fiyata alın, satın veya takas edin."
  },
  {
    title: "Güvenli Takas Platformu",
    description: "Güvenli ödeme sistemi ve kullanıcı puanlaması ile güvenle takas yapın."
  }
];

// Kategori verileri
const featuredCategories = [
  {
    id: 'games',
    title: 'Oyun Takası',
    description: 'Oynadığınız oyunları takas edin, koleksiyonunuzu büyütün',
    iconName: 'game-controller',
    buttonText: 'Oyunları Gör'
  },
  {
    id: 'books',
    title: 'Kitap Takası',
    description: 'Okuduğunuz kitapları paylaşın, yeni kitaplar keşfedin',
    iconName: 'book',
    buttonText: 'Kitapları Gör'
  },
  {
    id: 'sports',
    title: 'Spor Ürünleri',
    description: 'Spor malzemelerinizi değerlendirin veya uygun fiyata alın',
    iconName: 'football',
    buttonText: 'Spor Ürünlerini Gör'
  }
];

const HomeScreen = ({ navigation }) => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    isOfflineMode, 
    toggleOfflineMode, 
    checkNetworkConnectivity,
    isNetworkChecking
  } = useApp();

  // Verileri yükle
  const loadData = useCallback(async () => {
    setError(null);
    
    try {
      // Kategorileri yükle - sadece gerçek veritabanı verilerini kullan
      const categoriesResponse = await api.get('/categories');
      
      console.log("Kategoriler yanıtı:", JSON.stringify({
        status: "success",
        count: categoriesResponse.data?.count || categoriesResponse.data?.data?.length || 0
      }));
      
      // API'den gelen veriyi kontrol et ve doğru şekilde ayarla
      if (categoriesResponse && categoriesResponse.data) {
        // Backend API'sindeki data dizisini kullan
        if (categoriesResponse.data.success && Array.isArray(categoriesResponse.data.data)) {
          const categoriesData = categoriesResponse.data.data.map(category => ({
            ...category,
            id: category._id, // MongoDB _id'yi id'ye çevir
            icon: category.icon || getCategoryIcon(category.name || '') // Eğer ikon yoksa isimden tahmin et
          }));
          setCategories(categoriesData);
          console.log("Veritabanından kategoriler yüklendi. Veri sayısı:", categoriesData.length);
        } else if (Array.isArray(categoriesResponse.data)) {
          // Direkt dizi formatı
          const categoriesData = categoriesResponse.data.map(category => ({
            ...category,
            id: category._id || category.id,
            icon: category.icon || getCategoryIcon(category.name || '')
          }));
          setCategories(categoriesData);
          console.log("Veritabanından kategoriler yüklendi. Veri sayısı:", categoriesData.length);
        } else {
          console.log("Hiç kategori verisi bulunamadı veya format beklenmeyen şekilde");
          setCategories([]);
        }
      }
      
      // Öne çıkan ürünleri yükle - sadece gerçek veritabanı verilerini kullan
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
    } catch (error) {
      console.error('Ana sayfa verileri yüklenirken hata:', error);
      setError(error.customMessage || 'Veriler yüklenirken bir hata oluştu. Çevrimdışı mod etkinleştirin veya internet bağlantınızı kontrol edin.');
      setCategories([]);
      setFeaturedProducts([]);
    }
  }, []);

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
  const navigateToCategory = (categoryId, categoryName) => {
    navigation.navigate('ProductList', { 
      categoryId,
      title: categoryName || 'Ürünler'
    });
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
              onPress={() => navigateToCategory(category.id, category.title)}
            />
          ))}
        </View>
      </View>
      
      {/* Kategoriler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategoriler</Text>
        
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => navigateToCategory(category.id, category.name)}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name={getCategoryIcon(category.name)} size={22} color="#FF6B6B" />
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
              onPress={() => navigation.navigate('ProductList', { title: 'Tüm Ürünler' })}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#555',
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
});

export default HomeScreen; 