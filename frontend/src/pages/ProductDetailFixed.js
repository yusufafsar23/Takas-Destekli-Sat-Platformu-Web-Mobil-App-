import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { productService, tradeOfferService } from '../services/api';

// API URL - Resimlerin tam yolunu oluşturmak için kullanılacak
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Resim URL'sini düzgün formata çevirme yardımcı fonksiyonu
const getImageUrl = (image) => {
  console.log("getImageUrl received image:", image);
  
  if (!image) {
    console.log("Image data is missing");
    return '/images/product-placeholder.jpg';
  }
  
  // Eğer nesne formatındaysa
  if (typeof image === 'object' && image !== null) {
    // url özelliği varsa direkt döndür
    if (image.url) {
      console.log("Found image.url:", image.url);
      
      // /uploads/ ile başlıyorsa, önbellek sorununu önlemek için timestamp ekle
      if (image.url.startsWith('/uploads/')) {
        const imageUrl = `${image.url}?t=${new Date().getTime()}`;
        console.log("Added timestamp to URL:", imageUrl);
        return imageUrl;
      }
      
      return image.url;
    }
    
    // Bazı API yanıtlarında secure_url olabilir
    if (image.secure_url) {
      console.log("Found image.secure_url:", image.secure_url);
      return image.secure_url;
    }
    
    // Doğrudan filename varsa
    if (image.filename) {
      const imageUrl = `/uploads/products/${image.filename}?t=${new Date().getTime()}`;
      console.log("Created URL from filename:", imageUrl);
      return imageUrl;
    }
    
    // Array olarak gelirse ilk elemana bakılır
    if (Array.isArray(image) && image.length > 0) {
      return getImageUrl(image[0]); // Özyinelemeli olarak ilk elemanı işle
    }
  }
  
  // Eğer string ise
  if (typeof image === 'string') {
    console.log("Image is a string:", image);
    
    // Tam URL ise doğrudan kullan
    if (image.startsWith('http')) {
      console.log("Using http URL:", image);
      return image;
    }
    
    // /uploads/ ile başlayan dosya yolu - önbellek sorununu önlemek için timestamp ekle
    if (image.startsWith('/uploads/')) {
      console.log("Found uploads path:", image);
      const imageUrl = `${image}?t=${new Date().getTime()}`;
      console.log("Added timestamp to URL:", imageUrl);
      return imageUrl;
    }
    
    // Sadece dosya adı olabilir
    if (image.includes('.jpg') || image.includes('.png') || image.includes('.jpeg') || image.includes('.gif')) {
      const imageUrl = `/uploads/products/${image}?t=${new Date().getTime()}`;
      console.log("Created URL from filename string:", imageUrl);
      return imageUrl;
    }
    
    // Herhangi bir dosya yolu (/) ile başlıyorsa
    if (image.startsWith('/')) {
      console.log("Found path starting with /:", image);
      return image;
    }
    
    // Diğer herhangi bir string
    return image;
  }
  
  // Eğer bir dizi ise
  if (Array.isArray(image)) {
    // Dizi boşsa default resim döndür
    if (image.length === 0) return '/images/product-placeholder.jpg';
    
    // İlk elemanı işle
    return getImageUrl(image[0]);
  }
  
  // Hiçbir duruma uymuyorsa placeholder döndür
  console.log("Using placeholder image as fallback");
  return '/images/product-placeholder.jpg';
};

// Kategoriye göre uygun placeholder resmi döndür
const getCategoryPlaceholder = (category) => {
  if (!category) return '/images/product-placeholder.jpg';
  
  const categoryName = category.name ? category.name.toLowerCase() : '';
  
  // Kategori ismine göre uygun resmi seç
  if (categoryName.includes('elektronik')) return '/images/electronics.jpg';
  if (categoryName.includes('giyim') || categoryName.includes('kıyafet')) return '/images/clothing.jpg';
  if (categoryName.includes('ev') || categoryName.includes('mobilya')) return '/images/furniture.jpg';
  if (categoryName.includes('kitap')) return '/images/books.jpg';
  if (categoryName.includes('spor')) return '/images/sports.jpg';
  
  // Eşleşme yoksa genel placeholder
  return '/images/product-placeholder.jpg';
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [myProducts, setMyProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [additionalNote, setAdditionalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [placeholderImage, setPlaceholderImage] = useState('/images/product-placeholder.jpg');

  // Fetch product details
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        console.log("Fetching product with ID:", id);
        const response = await productService.getProductById(id);
        console.log("Product API response:", response);
        
        // Veri yapısını kontrol edip extract et
        let productData = null;
        if (response.data && response.data.data) {
          console.log("Using response.data.data path");
          productData = response.data.data;
        } else if (response.data) {
          console.log("Using response.data directly");
          productData = response.data;
        }
        
        if (productData) {
          console.log("Extracted product data:", {
            title: productData.title,
            description: productData.description,
            hasImages: productData.images && productData.images.length > 0,
            imageCount: productData.images ? productData.images.length : 0,
            firstImage: productData.images && productData.images.length > 0 ? productData.images[0] : null,
            owner: productData.owner,
            ownerId: productData.owner?._id || productData.owner?.id,
            price: productData.price,
            acceptsTradeOffers: productData.acceptsTradeOffers
          });
          
          // Kategori verisi varsa uygun placeholder'ı ayarla
          if (productData.category) {
            setPlaceholderImage(getCategoryPlaceholder(productData.category));
          }
        }
        
        setProduct(productData);
        setError(null);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError('Ürün detayları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // Kullanıcı bilgisi değiştiğinde debug için
  useEffect(() => {
    if (user) {
      console.log("Current user info:", {
        userId: user._id || user.id,
        username: user.username,
        _id: user._id,
        id: user.id
      });
    }
  }, [user]);

  // Ürün ve kullanıcı bilgisi beraber değiştiğinde debug için
  useEffect(() => {
    if (user && product && product.owner) {
      console.log("ÜRÜN-KULLANICI EŞLEŞMESİ KONTROLÜ:", {
        userId: user._id || user.id,
        ownerId: product.owner._id || product.owner.id,
        isMatch: 
          user._id === product.owner._id || 
          user.id === product.owner._id || 
          user._id === product.owner.id || 
          user.id === product.owner.id ||
          String(user._id) === String(product.owner._id) || 
          String(user.id) === String(product.owner._id) || 
          String(user._id) === String(product.owner.id) || 
          String(user.id) === String(product.owner.id)
      });
    }
  }, [user, product]);

  // If user is logged in, fetch their products for trade
  useEffect(() => {
    if (user && showTradeModal) {
      const fetchMyProducts = async () => {
        try {
          const response = await productService.getAllProducts({ userId: user.id });
          console.log("My products response:", response);
          
          // API yanıt formatını güvenli şekilde işleme
          let products = [];
          if (response?.data?.data && Array.isArray(response.data.data)) {
            products = response.data.data;
          } else if (response?.data?.products && Array.isArray(response.data.products)) {
            products = response.data.products;
          } else if (response?.data && Array.isArray(response.data)) {
            products = response.data;
          } else if (Array.isArray(response)) {
            products = response;
          }
          
          console.log("Processed my products:", products);
          setMyProducts(products);
        } catch (err) {
          console.error('Kullanıcı ürünleri yüklenirken hata oluştu:', err);
          setMyProducts([]); // Hata durumunda boş dizi set et
        }
      };
      
      fetchMyProducts();
    }
  }, [user, showTradeModal]);

  const handleToggleTradeModal = () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    setShowTradeModal(!showTradeModal);
  };

  const handleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        // Sadece bir ürün seçilebilir - backend tek ürün bekliyor
        return [productId];
      }
    });
  };

  const handleSendTradeOffer = async () => {
    if (selectedProducts.length === 0) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Değişiklik burada: Backend tek bir ürün ID'si bekliyor (offeredProductId)
      // Diziden (offeredProductIds) ilk ürünü alıyoruz
      await tradeOfferService.createTradeOffer({
        requestedProductId: id,
        offeredProductId: selectedProducts[0], // Bu satır değişti - offeredProductIds yerine offeredProductId
        message: additionalNote  // Ek not, message olarak gönderiliyor
      });
      
      setTradeSuccess(true);
      setSelectedProducts([]);
      setAdditionalNote('');
      setTimeout(() => {
        setShowTradeModal(false);
        setTradeSuccess(false);
      }, 3000);
    } catch (err) {
      setError('Takas teklifi gönderilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConversation = () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    navigate('/messages', { state: { newConversation: true, productId: id, participantId: product.owner._id } });
  };

  // User-product ownership check
  const isCurrentUserOwner = () => {
    if (!user || !product || !product.owner) {
      return false;
    }
    
    // Farklı ID formatlarını karşılaştır
    const userId = user._id || user.id;
    const ownerId = product.owner._id || product.owner.id;
    
    // Olası durumları kontrol et
    if (userId === ownerId) {
      console.log("MATCH: Doğrudan ID eşleşmesi!");
      return true;
    }
    
    // String olarak karşılaştır (bazı ID'ler object formatında olabilir)
    if (String(userId) === String(ownerId)) {
      console.log("MATCH: String ID eşleşmesi!");
      return true;
    }
    
    // Owner objesi içindeki alternatif alanları kontrol et
    if (product.owner.userId && (userId === product.owner.userId || String(userId) === String(product.owner.userId))) {
      console.log("MATCH: userId alanı ile eşleşme!");
      return true;
    }
    
    // Owner ID farklı key alanlarında olabilir
    const ownerObjectKeys = Object.keys(product.owner);
    for (const key of ownerObjectKeys) {
      if (key.toLowerCase().includes('id') && userId === product.owner[key]) {
        console.log(`MATCH: ${key} alanında eşleşme!`);
        return true;
      }
    }
    
    // Kullanıcı adına göre kontrol (son çare olarak)
    if (user.username && product.owner.username && user.username === product.owner.username) {
      console.log("MATCH: Kullanıcı adı eşleşmesi!");
      return true;
    }
    
    console.log("NO MATCH: Ürün sahibi eşleşmesi bulunamadı");
    return false;
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">Ürün bulunamadı.</Alert>
      </Container>
    );
  }

  // Ürün resmi için URL almaya çalış, yoksa placeholder kullan
  let productImageUrl;
  
  // Resim verilerini debug amaçlı loglama
  console.log("Product images data:", product.images);
  
  if (product.images && product.images.length > 0) {
    // Detaylı loglama
    console.log("First image data:", product.images[0]);
    
    try {
      const firstImage = product.images[0];
      
      // Resim türüne göre URL belirle
      if (typeof firstImage === 'string') {
        // String format (doğrudan URL)
        productImageUrl = firstImage;
        console.log("Using string URL:", productImageUrl);
      } 
      else if (typeof firstImage === 'object' && firstImage !== null) {
        // Object format - URL veya filename özelliğini kullan
        if (firstImage.url) {
          productImageUrl = firstImage.url;
          console.log("Using object.url:", productImageUrl);
        }
        else if (firstImage.filename) {
          productImageUrl = `/uploads/products/${firstImage.filename}`;
          console.log("Using filename:", productImageUrl);
        }
      }
      
      // /uploads/ klasöründeki dosyalar için zaman damgası ekle
      if (productImageUrl && productImageUrl.includes('/uploads/')) {
        productImageUrl = `${productImageUrl}?t=${Date.now()}`;
        console.log("Added timestamp to URL:", productImageUrl);
      }
    } catch (err) {
      console.error("Error processing image:", err);
      productImageUrl = placeholderImage;
    }
  } else {
    // Resim yoksa kategori placeholder'ı
    productImageUrl = placeholderImage;
    console.log("Using placeholder image:", productImageUrl);
  }

  return (
    <Container className="py-4">
      <Row>
        <Col md={6}>
          <div className="product-gallery">
            <img 
              src={productImageUrl}
              alt={product.title || "Ürün Görüntüsü"} 
              className="img-fluid rounded main-product-image"
              onError={(e) => {
                console.log("Image failed to load, using placeholder");
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
          </div>
        </Col>
        
        <Col md={6}>
          <h2>{product.title || 'Ürün Başlığı Yok'}</h2>
          
          <div className="mb-3">
            <Badge bg="secondary" className="me-2">{product.condition || 'Belirtilmemiş'}</Badge>
            {product.category && <Badge bg="info">{product.category.name}</Badge>}
          </div>
          
          <h3 className="text-primary mb-3">
            {product.price > 0 ? `${product.price} ₺` : 'Sadece Takas'}
            {product.acceptsTradeOffers && <Badge bg="success" className="ms-2">Takas Kabul Edilir</Badge>}
          </h3>
          
          <div className="product-description mb-4">
            <h5>Ürün Açıklaması</h5>
            <p>{product.description || 'Ürün açıklaması bulunmuyor.'}</p>
          </div>
          
          <div className="seller-info mb-4">
            <h5>Satıcı Bilgileri</h5>
            <p>
              <strong>{product.owner ? product.owner.username : 'İsimsiz Kullanıcı'}</strong><br />
              <small>Konum: {product.location || 'Belirtilmemiş'}</small>
            </p>
            {!product.owner && (
              <Alert variant="warning">
                Satıcı bilgileri yüklenemedi.
              </Alert>
            )}
          </div>
          
          <div className="d-grid gap-2">
            {isCurrentUserOwner() ? (
              <Button variant="outline-secondary" onClick={() => navigate(`/products/edit/${id}`)}>
                Ürünü Düzenle
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={handleToggleTradeModal}>
                  Takas Teklifi Gönder
                </Button>
                <Button variant="outline-secondary" onClick={handleStartConversation}>
                  Satıcıya Mesaj Gönder
                </Button>
              </>
            )}
          </div>
        </Col>
      </Row>

      {/* Takas Teklifi Modal */}
      <Modal show={showTradeModal} onHide={handleToggleTradeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Takas Teklifi Gönder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tradeSuccess ? (
            <Alert variant="success">
              Takas teklifiniz başarıyla gönderildi! Satıcının yanıtını bekleyin.
            </Alert>
          ) : (
            <>
              <p>
                <strong>{product.title}</strong> için takas teklifi oluşturun.
                Takas etmek istediğiniz ürünü seçin:
              </p>
              
              {!myProducts || myProducts.length === 0 ? (
                <Alert variant="info">
                  Takas için ürününüz bulunmuyor. İlk önce ürün eklemelisiniz.
                  <div className="mt-2">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate('/products/add')}>
                      Ürün Ekle
                    </Button>
                  </div>
                </Alert>
              ) : (
                <>
                  <Row>
                    {myProducts.map(item => (
                      <Col md={4} key={item.id || item._id} className="mb-3">
                        <Card 
                          className={`product-selection-card ${selectedProducts.includes(item.id || item._id) ? 'selected' : ''}`}
                          onClick={() => handleProductSelection(item.id || item._id)}
                        >
                          <div className="card-img-wrapper">
                            <Card.Img 
                              variant="top" 
                              src={item.images && Array.isArray(item.images) && item.images.length > 0 
                                ? getImageUrl(item.images[0]) 
                                : '/images/product-placeholder.jpg'}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/product-placeholder.jpg';
                              }}
                            />
                            {selectedProducts.includes(item.id || item._id) && (
                              <div className="selected-overlay">
                                <span className="check-icon">✓</span>
                              </div>
                            )}
                          </div>
                          <Card.Body>
                            <Card.Title className="small-title">{item.title}</Card.Title>
                            <Card.Text className="small-price">
                              {item.price ? `${item.price} ₺` : 'Sadece Takas'}
                            </Card.Text>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Ek Not (İsteğe Bağlı)</Form.Label>
                    <Form.Control 
                      as="textarea" 
                      rows={3} 
                      value={additionalNote}
                      onChange={(e) => setAdditionalNote(e.target.value)}
                      placeholder="Satıcıya iletmek istediğiniz bilgiler..."
                    />
                  </Form.Group>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleToggleTradeModal}>
            Kapat
          </Button>
          {!tradeSuccess && myProducts && myProducts.length > 0 && (
            <Button 
              variant="primary" 
              onClick={handleSendTradeOffer}
              disabled={selectedProducts.length === 0 || submitting}
            >
              {submitting ? 'Gönderiliyor...' : 'Takas Teklifi Gönder'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductDetail; 