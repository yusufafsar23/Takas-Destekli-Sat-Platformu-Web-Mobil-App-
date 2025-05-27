import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, InputGroup, Spinner, Alert, Pagination, Badge } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { productService, categoryService } from '../services/api';
import { forceCacheRefresh } from '../utils/browserUtils';
import { clearBrowserCache } from '../utils/clearCache';

// API URL - Resimlerin tam yolunu oluşturmak için kullanılacak
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Sabit kategoriler - Ana sayfayla aynı
const STATIC_CATEGORIES = [
  { 
    id: 1, 
    name: 'Elektronik', 
    icon: 'phone-portrait',
    mongoId: '64f1b3c68d7c4a281d66e8b3',
    count: 120,
  },
  { 
    id: 2, 
    name: 'Giyim', 
    icon: 'shirt', 
    mongoId: '64f1b3c68d7c4a281d66e8b4',
    count: 230,
  },
  { 
    id: 3, 
    name: 'Ev Eşyaları', 
    icon: 'home',
    mongoId: '68137ab0358c748f63723fce',
    count: 85,
  },
  { 
    id: 4, 
    name: 'Spor ve Outdoor', 
    icon: 'football', 
    mongoId: '68137ab0358c748f63723fd3',
    count: 65,
  },
  { 
    id: 5, 
    name: 'Oyun & Konsol', 
    icon: 'game-controller', 
    mongoId: '68137ab0358c748f63723fd6',
    count: 40,
  },
  { 
    id: 6, 
    name: 'Kitap & Hobi', 
    icon: 'book',
    mongoId: '68137ab0358c748f63723fd8',
    count: 95,
  }
];

// Alt kategoriler ve ana kategori ilişkileri
const SUBCATEGORIES = {
  // Ana kategori ID -> Alt kategori MongoDB ID'leri
  '1': ['68137ab2358c748f63723fe6', '68137ab2358c748f63723fe4', '68137ab2358c748f63723fe7', '68137ab2358c748f63723fe8'], // Elektronik alt kategorileri: Bilgisayarlar, Telefonlar, Televizyonlar, Ses Sistemleri
  '2': ['68137ab0358c748f63723fcd', '68137ab1358c748f63723fd0', '68137ab1358c748f63723fd7', '68137ab1358c748f63723fd9'], // Giyim alt kategorileri: Kadın giyim, Erkek giyim, Çocuk giyim, Ayakkabı ve çanta
  '3': ['68137ab1358c748f63723fd1', '68137ab1358c748f63723fd4', '68137ab1358c748f63723fd6', '68137ab4358c748f63723ff6'], // Ev Eşyaları alt kategorileri: Mobilya, Mutfak, Yatak ve banyo, Dekorasyon
  '4': ['68137ab1358c748f63723fd3', '68137ab0358c748f63723fcc', '68137ab0358c748f63723fcf', '68137ab1358c748f63723fd5'], // Spor ve Outdoor alt kategorileri
  '5': ['68137ab0358c748f63723fca', '68137ab0358c748f63723fcb', '68137ab0358c748f63723fce'], // Hobi ve Oyun alt kategorileri: Konsollar, Oyunlar, Aksesuarlar
  '6': ['68137aaf358c748f63723fc9', '68137ab0358c748f63723fcd', '68137ab0358c748f63723fce', '68137aaf358c748f63723fca'], // Kitap, Film, Müzik alt kategorileri: Kitaplar, Müzik ve film, Koleksiyon, El işi
};

// Alt kategori adları - hızlı erişim için
const SUBCATEGORY_NAMES = {
  '68137ab3358c748f63723ff2': 'Ayakkabılar',
  '68137ab2358c748f63723fe2': 'Bilgisayarlar',
  '68137ab2358c748f63723fe4': 'Telefonlar',
  '68137ab2358c748f63723fe6': 'Televizyonlar',
  '68137ab2358c748f63723fe8': 'Ses Sistemleri',
  '68137ab2358c748f63723fea': 'Fotoğraf ve Kamera',
  '68137ab3358c748f63723fec': 'Kadın Giyim',
  '68137ab3358c748f63723fee': 'Erkek Giyim',
  '68137ab3358c748f63723ff0': 'Çocuk Giyim',
  '68137ab4358c748f63723ff4': 'Aksesuarlar',
  '68137ab4358c748f63723ff6': 'Mobilya',
  '68137ab4358c748f63723ff8': 'Mutfak Eşyaları',
  '68137ab4358c748f63723ffa': 'Yatak ve Banyo',
  '68137ab5358c748f63723ffc': 'Dekorasyon',
  '68137ab5358c748f63723ffe': 'Aydınlatma',
};

// Durum değeri eşleştirmeleri (İngilizce -> Türkçe)
const CONDITION_MAPPING = {
  'new': 'Sıfır',
  'like-new': 'Yeni Gibi',
  'good': 'İyi',
  'fair': 'Orta',
  'poor': 'Kötü'
};

// MongoDB ve sabit ID'ler arasında dönüşüm tablosu
const MONGO_ID_MAPPING = {
  // MongoDB ID -> Sabit ID
  '68137aaf358c748f63723fc9': '1', // Elektronik
  '68137ab0358c748f63723fcb': '2', // Giyim
  '68137ab0358c748f63723fce': '3', // Ev Eşyaları
  '68137ab0358c748f63723fd3': '4', // Spor ve Outdoor
  '68137ab0358c748f63723fd6': '5', // Hobi ve Oyun
  '68137ab0358c748f63723fd8': '6', // Kitap, Film, Müzik
};

const STATIC_ID_MAPPING = {
  // Sabit ID -> MongoDB ID
  '1': '68137aaf358c748f63723fc9', // Elektronik
  '2': '68137ab0358c748f63723fcb', // Giyim
  '3': '68137ab0358c748f63723fce', // Ev Eşyaları
  '4': '68137ab0358c748f63723fd3', // Spor ve Outdoor
  '5': '68137ab0358c748f63723fd6', // Hobi ve Oyun
  '6': '68137ab0358c748f63723fd8'  // Kitap, Film, Müzik
};

// Kategori adları için ek eşleştirme
const CATEGORY_NAME_MAPPING = {
  'Elektronik': ['elektronik', 'telefon', 'bilgisayar', 'tablet'],
  'Ev Eşyaları': ['ev', 'mobilya', 'dekorasyon', 'mutfak'],
  'Giyim': ['giyim', 'kıyafet', 'elbise', 'ayakkabı', 'ayakkabılar', 'çanta'],
  'Kitap & Hobi': ['kitap', 'hobi', 'dergi', 'oyuncak'],
  'Spor ve Outdoor': ['spor', 'fitness', 'bisiklet', 'futbol'],
  'Oyun & Konsol': ['oyun', 'konsol', 'ps4', 'xbox', 'playstation', 'nintendo']
};

// Alt kategoriler ve ana kategori ilişkileri - sabit tanımlar (doğru ID'lerle)
const ELEKTRONIK_CATEGORIES = [
  '68137ab2358c748f63723fe2',
  '68137ab2358c748f63723fe4',
  '68137ab2358c748f63723fe6',
  '68137ab2358c748f63723fe8'
];

// Giyim kategorisi alt kategorileri
const GIYIM_CATEGORIES = [
  '68137ab3358c748f63723fec',
  '68137ab3358c748f63723fee',
  '68137ab3358c748f63723ff0',
  '68137ab3358c748f63723ff2'
];

// Ev Eşyaları kategorisi alt kategorileri - Ana kategori ID: 68137ab0358c748f63723fce
const EV_ESYALARI_CATEGORIES = [
  '68137ab0358c748f63723fce',
  '68137ab4358c748f63723ff6',
  '68137ab4358c748f63723ff8',
  '68137ab4358c748f63723ffa',
  '68137ab5358c748f63723ffc',
// Ana kategori ID'sinin kendisi
];

// Spor ve Outdoor kategorisi alt kategorileri - Ana kategori ID: 68137ab0358c748f63723fd3
const SPOR_CATEGORIES = [
  '68137ab0358c748f63723fd3' // Ana kategori ID'sinin kendisi
];

// Oyun & Konsol kategorisi alt kategorileri - Ana kategori ID: 68137ab0358c748f63723fd6
const OYUN_KONSOL_CATEGORIES = [
  '68137ab0358c748f63723fd6' // Ana kategori ID'sinin kendisi
];

// Kitap & Hobi kategorisi alt kategorileri - Ana kategori ID: 68137ab0358c748f63723fd8
const KITAP_HOBI_CATEGORIES = [
  '68137ab0358c748f63723fd8' // Ana kategori ID'sinin kendisi
];

// MongoDB ID ile sabit ID eşleme fonksiyonu (geliştirilmiş)
const updateIdMappings = (categories) => {
  // ID eşleştirmeleri zaten sabit değerlerle doldurulduğu için 
  // bu fonksiyon artık sadece yeni veya değişen kategoriler için kullanılıyor
  
  if (!categories || !Array.isArray(categories)) return;
  
  console.log("API'den gelen kategoriler:", categories);
  
  // Alt kategorileri ve ana kategorileri sınıflandır
  let mainCategories = categories.filter(cat => !cat.parentId);
  let subCategories = categories.filter(cat => cat.parentId);
  
  console.log("Ana kategoriler:", mainCategories.length);
  console.log("Alt kategoriler:", subCategories.length);
  
  // Ana kategori eşleştirmelerini doğrula/güncelle
  mainCategories.forEach(cat => {
    if (!cat || !cat.name || !cat._id) return;
    
    // İsim eşleşmesine göre ID güncelleme
    const staticCategory = STATIC_CATEGORIES.find(staticCat => 
      staticCat.name.toLowerCase() === cat.name.toLowerCase() ||
      staticCat.name.toLowerCase().includes(cat.name.toLowerCase()) ||
      cat.name.toLowerCase().includes(staticCat.name.toLowerCase())
    );
    
    if (staticCategory) {
      const staticId = staticCategory.id.toString();
        STATIC_ID_MAPPING[staticId] = cat._id;
        MONGO_ID_MAPPING[cat._id] = staticId;
      console.log(`Ana kategori eşleşti: ${cat.name} - Sabit ID ${staticId} <-> MongoDB ID ${cat._id}`);
    }
  });
  
  console.log("ID Eşleştirme güncellendi:", { staticToMongo: STATIC_ID_MAPPING, mongoToStatic: MONGO_ID_MAPPING });
};

// Resim URL'sini düzgün formata çevirme yardımcı fonksiyonu
const getImageUrl = (images) => {
  // Debug: gelen veriyi logla
  console.log("getImageUrl received:", images);
  
  // images null veya undefined ise default resim döndür
  if (!images) return '/images/product-placeholder.jpg';
  
  // Eğer images bir dizi ise
  if (Array.isArray(images)) {
    // Dizi boşsa default resim döndür
    if (images.length === 0) return '/images/product-placeholder.jpg';
    
    const firstImage = images[0];
    
    // İlk eleman bir obje ve url property'si varsa
    if (typeof firstImage === 'object' && firstImage !== null) {
      if (firstImage.url) {
        console.log("Using object.url:", firstImage.url);
        
        // Eğer /uploads/ ile başlıyorsa, önbellek busting için timestamp ekle
        if (firstImage.url.startsWith('/uploads/')) {
          const imageWithTimestamp = `${firstImage.url}?t=${new Date().getTime()}`;
          console.log("Added timestamp to URL:", imageWithTimestamp);
          return imageWithTimestamp;
        }
        
        return firstImage.url;
      }
      
      // Diğer olası alanları kontrol et
      if (firstImage.secure_url) {
        return firstImage.secure_url;
      }
      
      // Filename doğrudan varsa
      if (firstImage.filename) {
        // Filename'den tam URL oluştur
        const imageUrl = `/uploads/products/${firstImage.filename}?t=${new Date().getTime()}`;
        console.log("Created URL from filename:", imageUrl);
        return imageUrl;
      }
    }
    
    // İlk eleman bir string ise
    if (typeof firstImage === 'string') {
      // Tam URL ise doğrudan kullan
      if (firstImage.startsWith('http')) {
        console.log("Using http URL:", firstImage);
        return firstImage;
      }
      
      // Backend'den gelen yerel dosya yolu (/uploads/...)
      if (firstImage.startsWith('/uploads/')) {
        console.log("Using uploads path:", firstImage);
        const imageWithTimestamp = `${firstImage}?t=${new Date().getTime()}`;
        console.log("Added timestamp to URL:", imageWithTimestamp);
        return imageWithTimestamp;
      }
      
      // Sadece dosya adı olabilir
      if (firstImage.includes('.jpg') || firstImage.includes('.png') || firstImage.includes('.jpeg') || firstImage.includes('.gif')) {
        const imageUrl = `/uploads/products/${firstImage}?t=${new Date().getTime()}`;
        console.log("Created URL from filename string:", imageUrl);
        return imageUrl;
      }
      
      // Diğer herhangi bir string
      console.log("Using string path:", firstImage);
      return firstImage;
    }
  }
  
  // images bir string ise (tek bir resim URL'si)
  if (typeof images === 'string') {
    console.log("Using single string image URL:", images);
    
    // /uploads/ ile başlıyorsa önbellek busting için timestamp ekle
    if (images.startsWith('/uploads/')) {
      const imageWithTimestamp = `${images}?t=${new Date().getTime()}`;
      console.log("Added timestamp to single URL:", imageWithTimestamp);
      return imageWithTimestamp;
    }
    
    return images;
  }
  
  // images bir obje ise
  if (typeof images === 'object' && images !== null && !Array.isArray(images)) {
    if (images.url) {
      // Eğer /uploads/ ile başlıyorsa, önbellek busting için timestamp ekle
      if (images.url.startsWith('/uploads/')) {
        const imageWithTimestamp = `${images.url}?t=${new Date().getTime()}`;
        console.log("Added timestamp to object URL:", imageWithTimestamp);
        return imageWithTimestamp;
      }
      return images.url;
    }
  }
  
  // Hiçbir duruma uymuyorsa placeholder döndür
  console.log("No valid image found, using placeholder");
  return '/images/product-placeholder.jpg';
};

// Kategoriye göre uygun placeholder resmi döndür
const getCategoryPlaceholder = (category) => {
  if (!category) return '/images/product-placeholder.jpg';
  
  const categoryName = typeof category === 'object' && category.name 
    ? category.name.toLowerCase() 
    : (typeof category === 'string' ? category.toLowerCase() : '');
  
  // Kategori ismine göre uygun resmi seç
  if (categoryName.includes('elektronik')) return '/images/electronics.jpg';
  if (categoryName.includes('giyim') || categoryName.includes('kıyafet')) return '/images/clothing.jpg';
  if (categoryName.includes('ev') || categoryName.includes('mobilya')) return '/images/furniture.jpg';
  if (categoryName.includes('kitap')) return '/images/books.jpg';
  if (categoryName.includes('spor')) return '/images/sports.jpg';
  
  // Eşleşme yoksa genel placeholder
  return '/images/product-placeholder.jpg';
};

const ProductList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // State for products and pagination
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(parseInt(queryParams.get('page')) || 1);
  
  // State for filters
  const [categories, setCategories] = useState(STATIC_CATEGORIES);
  const [apiCategories, setApiCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(queryParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(queryParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(queryParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(queryParams.get('maxPrice') || '');
  const [condition, setCondition] = useState(queryParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(queryParams.get('sortBy') || 'newest');
  
  // MongoDB ID ve Sabit ID dönüşümleri
  const getMongoId = (staticId) => {
    if (!staticId) return '';
    
    // MongoDB ID ise doğrudan döndür
    if (staticId && staticId.length === 24 && /^[0-9a-f]+$/i.test(staticId)) {
      return staticId;
    }
    
    // Eşleşme varsa dönüştür
    const mongoId = STATIC_ID_MAPPING[staticId];
    console.log(`ID dönüşümü: Sabit ID ${staticId} -> MongoDB ID ${mongoId || 'bulunamadı'}`);
    
    // MongoDB ID bulunamadıysa, API kategorilerini manuel olarak ara
    if (!mongoId && apiCategories && apiCategories.length > 0) {
      // Seçilen kategori numarasına karşılık gelen STATIC_CATEGORIES'den kategori ismini bul
      const selectedCategoryName = STATIC_CATEGORIES.find(c => c.id.toString() === staticId)?.name;
      
      if (selectedCategoryName) {
        // İsme göre API kategorileri içinde ara
        const matchingCategory = apiCategories.find(c => 
          c.name === selectedCategoryName || 
          c.name.includes(selectedCategoryName) || 
          selectedCategoryName.includes(c.name)
        );
        
        if (matchingCategory && matchingCategory._id) {
          console.log(`İsim eşleşmesiyle kategori bulundu: ${selectedCategoryName} -> ${matchingCategory._id}`);
          return matchingCategory._id;
        }
      }
    }
    
    return mongoId || staticId; // Eşleşme yoksa orijinal ID'yi kullan
  };
  
  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Prepare query parameters
        const params = {
          page: currentPage, // Send the current page to the backend
          limit: 12, // Use a reasonable number of items per page
        };
        
        // Sıralama parametresini düzenle
        if (sortBy === 'newest') {
          params.sort = '-createdAt';
        } else if (sortBy === 'oldest') {
          params.sort = 'createdAt';
        } else if (sortBy === 'price-asc') {
          params.sort = 'price_asc';
        } else if (sortBy === 'price-desc') {
          params.sort = 'price_desc';
        }
        
        // Filtreleri ekle (durum filtresini kaldıralım)
        if (searchTerm) params.search = searchTerm;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (condition) {
          // Durum değerini Türkçe karşılığına dönüştür
          const mappedCondition = CONDITION_MAPPING[condition];
          console.log(`Durum filtresi: ${condition} -> ${mappedCondition}`);
          params.condition = mappedCondition || condition;
        }
        
        // Kategori filtresi - özel işlemleri burada yapıyoruz
        if (selectedCategory) {
          console.log("🔍 Seçilen kategori ID:", selectedCategory);
          
          // Elektronik kategorisi seçildiğinde (ID=1), sadece belirli alt kategorileri getir
          if (selectedCategory === '1') {
            console.log("⚡ Elektronik kategorisi seçildi, belirli alt kategorileri yüklüyoruz");
            
            // Elektronik alt kategorileri için filtreleme (belirli ID'ler)
            params.categoryIds = ELEKTRONIK_CATEGORIES.join(',');
            console.log(`📋 Yüklenecek elektronik alt kategorileri: ${params.categoryIds}`);
          }
          // Giyim kategorisi seçildiğinde (ID=2), sadece belirli alt kategorileri getir
          else if (selectedCategory === '2') {
            console.log("👕 Giyim kategorisi seçildi, belirli alt kategorileri yüklüyoruz");
            
            // Giyim alt kategorileri için filtreleme (belirli ID'ler)
            params.categoryIds = GIYIM_CATEGORIES.join(',');
            console.log(`📋 Yüklenecek giyim alt kategorileri: ${params.categoryIds}`);
          }
          // Ev Eşyaları kategorisi seçildiğinde (ID=3)
          else if (selectedCategory === '3') {
            console.log("🏠 Ev Eşyaları kategorisi seçildi");
            
            // Ana kategori ID'si ile filtreleme
            params.categoryIds = EV_ESYALARI_CATEGORIES.join(',');
            console.log(`📋 Ev Eşyaları kategorisi ID: ${params.categoryIds}`);
          }
          // Spor ve Outdoor kategorisi seçildiğinde (ID=4)
          else if (selectedCategory === '4') {
            console.log("🏀 Spor ve Outdoor kategorisi seçildi");
            
            // Ana kategori ID'si ile filtreleme
            params.categoryIds = SPOR_CATEGORIES.join(',');
            console.log(`📋 Spor ve Outdoor kategorisi ID: ${params.categoryIds}`);
          }
          // Oyun & Konsol kategorisi seçildiğinde (ID=5)
          else if (selectedCategory === '5') {
            console.log("🎮 Oyun & Konsol kategorisi seçildi");
            
            // Ana kategori ID'si ile filtreleme
            params.categoryIds = OYUN_KONSOL_CATEGORIES.join(',');
            console.log(`📋 Oyun & Konsol kategorisi ID: ${params.categoryIds}`);
          }
          // Kitap & Hobi kategorisi seçildiğinde (ID=6)
          else if (selectedCategory === '6') {
            console.log("📚 Kitap & Hobi kategorisi seçildi");
            
            // Ana kategori ID'si ile filtreleme
            params.categoryIds = KITAP_HOBI_CATEGORIES.join(',');
            console.log(`📋 Kitap & Hobi kategorisi ID: ${params.categoryIds}`);
          }
          // Diğer kategorilerde normal davran
          else {
            const foundCategory = STATIC_CATEGORIES.find(c => c.id.toString() === selectedCategory);
            if (foundCategory && foundCategory.mongoId) {
              console.log(`🔍 Normal kategori filtreleme: ${foundCategory.name}`);
              params.category = foundCategory.mongoId;
            }
          }
        }
        
        console.log("📤 API'ye gönderilen parametreler:", params);
        
        // Ürünleri getir
        const response = await productService.getAllProducts(params);
        
        console.log("Products API response:", response);
        
        // API yanıtını işle
        let allProducts = [];
        let totalItems = 0;
        let apiTotalPages = 1;
        
        if (response) {
          if (response.data) {
            // Format 1: { success: true, data: [...], total: X, totalPages: Y, currentPage: Z }
            if (response.data.data && Array.isArray(response.data.data)) {
              allProducts = response.data.data;
              totalItems = response.data.total || allProducts.length;
              apiTotalPages = response.data.totalPages || Math.ceil(totalItems / 12);
              
              console.log(`API Yanıt Formatı 1: ${allProducts.length} ürün bulundu, toplam ${totalItems} ürün, ${apiTotalPages} sayfa`);
            }
            // Format 2: { products: [...], total: X }
            else if (response.data.products && Array.isArray(response.data.products)) {
              allProducts = response.data.products;
              totalItems = response.data.total || allProducts.length;
              apiTotalPages = response.data.totalPages || Math.ceil(totalItems / 12);
              
              console.log(`API Yanıt Formatı 2: ${allProducts.length} ürün bulundu, toplam ${totalItems} ürün, ${apiTotalPages} sayfa`);
            }
            // Format 3: [...] (doğrudan dizi)
            else if (Array.isArray(response.data)) {
              allProducts = response.data;
              totalItems = allProducts.length;
              apiTotalPages = 1;
              
              console.log(`API Yanıt Formatı 3: ${allProducts.length} ürün bulundu`);
            }
            // Format 4: Boş veya beklenmeyen format
            else {
              console.warn("API yanıtı beklenen bir formatta değil:", response.data);
              allProducts = [];
              totalItems = 0;
              apiTotalPages = 1;
            }
          } else {
            console.warn("API yanıtı veri içermiyor");
            allProducts = [];
            totalItems = 0;
            apiTotalPages = 1;
          }
        }
        
        console.log(`API'den ${allProducts.length} ürün alındı, toplam ${totalItems} ürün var, ${apiTotalPages} sayfa`);
        
        // Eğer hiç ürün yoksa ve filtreler aktif ise kullanıcıya bildir
        if (allProducts.length === 0) {
          // Filtreler aktif mi kontrol et
          const hasActiveFilters = !!(searchTerm || selectedCategory || minPrice || maxPrice || condition);
          
          if (hasActiveFilters) {
            console.warn("Filtrelere uygun ürün bulunamadı:", {
              searchTerm,
              selectedCategory,
              minPrice,
              maxPrice,
              condition,
              sortBy
            });
          } else {
            console.warn("Hiç ürün bulunamadı (filtre yok)");
          }
        }
        
        // State'i güncelle
        setProducts(allProducts);
        setTotalPages(apiTotalPages || 1);
        setError(null);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError("Ürünler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [currentPage, searchTerm, selectedCategory, minPrice, maxPrice, condition, sortBy]);
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        
        // Her zaman önce statik kategorileri kullan
        setCategories(STATIC_CATEGORIES);
        
        // Ardından API'den kategorileri al ve ID eşleştirmelerini güncelle
        try {
          const response = await categoryService.getAllCategories();
          console.log("Kategori API yanıtı:", response);
          
          let apiCats = [];
          if (response?.data?.data && Array.isArray(response.data.data)) {
            apiCats = response.data.data;
          } else if (response?.data && Array.isArray(response.data)) {
            apiCats = response.data;
          }
          
          if (apiCats.length > 0) {
            setApiCategories(apiCats);
            // ID eşleştirmelerini güncelle 
            updateIdMappings(apiCats);
          }
        } catch (error) {
          console.error("API'den kategoriler alınamadı:", error);
        }
      } catch (err) {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Update URL with filters
  const updateUrlWithFilters = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (condition) params.set('condition', condition);
    if (sortBy) params.set('sortBy', sortBy);
    if (currentPage > 1) params.set('page', currentPage);
    
    navigate(`/products?${params.toString()}`);
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Önceki filtre bilgisini logla
    console.log("Filtreleme öncesi durum:", {
      searchTerm,
      selectedCategory,
      minPrice,
      maxPrice,
      condition,
      sortBy
    });
    
    // Kategori ID'si kontrolü
    if (selectedCategory) {
      const foundCategory = STATIC_CATEGORIES.find(c => c.id.toString() === selectedCategory);
      if (foundCategory) {
        console.log(`Kategori seçildi: ${foundCategory.name} (ID: ${selectedCategory}, MongoDB ID: ${foundCategory.mongoId})`);
      } else {
        console.warn(`Seçilen kategori bulunamadı: ${selectedCategory}`);
      }
    }
    
    // Durum filtresini kontrol et
    if (condition) {
      console.log(`Durum filtresi seçildi: "${condition}"`);
    }
    
    // URL'i filtrelerle güncelle
    updateUrlWithFilters();
    
    // Sayfa numarasını sıfırla
    setCurrentPage(1);
    
    // Filtre uygulandığını logla
    console.log("Filtreler uygulandı");
    
    // Force re-render - bakın hiç çalışıyor mu?
    const forceUpdate = Date.now();
    console.log("Yeniden render tetiklendi:", forceUpdate);
  };
  
  const handleClearFilters = () => {
    // Tüm filtreleri temizle
    setSearchTerm('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setSortBy('newest');
    
    // İlk sayfaya dön
    setCurrentPage(1);
    
    // URL'i temizle
    navigate('/products');
    
    console.log("Tüm filtreler temizlendi");
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Update URL with the new page number
    const params = new URLSearchParams(location.search);
    if (page > 1) {
      params.set('page', page);
    } else {
      params.delete('page');
    }
    navigate(`/products?${params.toString()}`);
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const items = [];
    const displayPageCount = 5;
    const startPage = Math.max(1, currentPage - Math.floor(displayPageCount / 2));
    const endPage = Math.min(totalPages, startPage + displayPageCount - 1);
    
    // Add "Previous" button
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      />
    );
    
    // Add first page and ellipsis if necessary
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>1</Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis-start" />);
      }
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Add ellipsis and last page if necessary
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-end" />);
      }
      items.push(
        <Pagination.Item key={totalPages} onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Add "Next" button
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      />
    );
    
    return (
      <Pagination className="justify-content-center mt-4">
        {items}
      </Pagination>
    );
  };
  
  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-0">Ürünler</h1>
        </Col>
        <Col xs="auto">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => {
              console.log("Manuel önbellek yenileme");
              clearBrowserCache();
            }}
            title="Resimlerin görünmemesi durumunda tıklayın"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Sayfayı Yenile
          </Button>
        </Col>
      </Row>
      
      {/* Filters */}
      <Card className="mb-4 filter-card">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row>
              {/* Search */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Arama</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Ürün adı veya açıklama"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button variant="outline-secondary" type="submit">
                      <i className="bi bi-search"></i>
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>
              
              {/* Category */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Kategori</Form.Label>
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={categoriesLoading}
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Form.Select>
                  {categoriesLoading && (
                    <div className="text-center mt-1">
                      <small>Kategoriler yükleniyor...</small>
                    </div>
                  )}
                </Form.Group>
              </Col>
              
              {/* Condition */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Durum</Form.Label>
                  <Form.Select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="new">Sıfır</option>
                    <option value="like-new">Yeni Gibi</option>
                    <option value="good">İyi</option>
                    <option value="fair">Orta</option>
                    <option value="poor">Kötü</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              {/* Price Range */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fiyat Aralığı</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Min ₺"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        type="number"
                        placeholder="Max ₺"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </Col>
                  </Row>
                </Form.Group>
              </Col>
              
              {/* Sort By */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sıralama</Form.Label>
                  <Form.Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">En Yeniler</option>
                    <option value="oldest">En Eskiler</option>
                    <option value="price-asc">Fiyat (Artan)</option>
                    <option value="price-desc">Fiyat (Azalan)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              {/* Filter Buttons */}
              <Col md={4} className="d-flex align-items-end">
                <div className="d-grid gap-2 d-md-flex justify-content-md-end w-100 mb-3">
                  <Button variant="primary" type="submit">
                    Filtrele
                  </Button>
                  <Button variant="outline-secondary" type="button" onClick={handleClearFilters}>
                    Filtreleri Temizle
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      {/* Products */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </Spinner>
        </div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : products.length === 0 ? (
        <Alert variant="info">
          <div className="d-flex align-items-center">
            <i className="bi bi-info-circle-fill me-2"></i>
            <div>
              <p className="mb-1"><strong>Arama kriterlerinize uygun ürün bulunamadı.</strong></p>
              <p className="mb-0 small text-secondary">
                {selectedCategory || condition || minPrice || maxPrice || searchTerm ? (
                  <>Filtreleme kriterlerinizi değiştirmeyi veya <Button variant="link" className="p-0" onClick={handleClearFilters}>tüm filtreleri temizlemeyi</Button> deneyebilirsiniz.</>
                ) : 'Henüz ürün eklenmemiş olabilir.'}
              </p>
            </div>
          </div>
        </Alert>
      ) : (
        <>
          <Row>
            <Col xs={12} className="mb-3">
              <p className="text-muted">
                <small><strong>{products.length}</strong> ürün gösteriliyor</small>
              </p>
            </Col>
            {products.map(product => {
              // DEBUG: Ürün resim verilerini kontrol et
              console.log(`Product ${product._id} being rendered`);
              
              // Ürün için resim URL'si belirle
              let imageUrl = '/images/product-placeholder.jpg';
              
              try {
                // Resim verisi var mı kontrol et
                if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                  const firstImage = product.images[0];
                  
                  // Resim türüne göre URL belirle
                  if (typeof firstImage === 'string') {
                    // String format (doğrudan URL)
                    imageUrl = firstImage;
                  } 
                  else if (typeof firstImage === 'object' && firstImage !== null) {
                    // Object format - URL veya filename özelliğini kullan
                    if (firstImage.url) {
                      imageUrl = firstImage.url;
                    }
                    else if (firstImage.filename) {
                      imageUrl = `/uploads/products/${firstImage.filename}`;
                    }
                  }
                  
                  // /uploads/ klasöründeki dosyalar için zaman damgası ekle
                  if (imageUrl && imageUrl.includes('/uploads/')) {
                    imageUrl = `${imageUrl}?t=${Date.now()}`;
                  }
                }
              } catch (err) {
                console.error(`Error processing image for product ${product._id}:`, err);
              }
                
              return (
                <Col md={4} sm={6} className="mb-4" key={product._id || `product-${Math.random()}`}>
                <Card className="h-100 product-card">
                    <Link to={`/products/${product._id}`}>
                      <Card.Img 
                        variant="top" 
                        src={imageUrl}
                        alt={product.title}
                        className="product-list-image"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/product-placeholder.jpg';
                        }}
                      />
                    </Link>
                    <Card.Body>
                      <Card.Title className="h5">{product.title}</Card.Title>
                      <div className="d-flex justify-content-between align-items-center">
                        <Card.Text className="text-primary fw-bold mb-0">
                          {product.price > 0 ? `${product.price} ₺` : 'Sadece Takas'}
                        </Card.Text>
                        <Card.Text>
                          <small className="text-muted">{product.condition}</small>
                      </Card.Text>
                      </div>
                    </Card.Body>
                    <Card.Footer className="bg-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">{product.location || 'Belirtilmemiş'}</small>
                        {product.acceptsTradeOffers && (
                          <Badge bg="success">Takas</Badge>
                        )}
                      </div>
                    </Card.Footer>
                </Card>
              </Col>
              );
            })}
          </Row>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>{renderPagination()}</Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default ProductList; 