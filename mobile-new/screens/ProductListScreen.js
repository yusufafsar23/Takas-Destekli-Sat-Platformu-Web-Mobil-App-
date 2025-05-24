import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView
} from 'react-native';
import { Searchbar, Chip, Menu, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { productService, categoryService } from '../services';
import { getProductImageUrl } from '../services/imageHelper';
import { Card } from '../components/Card';
import { useApp } from '../context/AppContext';

// Helper fonksiyonlar
const getCategoryName = (product) => {
  try {
    if (!product) return 'Kategori Yok';
    
    if (product.category) {
      if (typeof product.category === 'object' && product.category !== null) {
        return product.category.name || 'Kategori Yok';
      }
      if (typeof product.category === 'string') {
        return product.category;
      }
    }
    
    if (product.categoryName) {
      return product.categoryName;
    }
    
    return 'Kategori Yok';
  } catch (error) {
    console.error("Kategori ismi alınırken hata:", error);
    return 'Kategori Yok';
  }
};

// Tüm ana kategori ve alt kategorileri tanımla
const CATEGORIES_WITH_SUBCATEGORIES = {
  // Elektronik kategorisi ve alt kategorileri
  '68137aaf358c748f63723fc9': [ // Elektronik
    '68137ab2358c748f63723fe4', // Telefonlar
    '68137ab2358c748f63723fe6', // Bilgisayarlar
    '68137ab2358c748f63723fe7', // Televizyonlar
    '68137ab2358c748f63723fe8'  // Ses Sistemleri
  ],
  // Ev Eşyaları kategorisi ve alt kategorileri
  '68137aaf358c748f63723fca': [ // Ev Eşyaları
    '68137ab1358c748f63723fd1', // Mobilya
    '68137ab1358c748f63723fd4', // Mutfak Eşyaları
    '68137ab1358c748f63723fd6', // Yatak ve Banyo
    '68137ab1358c748f63723fd2'  // Dekorasyon
  ],
  // Giyim kategorisi ve alt kategorileri
  '68137ab0358c748f63723fcb': [ // Giyim
    '68137ab0358c748f63723fcd', // Kadın Giyim
    '68137ab1358c748f63723fcf', // Erkek Giyim
    '68137ab1358c748f63723fd0', // Çocuk Giyim
    '68137ab3358c748f63723ff2'  // Ayakkabı ve Çanta
  ],
  // Kitap & Hobi kategorisi ve alt kategorileri
  '68137ab0358c748f63723fcc': [ // Kitap & Hobi
    '68137ab1358c748f63723fd3', // Kitaplar
    '68137ab1358c748f63723fd5', // Müzik & Film
    '68137ab1358c748f63723fd7', // Koleksiyon
    '68137ab1358c748f63723fd8'  // El İşi
  ],
  // Spor kategorisi ve alt kategorileri
  '68137ab3358c748f63723fee': [ // Spor
    '68137ab3358c748f63723fef', // Spor Malzemeleri
    '68137ab3358c748f63723ff0', // Outdoor
    '68137ab3358c748f63723ff1', // Fitness
    '68137ab4358c748f63723ff3'  // Bisiklet & Scooter
  ],
  // Oyun & Konsol kategorisi ve alt kategorileri
  '68137ab2358c748f63723fe5': [ // Oyun & Konsol
    '68137ab2358c748f63723fe9', // Konsollar
    '68137ab2358c748f63723fea', // Oyunlar
    '68137ab2358c748f63723feb'  // Aksesuarlar
  ]
};

// Kategori slug'ından kategori adını alma
const getCategoryNameBySlug = (slug) => {
  const categoryNames = {
    'elektronik': 'Elektronik',
    'ev-esyalari': 'Ev Eşyaları',
    'giyim': 'Giyim',
    'kitap-hobi': 'Kitap & Hobi',
    'spor': 'Spor',
    'oyun-konsol': 'Oyun & Konsol'
  };
  return categoryNames[slug] || '';
};

// Kategori ID'sinden slug'a dönüştürme
const getSlugByCategoryId = (categoryId) => {
  if (!categoryId) return '';
  
  // Burası uygulamanın ihtiyacına göre değiştirilebilir
  // Gerçek uygulamada backend'den kategori bilgisini alabilirsiniz
  const slugMap = {
    'electronics': 'elektronik',
    'home': 'ev-esyalari',
    'fashion': 'giyim',
    'books': 'kitap-hobi',
    'sports': 'spor',
    'games': 'oyun-konsol'
  };
  
  return slugMap[categoryId] || '';
};

// Kategori-özel alt kategoriler
const SUBCATEGORIES = {};

const ProductListScreen = ({ route, navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortOption, setSortOption] = useState('En Yeni');
  const [error, setError] = useState(null);
  const [isElektronikFilter, setIsElektronikFilter] = useState(false);

  const { isOfflineMode } = useApp();

  // Kategorileri yükle
  const fetchCategories = useCallback(async () => {
    try {
      console.log('Fetching all categories');
      const response = await categoryService.getCategories();
      
      if (response && response.success && Array.isArray(response.data)) {
        const categoriesData = response.data.map(cat => ({
          ...cat,
          id: cat._id // MongoDB _id'sini id'ye eşleştir
        }));
        setCategories(categoriesData);
        console.log(`${categoriesData.length} kategori yüklendi`);

        // Kategori ismine göre kategori seçimi yap
        if (route.params?.categoryName && categoriesData.length > 0) {
          const categoryNameLower = route.params.categoryName.toLowerCase();
          const foundCategory = categoriesData.find(cat => 
            cat.name?.toLowerCase() === categoryNameLower
          );
          
          if (foundCategory) {
            console.log('Kategori ismiyle eşleşen kategori bulundu:', foundCategory.name);
            setSelectedCategory(foundCategory._id || foundCategory.id);
          }
        }
      } else if (Array.isArray(response)) {
        // Doğrudan dizi döndürülmüş ise
        setCategories(response);
        
        // Kategori ismine göre kategori seçimi yap
        if (route.params?.categoryName && response.length > 0) {
          const categoryNameLower = route.params.categoryName.toLowerCase();
          const foundCategory = response.find(cat => 
            cat.name?.toLowerCase() === categoryNameLower
          );
          
          if (foundCategory) {
            console.log('Kategori ismiyle eşleşen kategori bulundu:', foundCategory.name);
            setSelectedCategory(foundCategory._id || foundCategory.id);
          }
        }
      } else {
        console.error('Kategori verisi istenilen formatta değil:', response);
        setCategories([]);
      }
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
      setCategories([]);
    }
  }, [route.params?.categoryName]);

  // Route parametrelerinden arama terimi veya kategori ID'si alınıyor
  useEffect(() => {
    if (route.params) {
      console.log('Route params received:', route.params);
      
      if (route.params.search) {
        setSearchQuery(route.params.search);
      } else if (route.params.searchTerm) {
        setSearchQuery(route.params.searchTerm);
      }
      
      if (route.params.categoryId) {
        console.log('Setting selected category:', route.params.categoryId);
        setSelectedCategory(route.params.categoryId);
      }
      
      // Elektronik kategorisi için özel işlem
      if (route.params.isElektronikFilter) {
        console.log('Elektronik kategorisi için özel filtreleme parametresi algılandı');
        setIsElektronikFilter(true);
      }
      
      if (route.params.sort === 'newest') {
        setSortOption('En Yeni');
      }
    }
  }, [route.params]);

  // İlk yüklemede kategorileri getir
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  
  // Ürünleri yükle
  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, sortOption]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Filtreleme parametrelerini hazırla
      const filters = {};
      
      // Arama sorgusuna göre filtrele
      if (searchQuery) {
        filters.search = searchQuery;
      }
      
      // Kategoriye göre filtrele
      let selectedCategoryId = null;
      
      if (selectedCategory && selectedCategory !== 'all') {
        console.log('Filtering by category:', selectedCategory);
        selectedCategoryId = selectedCategory;
        
        // Ana kategori kontrolü
        if (CATEGORIES_WITH_SUBCATEGORIES[selectedCategory]) {
          console.log(`${selectedCategory} ana kategorisi için alt kategorileri de getir`);
          // Ana kategori için özel işlem yapılacak
        } else {
          // Normal kategori filtresi ekle
          filters.category = selectedCategory;
        }
      }
      
      // Kategori adı ile filtreleme
      if (route.params?.categoryName) {
        const categoryNameForFilter = route.params.categoryName.toLowerCase();
        console.log('Kategori adı filtrelemesi yapılıyor:', categoryNameForFilter);
        
        // Ana kategori adı ile filtreleme
        filters.categoryName = route.params.categoryName;
        
        // Elektronik ana kategorisi için özel işlem
        if (categoryNameForFilter === 'elektronik' || 
            route.params.categoryId === '68137aaf358c748f63723fc9') {
          setIsElektronikFilter(true);
          console.log('Elektronik kategorisi için özel filtreleme aktif edildi');
        }
      }
      
      // Tam kategori eşleşmesi isteniyorsa
      if (route.params?.exactCategory) {
        filters.exactCategory = true;
        
        // Kategori adı varsa ve seçili kategori yoksa, kategori adını kullan
        if (route.params.categoryName && !selectedCategoryId) {
          filters.categoryName = route.params.categoryName;
          console.log('Filtreleme için kategori adı kullanılıyor:', route.params.categoryName);
        }
      }
      
      // Daha fazla ürün getir
      filters.limit = 100;
      
      // Sıralama seçeneğine göre sırala
      switch (sortOption) {
        case 'Fiyat Artan':
          filters.sort = 'price';
          break;
        case 'Fiyat Azalan':
          filters.sort = '-price';
          break;
        case 'En Yeni':
        default:
          filters.sort = '-createdAt';
          break;
      }
      
      let productsData = [];
      
      // Elektronik ana kategorisi için özel işlem
      if (isElektronikFilter) {
        console.log('Elektronik kategorisi ve alt kategorileri için özel filtreleme yapılıyor...');
        
        try {
          // Elektronik ürünlerini başlık bazlı filtreleme ile getir
          const electronicKeywords = ['telefon', 'bilgisayar', 'tablet', 'laptop', 'televizyon', 'tv', 'elektronik'];
          
          // Tüm ürünleri getir ve sonra filtrele
          const basicFilters = { ...filters };
          delete basicFilters.categoryName; // Kategori adını kaldır
          
          const response = await productService.getProducts(basicFilters);
          
          if (response && response.success && Array.isArray(response.data)) {
            // Elektronik ürünlerini başlık ve açıklamaya göre filtrele
            const electronicsProducts = response.data.filter(product => {
              const title = (product.title || '').toLowerCase();
              const description = (product.description || '').toLowerCase();
              const category = typeof product.category === 'object' 
                ? (product.category?.name || '').toLowerCase() 
                : (product.category || '').toLowerCase();
              
              // Kategori adı, başlık veya açıklamada elektronik anahtar kelimeleri var mı?
              return category.includes('elektronik') || 
                     electronicKeywords.some(keyword => title.includes(keyword)) ||
                     electronicKeywords.some(keyword => description.includes(keyword));
            });
            
            console.log(`Elektronik kategorisi için ${electronicsProducts.length} ürün bulundu`);
            
            productsData = electronicsProducts.map(product => ({
              ...product,
              id: product._id || product.id || `product-${Math.random().toString(36).substr(2, 9)}`,
              imageUrl: getProductImageUrl(product) || 'https://placehold.co/600x400/gray/white?text=No+Image',
              categoryName: product.category?.name || product.categoryName || product.category || 'Elektronik'
            }));
          }
        } catch (error) {
          console.error('Elektronik ürünleri getirilirken hata:', error);
          setError('Ürünler yüklenirken bir hata oluştu.');
        }
      } else if (selectedCategoryId && CATEGORIES_WITH_SUBCATEGORIES[selectedCategoryId]) {
        console.log(`${selectedCategoryId} kategorisi ve alt kategorileri için özel filtreleme yapılıyor...`);
        
        // Kategori bilgisini debug logla
        if (selectedCategoryId === '68137ab0358c748f63723fcc') {
          console.log('Kitap & Hobi kategorisi için alt kategoriler:', 
                    CATEGORIES_WITH_SUBCATEGORIES[selectedCategoryId].join(', '));
        } else if (selectedCategoryId === '68137aaf358c748f63723fc9') {
          console.log('Elektronik kategorisi için alt kategoriler:',
                    CATEGORIES_WITH_SUBCATEGORIES[selectedCategoryId].join(', '));
        }
        
        // Ana kategori ve alt kategorilerinin her biri için ayrı ayrı istek gönder
        const allProductsPromises = [
          // Ana kategori için istek
          productService.getProducts({...filters, category: selectedCategoryId}),
          // Alt kategoriler için istekler
          ...CATEGORIES_WITH_SUBCATEGORIES[selectedCategoryId].map(categoryId => 
            productService.getProducts({...filters, category: categoryId})
          )
        ];
        
        // Tüm isteklerin tamamlanmasını bekle
        const results = await Promise.all(allProductsPromises);
        
        // Tüm sonuçları birleştir
        let allProducts = [];
        results.forEach((response, index) => {
          if (response && response.success && Array.isArray(response.data)) {
            console.log(`Sorgu ${index}: ${response.data.length} ürün bulundu`);
            allProducts = [...allProducts, ...response.data];
          } else if (Array.isArray(response)) {
            console.log(`Sorgu ${index}: ${response.length} ürün bulundu`);
            allProducts = [...allProducts, ...response];
          } else if (response && response.data && Array.isArray(response.data)) {
            console.log(`Sorgu ${index}: ${response.data.length} ürün bulundu`);
            allProducts = [...allProducts, ...response.data];
          } else {
            console.log(`Sorgu ${index}: Ürün bulunamadı veya hata oluştu`);
          }
        });
        
        // Veriyi formatla
        productsData = allProducts.map(product => ({
          ...product,
          id: product._id || product.id || `product-${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: getProductImageUrl(product) || 'https://placehold.co/600x400/gray/white?text=No+Image',
          categoryName: getCategoryName(product)
        }));
        
        console.log(`${selectedCategoryId} kategorisi ve alt kategorileri için toplam ${productsData.length} ürün bulundu`);
      } else {
        // Normal kategoriler için standart API isteği
        console.log('Requesting products with filters:', filters);
        
        // API'dan ürünleri getir
        const response = await productService.getProducts(filters);
        
        if (response && response.success && Array.isArray(response.data)) {
          // MongoDB yanıtı
          productsData = response.data.map(product => ({
            ...product,
            id: product._id || product.id || `product-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: getProductImageUrl(product) || 'https://placehold.co/600x400/gray/white?text=No+Image',
            categoryName: getCategoryName(product)
          }));
          
          console.log(`${productsData.length} ürün yüklendi`);
        } else if (Array.isArray(response)) {
          // Doğrudan dizi döndürülmüş ise
          productsData = response.map(product => ({
            ...product,
            id: product._id || product.id || `product-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: getProductImageUrl(product) || 'https://placehold.co/600x400/gray/white?text=No+Image',
            categoryName: getCategoryName(product)
          }));
        } else if (response && response.data && Array.isArray(response.data)) {
          // Farklı bir format
          productsData = response.data.map(product => ({
            ...product,
            id: product._id || product.id || `product-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: getProductImageUrl(product) || 'https://placehold.co/600x400/gray/white?text=No+Image',
            categoryName: getCategoryName(product)
          }));
        } else {
          console.error('Ürün verisi istenilen formatta değil:', response);
          setError('Ürünler yüklenirken bir hata oluştu');
          productsData = [];
        }
      }
      
      setProducts(productsData);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      setError(`Ürünler yüklenirken bir hata oluştu. ${error.message || 'Bilinmeyen hata'}`);
      setProducts([]);
    } finally {
      // Özel durumlarda kullanıcı tarafında sıralama yap
      // Eğer isElektronikFilter veya alt kategorileri olan bir kategori seçilmişse,
      // bu durumda birden fazla API çağrısı yapıldığı için server-side sıralama tam olarak çalışmıyor olabilir
      if (products.length > 0 && (isElektronikFilter || (selectedCategory && CATEGORIES_WITH_SUBCATEGORIES[selectedCategory]))) {
        console.log('Özel kategori için client-side sıralama yapılıyor:', sortOption);
        
        let sortedProducts = [...products];
        
        // Fiyata göre sıralama yap
        switch (sortOption) {
          case 'Fiyat Artan':
            sortedProducts.sort((a, b) => {
              const priceA = a.price ? parseFloat(a.price) : 0;
              const priceB = b.price ? parseFloat(b.price) : 0;
              return priceA - priceB;
            });
            setProducts(sortedProducts);
            console.log('Ürünler artan fiyata göre sıralandı');
            break;
          case 'Fiyat Azalan':
            sortedProducts.sort((a, b) => {
              const priceA = a.price ? parseFloat(a.price) : 0;
              const priceB = b.price ? parseFloat(b.price) : 0;
              return priceB - priceA;
            });
            setProducts(sortedProducts);
            console.log('Ürünler azalan fiyata göre sıralandı');
            break;
          // Yeni sıralama için default case gerekmiyor, server-side ile gelen sıralamayı kullan
        }
      }
      
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  const onSearch = () => {
    fetchProducts();
  };

  const goToProductDetail = (productId) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => {
        const productId = item._id || item.id;
        if (productId) goToProductDetail(productId);
      }}
      style={styles.productCard}
    >
      <View style={styles.card}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.productImage} 
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>{item.title || 'İsimsiz Ürün'}</Text>
          <Text style={styles.productPrice}>
            {item.price !== undefined && item.price !== null 
              ? `${Number(item.price).toLocaleString('tr-TR')} ₺` 
              : '0 ₺'}
          </Text>
          <Text style={styles.productCategory}>{item.categoryName || 'Kategori Yok'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Ne Arıyorsunuz?"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          onSubmitEditing={onSearch}
        />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity 
              style={styles.sortButton} 
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#FF6B6B" />
              <Text style={styles.sortButtonText}>{sortOption}</Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item onPress={() => {
            setSortOption('En Yeni');
            setMenuVisible(false);
          }} title="En Yeni" />
          <Menu.Item onPress={() => {
            setSortOption('Fiyat Artan');
            setMenuVisible(false);
          }} title="Fiyat Artan" />
          <Menu.Item onPress={() => {
            setSortOption('Fiyat Azalan');
            setMenuVisible(false);
          }} title="Fiyat Azalan" />
        </Menu>
      </View>
      
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <Chip
              selected={selectedCategory === item._id}
              onPress={() => {
                setSelectedCategory(selectedCategory === item._id ? null : item._id);
              }}
              style={[
                styles.categoryChip,
                selectedCategory === item._id && styles.selectedCategoryChip
              ]}
              textStyle={[
                styles.categoryChipText,
                selectedCategory === item._id && styles.selectedCategoryChipText
              ]}
            >
              {item.name}
            </Chip>
          )}
          keyExtractor={item => item._id || item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          ListHeaderComponent={
            <Chip
              selected={selectedCategory === null}
              onPress={() => {
                setSelectedCategory(null);
              }}
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.selectedCategoryChip
              ]}
              textStyle={[
                styles.categoryChipText,
                selectedCategory === null && styles.selectedCategoryChipText
              ]}
            >
              Tümü
            </Chip>
          }
        />
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchProducts}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Ürün bulunamadı</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={item => {
            // İlk olarak _id'yi kontrol et, sonra id'yi, her ikisi de yoksa index kullan
            const itemId = item._id || item.id;
            return itemId ? itemId.toString() : `item-${Math.random().toString(36).substr(2, 9)}`;
          }}
          contentContainerStyle={styles.productsList}
          numColumns={2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    elevation: 2,
    marginTop: 38,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 40,
    marginRight: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginLeft: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  productsList: {
    padding: 8,
  },
  productCard: {
    width: '50%',
    padding: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#888',
  },
  categoriesContainer: {
    padding: 8,
    marginTop: 5,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#FF6B6B',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
});

export default ProductListScreen; 