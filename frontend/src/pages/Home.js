import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Carousel, Form, InputGroup, Button as BootstrapButton } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Loader } from '../components/UI';
import CategoryDropdown from '../components/CategoryDropdown';
import { categoryService, productService } from '../services/api';

// Bu verileri daha sonra API'den alabilirsiniz
const DUMMY_FEATURED_PRODUCTS = [
  {
    id: 1,
    title: 'iPhone Telefonlar',
    description: 'Mükemmel durumda, tüm aksesuarlarıyla birlikte.',
    image: '/images/electronics.jpg',
    category: 'Elektronik'
  },
  {
    id: 2,
    title: 'Oyun Konsolları',
    description: 'Kutusunda,Garantili Konsollar.',
    image: '/images/gaming.jpg',
    category: 'Oyun & Konsol'
  },
  {
    id: 3,
    title: 'MacBook Bilgisayarlar',
    description: 'Garantili Ürünler',
    image: '/images/laptop.jpg',
    category: 'Bilgisayar'
  }
];

// Varsayılan kategori verisi - sayılar API'den güncellenecek
const DEFAULT_CATEGORIES = [
  { 
    id: 1, 
    name: 'Elektronik', 
    icon: '📱', 
    count: 0,
    subcategories: [
      { id: 101, name: 'Bilgisayarlar', count: 0 },
      { id: 102, name: 'Telefonlar', count: 0 },
      { id: 103, name: 'Televizyonlar', count: 0 },
      { id: 104, name: 'Ses Sistemleri', count: 0 }
    ]
  },
  { 
    id: 2, 
    name: 'Ev Eşyaları', 
    icon: '🏠', 
    count: 0,
    subcategories: [
      { id: 201, name: 'Mobilya', count: 0 },
      { id: 202, name: 'Mutfak Eşyaları', count: 0 },
      { id: 203, name: 'Yatak ve Banyo', count: 0 },
      { id: 204, name: 'Dekorasyon', count: 0 }
    ]
  },
  { 
    id: 3, 
    name: 'Giyim', 
    icon: '👕', 
    count: 0,
    subcategories: [
      { id: 301, name: 'Kadın Giyim', count: 0 },
      { id: 302, name: 'Erkek Giyim', count: 0 },
      { id: 303, name: 'Çocuk Giyim', count: 0 },
      { id: 304, name: 'Ayakkabı ve Çanta', count: 0 }
    ]
  },
  { 
    id: 4, 
    name: 'Kitap & Hobi', 
    icon: '📚', 
    count: 0,
    subcategories: [
      { id: 401, name: 'Kitaplar', count: 0 },
      { id: 402, name: 'Müzik & Film', count: 0 },
      { id: 403, name: 'Koleksiyon', count: 0 },
      { id: 404, name: 'El İşi', count: 0 }
    ]
  },
  { 
    id: 5, 
    name: 'Spor', 
    icon: '⚽', 
    count: 0,
    subcategories: [
      { id: 501, name: 'Spor Malzemeleri', count: 0 },
      { id: 502, name: 'Outdoor', count: 0 },
      { id: 503, name: 'Fitness', count: 0 },
      { id: 504, name: 'Bisiklet & Scooter', count: 0 }
    ]
  },
  { 
    id: 6, 
    name: 'Oyun & Konsol', 
    icon: '🎮', 
    count: 0,
    subcategories: [
      { id: 601, name: 'Konsollar', count: 0 },
      { id: 602, name: 'Oyunlar', count: 0 },
      { id: 603, name: 'Aksesuarlar', count: 0 }
    ]
  }
];

function Home() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const navigate = useNavigate();
  
  // Kategorileri ve ürün sayılarını API'den getir
  useEffect(() => {
    const fetchCategoriesWithCounts = async () => {
      try {
        setLoadingCategories(true);
        console.log("Kategoriler ve ürün sayıları getiriliyor...");
        
        // DB'den kategorileri getir
        let apiCategories = [];
        try {
          const categoriesResponse = await categoryService.getAllCategories();
          console.log("Kategoriler API yanıtı:", categoriesResponse);
          
          // API yanıtından kategori verilerini çıkar
          if (categoriesResponse?.data) {
            if (Array.isArray(categoriesResponse.data)) {
              apiCategories = categoriesResponse.data;
            } else if (categoriesResponse.data.data && Array.isArray(categoriesResponse.data.data)) {
              apiCategories = categoriesResponse.data.data;
            }
          }
          
          console.log("API'den alınan kategoriler:", apiCategories);
        } catch (error) {
          console.error("Kategoriler alınırken hata:", error);
        }
        
        // Her kategori için ayrı ayrı ürün sayısını getir
        const updatedCategories = [...DEFAULT_CATEGORIES];
        
        // localStorage'dan kategori sayılarını al
        let allCategoryCounts = {};
        try {
          const savedCounts = localStorage.getItem('all_category_counts');
          if (savedCounts) {
            allCategoryCounts = JSON.parse(savedCounts);
            console.log('localStorage\'dan kategori sayıları yüklendi:', allCategoryCounts);
          }
        } catch (e) {
          console.error('localStorage\'dan kategori sayıları alınamadı:', e);
        }
        
        // Her ana kategori için, localStorage'dan sayı varsa kullan
        for (const category of updatedCategories) {
          try {
            // Kategori ID'si üzerinden localStorage'dan sayı al
            const categoryId = category.id.toString();
            if (allCategoryCounts && allCategoryCounts[categoryId] !== undefined) {
              const countFromStorage = parseInt(allCategoryCounts[categoryId]);
              console.log(`"${category.name}" kategorisi için localStorage'dan sayı alındı: ${countFromStorage}`);
              category.count = countFromStorage;
              continue; // localStorage'dan sayı alabildiysen, API çağrısı yapmaya gerek yok
            }
            
            // Eğer localStorage'da yoksa API'den almaya çalış
            console.log(`"${category.name}" kategorisi için ürün sayısı getiriliyor...`);
            
            // MongoDB ID'sini bul
            let mongoId = null;
            // API kategorilerinde eşleşen kategoriyi ara
            const apiCategory = apiCategories.find(c => 
              c.name === category.name || c.title === category.name
            );
            
            if (apiCategory) {
              mongoId = apiCategory._id || apiCategory.id;
              console.log(`"${category.name}" kategorisi için MongoDB ID: ${mongoId}`);
            }
            
            // Her iki ID ile de sorgu yap (hem sabit ID hem MongoDB ID)
            let queryId = mongoId || category.id;
            
            // Kategori ID'si ile ürün sayısı getir
            const response = await productService.getAllProducts({
              category: queryId,
              count: true
            });
            
            // API yanıtını detaylı inceleme
            console.log(`"${category.name}" kategorisi için API yanıtı:`, JSON.stringify(response.data));
            
            // Yanıt yapısını analiz et
            let count = 0;
            
            if (response && response.data) {
              // Yapı 1: { success: true, total: 123, count: 123, data: [] }
              if (response.data.total !== undefined) {
                count = parseInt(response.data.total);
                console.log(`"${category.name}" için total alanından sayı:`, count);
              } 
              // Yapı 2: { success: true, count: 123, data: [] } 
              else if (response.data.count !== undefined) {
                count = parseInt(response.data.count);
                console.log(`"${category.name}" için count alanından sayı:`, count);
              }
              // Yapı 3: Doğrudan dizi { [...] }
              else if (Array.isArray(response.data)) {
                count = response.data.length;
                console.log(`"${category.name}" için dizi uzunluğundan sayı:`, count);
              }
              // Yapı 4: { data: [...] }
              else if (response.data.data && Array.isArray(response.data.data)) {
                count = response.data.data.length;
                console.log(`"${category.name}" için data.data dizisinden sayı:`, count);
              }
              // Yapı 5: String ve number olmayan veriler
              else if (typeof response.data === 'object') {
                console.log(`"${category.name}" için obje yapısı:`, Object.keys(response.data));
                // Sayı içerebilecek her alanı kontrol et
                Object.keys(response.data).forEach(key => {
                  const value = response.data[key];
                  if (typeof value === 'number') {
                    console.log(`"${category.name}" için ${key} alanında sayı bulundu:`, value);
                    if (key.includes('count') || key.includes('total') || key === 'length') {
                      count = value;
                    }
                  }
                });
              }
            }
            
            // Eğer count hala 0 ise console'a detaylı bilgi göster
            if (count === 0) {
              console.warn(`"${category.name}" için ürün sayısı bulunamadı. API yanıtı:`, 
                JSON.stringify(response.data, null, 2));
            } else {
              console.log(`"${category.name}" kategorisinde ${count} ürün var.`);
            }
            
            // Kategori sayısını güncelle
            category.count = count;
            
            // Alt kategoriler için de aynı işlemi yap
            if (category.subcategories && category.subcategories.length > 0) {
              for (const subcat of category.subcategories) {
                try {
                  // Alt kategori için localStorage'dan sayı al
                  const subcatKey = `${categoryId}_${subcat.id}`;
                  if (allCategoryCounts && allCategoryCounts[subcatKey] !== undefined) {
                    const subcountFromStorage = parseInt(allCategoryCounts[subcatKey]);
                    console.log(`"${subcat.name}" alt kategorisi için localStorage'dan sayı alındı: ${subcountFromStorage}`);
                    subcat.count = subcountFromStorage;
                    continue; // localStorage'dan sayı alabildiysen, API çağrısı yapmaya gerek yok
                  }
                  
                  // Alt kategori MongoDB ID'sini bul
                  let subMongoId = null;
                  if (apiCategory && apiCategory.subcategories) {
                    const apiSubcat = apiCategory.subcategories.find(sc => 
                      sc.name === subcat.name || sc.title === subcat.name
                    );
                    if (apiSubcat) {
                      subMongoId = apiSubcat._id || apiSubcat.id;
                    }
                  }
                  
                  // Her iki ID ile de sorgu yap
                  let subQueryId = subMongoId || subcat.id;
                  
                  // Alt kategori ürün sayısını getir
                  const subResponse = await productService.getAllProducts({
                    category: subQueryId,
                    count: true
                  });
                  
                  // API yanıtını detaylı inceleme
                  console.log(`"${subcat.name}" alt kategorisi için API yanıtı:`, JSON.stringify(subResponse.data));
                  
                  // Yanıt yapısını analiz et
                  let subCount = 0;
                  
                  if (subResponse && subResponse.data) {
                    // Yapı 1: { success: true, total: 123, count: 123, data: [] }
                    if (subResponse.data.total !== undefined) {
                      subCount = parseInt(subResponse.data.total);
                      console.log(`"${subcat.name}" için total alanından sayı:`, subCount);
                    } 
                    // Yapı 2: { success: true, count: 123, data: [] } 
                    else if (subResponse.data.count !== undefined) {
                      subCount = parseInt(subResponse.data.count);
                      console.log(`"${subcat.name}" için count alanından sayı:`, subCount);
                    }
                    // Yapı 3: Doğrudan dizi { [...] }
                    else if (Array.isArray(subResponse.data)) {
                      subCount = subResponse.data.length;
                      console.log(`"${subcat.name}" için dizi uzunluğundan sayı:`, subCount);
                    }
                    // Yapı 4: { data: [...] }
                    else if (subResponse.data.data && Array.isArray(subResponse.data.data)) {
                      subCount = subResponse.data.data.length;
                      console.log(`"${subcat.name}" için data.data dizisinden sayı:`, subCount);
                    }
                    // Yapı 5: String ve number olmayan veriler
                    else if (typeof subResponse.data === 'object') {
                      console.log(`"${subcat.name}" için obje yapısı:`, Object.keys(subResponse.data));
                      // Sayı içerebilecek her alanı kontrol et
                      Object.keys(subResponse.data).forEach(key => {
                        const value = subResponse.data[key];
                        if (typeof value === 'number') {
                          console.log(`"${subcat.name}" için ${key} alanında sayı bulundu:`, value);
                          if (key.includes('count') || key.includes('total') || key === 'length') {
                            subCount = value;
                          }
                        }
                      });
                    }
                  }
                  
                  // Eğer subCount hala 0 ise console'a detaylı bilgi göster
                  if (subCount === 0) {
                    console.warn(`"${subcat.name}" için ürün sayısı bulunamadı. API yanıtı:`, 
                      JSON.stringify(subResponse.data, null, 2));
                  } else {
                    console.log(`"${subcat.name}" alt kategorisinde ${subCount} ürün var.`);
                  }
                  
                  // Alt kategori sayısını güncelle
                  subcat.count = subCount;
                  
                } catch (error) {
                  console.error(`Alt kategori ${subcat.name} için ürün sayısı alınamadı:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`"${category.name}" kategorisi için ürün sayısı alınamadı:`, error);
          }
        }
        
        // Güncellenmiş kategorileri state'e ata
        console.log("Güncellenmiş kategori verileri:", updatedCategories);
        setCategories(updatedCategories);
        setLoadingCategories(false);
        
      } catch (err) {
        console.error("Kategoriler ve ürün sayıları alınırken hata:", err);
        // Hata durumunda varsayılan kategorileri kullan
        setCategories(DEFAULT_CATEGORIES);
        setLoadingCategories(false);
      }
    };
    
    fetchCategoriesWithCounts();
  }, []);
  
  // Son eklenen ürünleri API'den getir
  useEffect(() => {
    const fetchRecentProducts = async () => {
      try {
        setLoadingProducts(true);
        console.log("Son eklenen ürünler getiriliyor...");
        
        // En son eklenen 4 ürünü getir
        const response = await productService.getAllProducts({
          limit: 4,
          sort: '-createdAt', // En yeni ürünler önce
          status: 'active' // Sadece aktif ürünleri göster
        });
        
        console.log("API'den gelen son ürünler:", response);
        
        // Farklı API yanıt formatlarını ele al
        let products = [];
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            products = response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            products = response.data.data;
          } else if (typeof response.data === 'object') {
            // Dizileri içeren bir alan olup olmadığını kontrol et
            Object.keys(response.data).forEach(key => {
              if (Array.isArray(response.data[key])) {
                products = response.data[key];
                console.log(`Ürün dizisi '${key}' alanında bulundu`);
              }
            });
          }
        }
        
        console.log("İşlenmiş ürün verileri:", products);
        
        // ID formatını normalize et ve placeholder resim kullan
        const normalizedProducts = products.map(product => {
          // ID normalizasyonu
          if (!product.id && product._id) {
            product.id = product._id;
          }
          
          // Resim kontrolü
          if (!product.image && (!product.images || product.images.length === 0)) {
            // Standart placeholder resimlerden rastgele seç
            const placeholders = [
              '/images/electronics.jpg',
              '/images/gaming.jpg',
              '/images/laptop.jpg',
              '/images/furniture.jpg',
              '/images/clothing.jpg'
            ];
            product.image = placeholders[Math.floor(Math.random() * placeholders.length)];
          } else if (!product.image && product.images && product.images.length > 0) {
            // İlk resmi kullan
            product.image = typeof product.images[0] === 'string' 
              ? product.images[0] 
              : product.images[0].url || '/images/product-placeholder.jpg';
          }
          
          // Kategori kontrolü - kategori bir nesne olabilir
          if (product.category && typeof product.category === 'object') {
            // Kategori nesnesinden ad bilgisini çıkar
            if (product.category.name) {
              product.categoryName = product.category.name;
            } else if (product.category.title) {
              product.categoryName = product.category.title;
            } else {
              // Hiçbir isim bulunamazsa ID'yi kullan
              product.categoryName = `Kategori ${product.category._id || product.category.id || '?'}`;
            }
            
            console.log(`Kategori nesnesi algılandı: ${JSON.stringify(product.category)} -> ${product.categoryName}`);
          } else if (typeof product.category === 'string') {
            // Zaten string ise doğrudan kullan
            product.categoryName = product.category;
          } else {
            // Kategori yoksa
            product.categoryName = 'Genel';
          }
          
          return product;
        });
        
        setRecentProducts(normalizedProducts);
        setLoadingProducts(false);
      } catch (error) {
        console.error("Son ürünler alınırken hata:", error);
        setRecentProducts([]);
        setLoadingProducts(false);
      }
    };
    
    fetchRecentProducts();
  }, []);
  
  // Arama işlemi için bir fonksiyon
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchError('');
      console.log('Searching for:', searchTerm);
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      setSearchError('Lütfen arama yapmak için bir şeyler yazın');
    }
  };

  // Arama alanı değiştiğinde hata mesajını temizleyelim
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (searchError) setSearchError('');
  };

  return (
    <div className="home-page">
      {/* Hero Section with Carousel */}
      <section className="hero-section">
        <Carousel className="hero-carousel">
          <Carousel.Item style={{ backgroundImage: 'url("/images/electronics.jpg")' }}>
            <div className="carousel-overlay"></div>
            <Carousel.Caption>
              <h2>Takas Destekli Modern Pazar</h2>
              <p>İhtiyacınız olmayan ürünleri takas ederek hem doğayı koruyun hem de bütçenize katkı sağlayın.</p>
              <div>
                <BootstrapButton variant="primary" as={Link} to="/products">Ürünleri Keşfet</BootstrapButton>
                <BootstrapButton variant="secondary" as={Link} to="/products/add" className="ms-2">İlan Ver</BootstrapButton>
              </div>
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item style={{ backgroundImage: 'url("/images/laptop.jpg")' }}>
            <Carousel.Caption>
              <h2>Elektronik Ürünler</h2>
              <p>En yeni teknolojik ürünlere uygun fiyatlarla sahip olun veya kullanmadığınız cihazları değerlendirin.</p>
              <div>
                <BootstrapButton variant="primary" as={Link} to="/categories/1">Elektronik Kategorisi</BootstrapButton>
              </div>
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item style={{ backgroundImage: 'url("/images/furniture.jpg")' }} className="home-furniture-banner">
            <Carousel.Caption>
              <h2>Ev Eşyaları</h2>
              <p>Eviniz için ihtiyacınız olan her şey burada. Mobilyadan küçük ev aletlerine tüm ev eşyalarını bulabilirsiniz.</p>
              <div>
                <BootstrapButton variant="success" as={Link} to="/categories/2">Ev Eşyalarını Gör</BootstrapButton>
              </div>
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </section>

      <Container>
        {/* Promosyon Bannerları */}
        <section className="promo-banners mb-5">
          <Row>
            <Col md={4}>
              <div className="promo-banner">
                <img src="/images/gaming.jpg" alt="Oyun Takası" className="promo-banner-image" />
                <div className="promo-banner-content">
                  <h3>Oyun Takası</h3>
                  <p>Oynadığınız oyunları takas edin, koleksiyonunuzu büyütün</p>
                  <BootstrapButton variant="primary" as={Link} to="/categories/6">Oyunları Gör</BootstrapButton>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="promo-banner book-promo-banner">
                <img src="/images/banner1.jpg" alt="Kitap Takası" className="promo-banner-image" />
                <div className="promo-banner-content">
                  <h3>Kitap Takası</h3>
                  <p>Okuduğunuz kitapları paylaşın, yeni kitaplar keşfedin</p>
                  <BootstrapButton variant="primary" as={Link} to="/categories/4">Kitapları Gör</BootstrapButton>
                </div>
              </div>
            </Col>
            <Col md={4}>
              <div className="promo-banner">
                <img src="/images/sports.jpg" alt="Spor Ürünleri" className="promo-banner-image" />
                <div className="promo-banner-content">
                  <h3>Spor Ürünleri</h3>
                  <p>Spor malzemelerinizi değerlendirin veya uygun fiyata alın</p>
                  <BootstrapButton variant="primary" as={Link} to="/categories/5">Spor Ürünlerini Gör</BootstrapButton>
                </div>
              </div>
            </Col>
          </Row>
        </section>

        {/* Search Bar */}
        <section className="search-section mb-5">
          <Form onSubmit={handleSearch} className="search-form">
            <InputGroup size="lg">
              <Form.Control
                placeholder="Ne aramıştınız? (iPhone, bisiklet, kitap...)"
                value={searchTerm}
                onChange={handleSearchChange}
                className={`${searchError ? 'border-danger' : ''}`}
                aria-label="Ürün ara"
                isInvalid={!!searchError}
              />
              <Button variant="primary" type="submit" className="search-button">
                <i className="bi bi-search me-2"></i>
                Ara
              </Button>
            </InputGroup>
            {searchError && <Form.Text className="text-danger">{searchError}</Form.Text>}
          </Form>
        </section>

        {/* Categories */}
        <section className="categories-section mb-5">
          <h2 className="section-title mb-4">Kategoriler</h2>
          {loadingCategories ? (
            <Loader centered text="Kategoriler yükleniyor..." />
          ) : (
          <Row>
              {categories.map((category) => (
              <Col key={category.id} xs={6} md={4} lg={2} className="mb-4">
                  <Card className="text-center category-card h-100">
                    <CategoryDropdown 
                      category={category} 
                      subcategories={category.subcategories} 
                    />
                  </Card>
              </Col>
            ))}
          </Row>
          )}
        </section>

        {/* Featured Products */}
        <section className="featured-products-section mb-5">
          <h2 className="section-title mb-4">Öne Çıkan İlanlar</h2>
          {loading ? (
            <Loader centered />
          ) : (
            <Row>
              {DUMMY_FEATURED_PRODUCTS.map((product) => (
                <Col key={product.id} md={4} className="mb-4">
                  <Card
                    title={product.title}
                    image={product.image}
                    imageAlt={product.title}
                    className="product-card h-100"
                    footer={
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-secondary product-category">{product.category}</span>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          as={Link}
                          to={product.id === 1 ? '/categories/1/102' : product.id === 2 ? '/categories/6' : product.id === 3 ? '/categories/1/101' : `/products/${product.id}`}
                          className="product-btn"
                        >
                          İncele
                        </Button>
                      </div>
                    }
                  >
                    <p className="mb-2 product-description">{product.description}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </section>

        {/* Recent Products */}
        <section className="recent-products-section mb-5">
          <h2 className="section-title mb-4">Son Eklenen İlanlar</h2>
          {loadingProducts ? (
            <Loader centered text="Ürünler yükleniyor..." />
          ) : recentProducts.length > 0 ? (
            <Row>
              {recentProducts.map((product) => (
                <Col key={product.id} md={3} sm={6} className="mb-4">
                  <Card
                    title={product.title}
                    image={product.image}
                    imageAlt={product.title}
                    className="product-card h-100"
                    footer={
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="badge bg-secondary product-category">{product.categoryName || 'Genel'}</span>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          as={Link}
                          to={`/products/${product.id}`}
                          className="product-btn"
                        >
                          İncele
                        </Button>
                      </div>
                    }
                  >
                    <p className="mb-2">{product.description || 'Ürün açıklaması bulunmuyor.'}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center p-4 bg-light rounded">
              <p>Henüz ilan bulunmuyor. İlk ilanı siz eklemek ister misiniz?</p>
              <Button 
                variant="primary"
                as={Link}
                to="/products/add"
              >
                İlan Ekle
              </Button>
            </div>
          )}
          <div className="text-center mt-4">
            <Button variant="primary" as={Link} to="/products" className="view-all-btn">
              Tüm İlanları Gör
            </Button>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section mb-5">
          <h2 className="section-title mb-4">Nasıl Çalışır?</h2>
          <Row className="text-center">
            <Col md={4} className="mb-4">
              <div className="step-icon mb-3">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  1
                </div>
              </div>
              <h4>İlan Oluştur</h4>
              <p>Satmak veya takas etmek istediğiniz ürünün ilanını oluşturun.</p>
            </Col>
            <Col md={4} className="mb-4">
              <div className="step-icon mb-3">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  2
                </div>
              </div>
              <h4>Teklifleri Değerlendir</h4>
              <p>Gelen teklifleri inceleyin ve size uygun olanı seçin.</p>
            </Col>
            <Col md={4} className="mb-4">
              <div className="step-icon mb-3">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  3
                </div>
              </div>
              <h4>Satış veya Takas</h4>
              <p>Karşı tarafla anlaşarak ürünü satın veya takas edin.</p>
            </Col>
          </Row>
        </section>
      </Container>
    </div>
  );
}

export default Home; 