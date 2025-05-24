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
    icon: '📱', 
    count: 120,
  },
  { 
    id: 2, 
    name: 'Ev Eşyaları', 
    icon: '🏠', 
    count: 85,
  },
  { 
    id: 3, 
    name: 'Giyim', 
    icon: '👕', 
    count: 230,
  },
  { 
    id: 4, 
    name: 'Kitap & Hobi', 
    icon: '📚', 
    count: 95,
  },
  { 
    id: 5, 
    name: 'Spor', 
    icon: '⚽', 
    count: 65,
  },
  { 
    id: 6, 
    name: 'Oyun & Konsol', 
    icon: '🎮', 
    count: 40,
  }
];

// MongoDB ve sabit ID'ler arasında dönüşüm tablosu
const MONGO_ID_MAPPING = {
  // MongoDB ID -> Sabit ID
};
const STATIC_ID_MAPPING = {
  // Sabit ID -> MongoDB ID
  '1': null, // Elektronik
  '2': null, // Ev Eşyaları
  '3': null, // Giyim
  '4': null, // Kitap & Hobi 
  '5': null, // Spor
  '6': null  // Oyun & Konsol
};

// MongoDB ID ile sabit ID eşleme fonksiyonu
const updateIdMappings = (categories) => {
  if (!categories || !Array.isArray(categories)) return;
  
  categories.forEach(cat => {
    if (!cat || !cat.name || !cat._id) return;
    
    // İsim eşleşmesine göre ID güncelleme
    for (const staticCat of STATIC_CATEGORIES) {
      if (cat.name === staticCat.name || cat.name.includes(staticCat.name) || staticCat.name.includes(cat.name)) {
        const staticId = staticCat.id.toString();
        STATIC_ID_MAPPING[staticId] = cat._id;
        MONGO_ID_MAPPING[cat._id] = staticId;
        console.log(`Kategori eşleşti: ${cat.name} - Sabit ID ${staticId} <-> MongoDB ID ${cat._id}`);
        break;
      }
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
  const [currentPage, setCurrentPage] = useState(1);
  
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
          page: currentPage,
          limit: 100, // Daha fazla ürün getir
        };
        
        // Sıralama parametresini düzenle
        if (sortBy === 'newest') {
          params.sort = '-createdAt';
        } else if (sortBy === 'oldest') {
          params.sort = 'createdAt';
        } else if (sortBy === 'price-asc') {
          params.sort = 'price';
        } else if (sortBy === 'price-desc') {
          params.sort = '-price';
        }
        
        // Kategori dışındaki filtreleri ekle
        if (searchTerm) params.search = searchTerm;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (condition) params.condition = condition;
        
        // Kategori ID seçildiğinde, arama yapmak için kategori adını ekleyelim
        let categoryName = "";
        if (selectedCategory) {
          // Kategori adını bul
          const foundCategory = STATIC_CATEGORIES.find(c => c.id.toString() === selectedCategory);
          if (foundCategory) {
            categoryName = foundCategory.name;
            console.log(`Seçilen kategori: ${selectedCategory} - ${categoryName}`);
            
            // Eğer arama terimi yoksa, aramaya kategori adını ekle
            if (!params.search) {
              params.search = categoryName;
            }
          }
        }
        
        // Elektronik kategorisi için özel işlem
        let response;
        if (selectedCategory === '1' && categoryName === 'Elektronik') {
          console.log("🚀 Elektronik kategorisi için tüm ürünleri filtresiz getiriyoruz...");
          response = await productService.getAllProductsNoFilter();
        } else {
          console.log("Tüm ürünler getiriliyor, params:", params);
          response = await productService.getAllProducts(params);
        }
        
        console.log("Products API response:", response);
        
        // Sonuçları al
        let allProducts = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          allProducts = response.data.data;
        } else if (response?.data?.products && Array.isArray(response.data.products)) {
          allProducts = response.data.products;
        } else if (response?.data && Array.isArray(response.data)) {
          allProducts = response.data;
        }
        
        console.log(`API'den ${allProducts.length} ürün alındı`);
        
        // Kategori seçiliyse, istemci tarafında filtreleme yap
        let filteredProducts = allProducts;
        if (selectedCategory && categoryName) {
          console.log(`İstemci tarafında "${categoryName}" kategorisi için filtreleme yapılıyor...`);
          console.log("Filtreleme öncesi ürün sayısı:", allProducts.length);
          
          // Tüm ürünlerin kategori bilgilerini loglayalım (debugging için)
          allProducts.forEach((product, index) => {
            const catInfo = typeof product.category === 'object' 
              ? `Obje: ${product.category?.name || 'İsimsiz'}`
              : `String: ${product.category || 'Boş'}`;
            
            console.log(`Ürün ${index+1} - ${product.title} - Kategori: ${catInfo}`);
          });
          
          // Elektronik kategorisi için özel işlem
          if (categoryName === 'Elektronik') {
            console.log("🔍 Elektronik kategorisi için özel filtreleme uygulanıyor...");
            console.log("Tüm ürünlerin özeti:");
            
            // Tüm ürünleri ve özelliklerini detaylı incele
            allProducts.forEach((product, idx) => {
              console.log(`Ürün #${idx+1}: ${product.title}`);
              console.log(`- Kategori:`, typeof product.category === 'object' ? 
                `Obje (name: ${product.category?.name || 'yok'})` : 
                `String: "${product.category || 'yok'}"`);
              
              if (product.category && typeof product.category === 'object' && product.category.parent) {
                console.log(`- Üst Kategori:`, typeof product.category.parent === 'object' ? 
                  `Obje (name: ${product.category.parent?.name || 'yok'})` : 
                  `String: "${product.category.parent || 'yok'}"`);
              }
            });
            
            // Öncelikle hiç ürün filtrelemeden tüm ürünleri gösterelim (DEBUG için)
            filteredProducts = allProducts;
            console.log(`DEV MODU: Tüm ${allProducts.length} ürün gösteriliyor!`);
            
            // Normal filtreleme kodunu yorum satırına alıyoruz
            /*
            filteredProducts = allProducts.filter(product => {
              // Kategorisi "Elektronik" olan ürünleri doğrudan ekle 
              if (product.category && typeof product.category === 'object' && product.category.name) {
                if (product.category.name.includes('Elektronik') || 
                    product.category.name.includes('elektronik')) {
                  return true;
                }
                
                // Üst kategorisi Elektronik olabilir
                if (product.category.parent && typeof product.category.parent === 'object') {
                  if (product.category.parent.name && (
                      product.category.parent.name.includes('Elektronik') || 
                      product.category.parent.name.includes('elektronik')
                    )) {
                    return true;
                  }
                }
              }
              
              if (typeof product.category === 'string') {
                if (product.category.includes('Elektronik') || 
                    product.category.includes('elektronik')) {
                  return true;
                }
              }
              
              // Başlık veya açıklamada elektronik anahtar kelimeleri
              const title = (product.title || '').toLowerCase();
              const desc = (product.description || '').toLowerCase();
              
              const electronicKeywords = [
                'telefon', 'phone', 'smartphone', 'tablet', 'bilgisayar', 'laptop', 
                'pc', 'computer', 'notebook', 'kamera', 'kulaklık', 'elektronik',
                'televizyon', 'tv', 'apple', 'iphone', 'samsung', 'xiaomi', 'monitor'
              ];
              
              return electronicKeywords.some(keyword => 
                title.includes(keyword) || desc.includes(keyword)
              );
            });
            */
          } else {
            // Diğer kategoriler için normal filtreleme
            filteredProducts = allProducts.filter(product => {
              // Kategori ismini küçük harfe çevir
              const searchCatName = categoryName.toLowerCase();
              
              // Ürün kategorisi obje olabilir
              if (product.category && typeof product.category === 'object') {
                // Ana kategori kontrolü
                if (product.category.name) {
                  const catName = product.category.name.toLowerCase();
                  if (catName.includes(searchCatName) || searchCatName.includes(catName)) {
                    return true;
                  }
                }
                
                // Alt kategori kontrolü
                if (product.category.parent && typeof product.category.parent === 'object') {
                  const parentName = product.category.parent.name?.toLowerCase() || '';
                  if (parentName.includes(searchCatName) || searchCatName.includes(parentName)) {
                    return true;
                  }
                }
              }
              
              // Ürün kategorisi string olabilir
              if (product.category && typeof product.category === 'string') {
                const catStr = product.category.toLowerCase();
                if (catStr.includes(searchCatName) || searchCatName.includes(catStr)) {
                  return true;
                }
              }
              
              // Başlık ve açıklamada kategori adı geçiyor mu kontrolü
              const title = (product.title || '').toLowerCase();
              const desc = (product.description || '').toLowerCase();
              
              return title.includes(searchCatName) || desc.includes(searchCatName);
            });
          }
          
          console.log(`Filtreleme sonucunda ${filteredProducts.length} ürün bulundu`);
        }
        
        // Sayfalama için filtre sonrasını kullan
        const totalItems = filteredProducts.length;
        const itemsPerPage = 12;
        const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Sayfalama işlemleri (client-side)
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        console.log(`Sayfa ${currentPage}: ${startIndex}-${endIndex} arası ${paginatedProducts.length} ürün gösteriliyor`);
        
        setProducts(paginatedProducts);
        setTotalPages(calculatedTotalPages || 1);
        setError(null);
      } catch (err) {
        console.error('Ürünler yüklenirken bir hata oluştu:', err);
        setError('Ürünler yüklenirken bir hata oluştu.');
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
    
    navigate(`/products?${params.toString()}`);
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    updateUrlWithFilters();
    setCurrentPage(1);
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setCondition('');
    setSortBy('newest');
    setCurrentPage(1);
    navigate('/products');
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
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
          Arama kriterlerinize uygun ürün bulunamadı.
        </Alert>
      ) : (
        <>
          <Row>
            {products.map(product => {
              console.log("Rendering product:", product._id);
              
              // DEBUG: Ürün resim verilerini kontrol et
              console.log(`Product ${product._id} images:`, product.images);
              
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
                    console.log(`Product ${product._id}: Using string URL:`, imageUrl);
                  } 
                  else if (typeof firstImage === 'object' && firstImage !== null) {
                    // Object format - URL veya filename özelliğini kullan
                    if (firstImage.url) {
                      imageUrl = firstImage.url;
                      console.log(`Product ${product._id}: Using object.url:`, imageUrl);
                    }
                    else if (firstImage.filename) {
                      imageUrl = `/uploads/products/${firstImage.filename}`;
                      console.log(`Product ${product._id}: Using filename:`, imageUrl);
                    }
                  }
                  
                  // /uploads/ klasöründeki dosyalar için zaman damgası ekle
                  if (imageUrl && imageUrl.includes('/uploads/')) {
                    imageUrl = `${imageUrl}?t=${Date.now()}`;
                  }
                }
                else {
                  console.log(`Product ${product._id}: No images array, using placeholder`);
                }
              } catch (err) {
                console.error(`Error processing image for product ${product._id}:`, err);
              }
                
              return (
                <Col md={4} sm={6} className="mb-4" key={product._id}>
                <Card className="h-100 product-card">
                    <Link to={`/products/${product._id}`}>
                      <Card.Img 
                        variant="top" 
                        src={imageUrl}
                        alt={product.title}
                        className="product-list-image"
                        onError={(e) => {
                          console.error(`Image failed to load for product ${product._id}:`, imageUrl);
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