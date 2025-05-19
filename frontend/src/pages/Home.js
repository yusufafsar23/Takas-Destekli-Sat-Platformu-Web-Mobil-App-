import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Carousel, Form, InputGroup, Button as BootstrapButton } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Loader } from '../components/UI';
import CategoryDropdown from '../components/CategoryDropdown';
import { categoryService } from '../services/api';

// Bu verileri daha sonra API'den alabilirsiniz
const DUMMY_FEATURED_PRODUCTS = [
  {
    id: 1,
    title: 'iPhone 13 Pro',
    description: 'Mükemmel durumda, tüm aksesuarlarıyla birlikte.',
    price: 24000,
    image: '/images/electronics.jpg',
    category: 'Elektronik'
  },
  {
    id: 2,
    title: 'PlayStation 5',
    description: 'Kutusunda, 2 oyun kumandası ile birlikte.',
    price: 18000,
    image: '/images/gaming.jpg',
    category: 'Oyun & Konsol'
  },
  {
    id: 3,
    title: 'MacBook Pro M2',
    description: '16 GB RAM, 512 GB SSD, Space Gray.',
    price: 42000,
    image: '/images/laptop.jpg',
    category: 'Bilgisayar'
  }
];

// Ana kategoriler ve alt kategoriler
const CATEGORIES_WITH_SUBCATEGORIES = [
  { 
    id: 1, 
    name: 'Elektronik', 
    icon: '📱', 
    count: 120,
    subcategories: [
      { id: 101, name: 'Bilgisayarlar', count: 45 },
      { id: 102, name: 'Telefonlar', count: 38 },
      { id: 103, name: 'Televizyonlar', count: 22 },
      { id: 104, name: 'Ses Sistemleri', count: 15 }
    ]
  },
  { 
    id: 2, 
    name: 'Ev Eşyaları', 
    icon: '🏠', 
    count: 85,
    subcategories: [
      { id: 201, name: 'Mobilya', count: 32 },
      { id: 202, name: 'Mutfak Eşyaları', count: 28 },
      { id: 203, name: 'Yatak ve Banyo', count: 15 },
      { id: 204, name: 'Dekorasyon', count: 10 }
    ]
  },
  { 
    id: 3, 
    name: 'Giyim', 
    icon: '👕', 
    count: 230,
    subcategories: [
      { id: 301, name: 'Kadın Giyim', count: 95 },
      { id: 302, name: 'Erkek Giyim', count: 85 },
      { id: 303, name: 'Çocuk Giyim', count: 35 },
      { id: 304, name: 'Ayakkabı ve Çanta', count: 15 }
    ]
  },
  { 
    id: 4, 
    name: 'Kitap & Hobi', 
    icon: '📚', 
    count: 95,
    subcategories: [
      { id: 401, name: 'Kitaplar', count: 55 },
      { id: 402, name: 'Müzik & Film', count: 25 },
      { id: 403, name: 'Koleksiyon', count: 10 },
      { id: 404, name: 'El İşi', count: 5 }
    ]
  },
  { 
    id: 5, 
    name: 'Spor', 
    icon: '⚽', 
    count: 65,
    subcategories: [
      { id: 501, name: 'Spor Malzemeleri', count: 25 },
      { id: 502, name: 'Outdoor', count: 20 },
      { id: 503, name: 'Fitness', count: 15 },
      { id: 504, name: 'Bisiklet & Scooter', count: 5 }
    ]
  },
  { 
    id: 6, 
    name: 'Oyun & Konsol', 
    icon: '🎮', 
    count: 40,
    subcategories: [
      { id: 601, name: 'Konsollar', count: 15 },
      { id: 602, name: 'Oyunlar', count: 20 },
      { id: 603, name: 'Aksesuarlar', count: 5 }
    ]
  }
];

const DUMMY_RECENT_PRODUCTS = [
  {
    id: 4,
    title: 'Eski Model Klasik Saat',
    description: 'Antika değeri olan klasik saat, çalışır durumda',
    price: 3500,
    image: '/images/watch.jpg',
    category: 'Antika'
  },
  {
    id: 5,
    title: 'Nike Spor Ayakkabı',
    description: 'Yeni sezon, hiç giyilmemiş, 42 numara',
    price: 2800,
    image: '/images/shoes.jpg',
    category: 'Giyim'
  },
  {
    id: 6,
    title: 'Avengers Koleksiyon Seti',
    description: 'Tüm Avengers figürleri, kutusunda',
    price: 1200,
    image: '/images/collectibles.jpg',
    category: 'Koleksiyon'
  },
  {
    id: 7,
    title: 'Vintage Deri Ceket',
    description: 'Hakiki deri, L beden, az kullanılmış',
    price: 4500,
    image: '/images/clothing.jpg',
    category: 'Giyim'
  }
];

function Home() {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [categories, setCategories] = useState(CATEGORIES_WITH_SUBCATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const navigate = useNavigate();
  
  // Kategorileri API'den getir
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Her durumda varsayılan 6 kategoriyi kullan
        setCategories(CATEGORIES_WITH_SUBCATEGORIES);
        setLoadingCategories(false);
        
      } catch (err) {
        console.error("Kategoriler alınırken hata:", err);
        setCategories(CATEGORIES_WITH_SUBCATEGORIES);
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
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
                        <span className="fw-bold product-price">{product.price.toLocaleString('tr-TR')} ₺</span>
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
                    <p className="mb-2 product-description">{product.description}</p>
                    <span className="badge bg-secondary mb-3 product-category">{product.category}</span>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </section>

        {/* Recent Products */}
        <section className="recent-products-section mb-5">
          <h2 className="section-title mb-4">Son Eklenen İlanlar</h2>
          {loading ? (
            <Loader centered />
          ) : (
            <Row>
              {DUMMY_RECENT_PRODUCTS.map((product) => (
                <Col key={product.id} md={3} sm={6} className="mb-4">
                  <Card
                    title={product.title}
                    image={product.image}
                    imageAlt={product.title}
                    className="product-card h-100"
                    footer={
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-bold product-price">{product.price.toLocaleString('tr-TR')} ₺</span>
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
                    <span className="badge bg-secondary mb-2 product-category">{product.category}</span>
                  </Card>
                </Col>
              ))}
            </Row>
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