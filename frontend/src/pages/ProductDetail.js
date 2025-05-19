import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { productService, tradeOfferService, categoryService } from '../services/api';

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
  const [activeImageIndex, setActiveImageIndex] = useState(0); // Aktif resim için state
  const [isZoomed, setIsZoomed] = useState(false); // Zoom durumu için state
  
  // Hızlı ürün ekleme için formState
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    title: '',
    description: '',
    price: '',
    onlyForTrade: false,
    condition: 'İyi',
    location: '',
    image: null,
    listInProfile: false // Ürünün profilde görünüp görünmeyeceği
  });
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quickAddError, setQuickAddError] = useState(null);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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

  // If user is logged in, fetch their products for trade
  useEffect(() => {
    if (user && showTradeModal) {
      const fetchMyProducts = async () => {
        try {
          const response = await productService.getUserProducts(user._id);
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
      
      // Kategorileri getir
      const fetchCategories = async () => {
        try {
          const response = await categoryService.getAllCategories();
          let categoriesData = [];
          
          if (response?.data) {
            categoriesData = response.data;
          } else if (Array.isArray(response)) {
            categoriesData = response;
          }
          
          setCategories(categoriesData);
        } catch (err) {
          console.error('Kategoriler yüklenirken hata oluştu:', err);
        }
      };
      
      fetchCategories();
    }
  }, [user, showTradeModal]);

  const handleToggleTradeModal = () => {
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    setShowTradeModal(!showTradeModal);
    // Modal kapanırken hızlı ürün ekleme formunu sıfırla
    if (showTradeModal) {
      setShowQuickAddProduct(false);
      setQuickProduct({
        title: '',
        description: '',
        price: '',
        onlyForTrade: false,
        condition: 'İyi',
        location: '',
        image: null,
        listInProfile: false
      });
      setPreviewImage(null);
      setQuickAddError(null);
    }
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
      const selectedProductId = selectedProducts[0];
      console.log("Sending trade offer with selected product:", selectedProductId);
      
      await tradeOfferService.createTradeOffer({
        requestedProductId: id,
        offeredProductId: selectedProductId, // Bu satır değişti - offeredProductIds yerine offeredProductId
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
      console.error('Takas teklifi gönderilirken hata oluştu:', err);
      console.error('Hata detayları:', {
        status: err.response?.status,
        message: err.response?.data?.error || err.message,
        requestedProductId: id,
        selectedProduct: selectedProducts[0]
      });
      
      // Kullanıcıya daha açıklayıcı hata mesajı göster
      setError(err.response?.data?.error || 'Takas teklifi gönderilirken bir hata oluştu.');
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

  // Hızlı ürün ekleme için işleyiciler
  const handleQuickProductChange = (e) => {
    const { name, value, checked, type } = e.target;
    setQuickProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleQuickImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Resim dosyası kontrolü
    if (!file.type.match('image.*')) {
      setQuickAddError('Lütfen sadece resim dosyaları yükleyin.');
      return;
    }
    
    // Dosya boyutu kontrolü (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setQuickAddError('Resim dosyası 5MB\'dan küçük olmalıdır.');
      return;
    }
    
    setQuickProduct(prev => ({
      ...prev,
      image: file
    }));
    
    // Önizleme URL'si oluştur
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
    setQuickAddError(null);
  };
  
  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    
    // Form validasyonu
    if (!quickProduct.title || !quickProduct.description || !selectedCategory || !quickProduct.location) {
      setQuickAddError('Lütfen zorunlu alanları doldurun.');
      return;
    }
    
    if (!quickProduct.onlyForTrade && (!quickProduct.price || isNaN(parseFloat(quickProduct.price)) || parseFloat(quickProduct.price) <= 0)) {
      setQuickAddError('Lütfen geçerli bir fiyat girin veya "Sadece Takas" seçeneğini işaretleyin.');
      return;
    }
    
    if (!quickProduct.image) {
      setQuickAddError('Lütfen bir ürün resmi yükleyin.');
      return;
    }
    
    try {
      setQuickAddLoading(true);
      setQuickAddError(null);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('title', quickProduct.title);
      formData.append('description', quickProduct.description);
      formData.append('price', quickProduct.onlyForTrade ? '0' : quickProduct.price);
      formData.append('category', selectedCategory);
      formData.append('condition', quickProduct.condition);
      formData.append('location', quickProduct.location);
      formData.append('acceptsTradeOffers', 'true');
      formData.append('images', quickProduct.image);
      
      // Ürün oluştur
      const response = await productService.createProduct(formData);
      console.log("Hızlı ürün ekleme başarılı:", response);
      
      // Yeni ürünü ürün listesine ekle
      let newProduct = null;
      if (response?.data?.data) {
        newProduct = response.data.data;
      } else if (response?.data) {
        newProduct = response.data;
      }
      
      if (newProduct) {
        // Yeni ürünü seç
        setSelectedProducts([newProduct._id]);
        
        // Eğer kullanıcı "Profilimde listele" seçeneğini işaretlemediyse
        if (!quickProduct.listInProfile) {
          console.log("Ürün profilde listelenmeyecek.");
          // Ürünü görünmez yap (inactive)
          await productService.updateProductVisibility(newProduct._id, false);
          console.log("Ürün gizlendi");
        } else {
          // Ürünü listeye ekle
          setMyProducts(prev => [...prev, newProduct]);
          console.log("Ürün profilde listelenmek üzere eklendi.");
        }
      }
      
      // Form görünümünü kapat
      setShowQuickAddProduct(false);
      
    } catch (err) {
      console.error("Ürün eklenirken hata oluştu:", err);
      setQuickAddError('Ürün eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setQuickAddLoading(false);
    }
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
  let productImages = [];
  
  // Resim verilerini debug amaçlı loglama
  console.log("Product images data:", product.images);
  
  if (product.images && product.images.length > 0) {
    // Tüm resimleri işle
    productImages = product.images.map(image => {
      try {
        let imageUrl;
        
        // Resim türüne göre URL belirle
        if (typeof image === 'string') {
          // String format (doğrudan URL)
          imageUrl = image;
          console.log("Using string URL:", imageUrl);
        } 
        else if (typeof image === 'object' && image !== null) {
          // Object format - URL veya filename özelliğini kullan
          if (image.url) {
            imageUrl = image.url;
            console.log("Using object.url:", imageUrl);
          }
          else if (image.filename) {
            imageUrl = `/uploads/products/${image.filename}`;
            console.log("Using filename:", imageUrl);
          }
        }
        
        // /uploads/ klasöründeki dosyalar için zaman damgası ekle
        if (imageUrl && imageUrl.includes('/uploads/')) {
          imageUrl = `${imageUrl}?t=${Date.now()}`;
          console.log("Added timestamp to URL:", imageUrl);
        }
        
        return imageUrl || placeholderImage;
      } catch (err) {
        console.error("Error processing image:", err);
        return placeholderImage;
      }
    });
    
    // En az bir resim yoksa placeholder ekle
    if (productImages.length === 0) {
      productImages.push(placeholderImage);
    }
    
    // Ana resim
    productImageUrl = productImages[activeImageIndex] || productImages[0] || placeholderImage;
  } else {
    // Resim yoksa kategori placeholder'ı
    productImageUrl = placeholderImage;
    productImages.push(placeholderImage);
    console.log("Using placeholder image:", productImageUrl);
  }
  
  // Resim değiştirme fonksiyonu
  const handleImageChange = (index) => {
    setActiveImageIndex(index);
  };
  
  // Önceki resme geçiş
  const handlePrevImage = () => {
    setActiveImageIndex(prevIndex => {
      if (prevIndex <= 0) return productImages.length - 1;
      return prevIndex - 1;
    });
  };
  
  // Sonraki resme geçiş
  const handleNextImage = () => {
    setActiveImageIndex(prevIndex => {
      if (prevIndex >= productImages.length - 1) return 0;
      return prevIndex + 1;
    });
  };
  
  // Resme tıklandığında zoom yap/kaldır
  const handleImageZoom = (e) => {
    // Eğer event navigasyon butonlarından geldiyse zoom yapmayı engelle
    if (e.target.closest('.image-nav-button')) {
      return;
    }
    setIsZoomed(!isZoomed);
  };

  return (
    <Container className="py-4">
      <Row>
        <Col md={6}>
          <div className="product-gallery">
            <div className={`main-image-container ${isZoomed ? 'zoomed' : ''}`}>
              <img 
                src={productImageUrl}
                alt={product.title || "Ürün Görüntüsü"} 
                className={`img-fluid rounded main-product-image ${isZoomed ? 'zoomed' : ''}`}
                onClick={handleImageZoom}
                onError={(e) => {
                  console.log("Image failed to load, using placeholder");
                  e.target.onerror = null;
                  e.target.src = placeholderImage;
                }}
              />
              
              {/* Kapatma Butonu - Zoom modunda */}
              {isZoomed && (
                <button 
                  className="zoom-close-button" 
                  onClick={handleImageZoom}
                  aria-label="Zoom'u kapat"
                >
                  &times;
                </button>
              )}
              
              {/* Resim Navigasyon Okları */}
              {productImages.length > 1 && !isZoomed && (
                <div className="image-navigation">
                  <button 
                    className="image-nav-button" 
                    onClick={handlePrevImage}
                    aria-label="Önceki resim"
                  >
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>&lsaquo;</span>
                  </button>
                  <button 
                    className="image-nav-button" 
                    onClick={handleNextImage}
                    aria-label="Sonraki resim"
                  >
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>&rsaquo;</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Thumbnail Galerisi */}
            {productImages.length > 1 && !isZoomed && (
              <div className="d-flex mt-3 flex-wrap justify-content-start">
                {productImages.map((imgUrl, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail-container me-2 mb-2 ${index === activeImageIndex ? 'active-thumbnail' : ''}`}
                    onClick={() => handleImageChange(index)}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`${product.title} - ${index + 1}`} 
                      className="thumbnail"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = placeholderImage;
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
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
            {user && user._id === product.owner?._id ? (
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
                  Takas için ürününüz bulunmuyor. 
                  <div className="mt-2 d-flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => setShowQuickAddProduct(true)}>
                      Hızlı Ürün Ekle
                    </Button>
                    <Button variant="outline-secondary" size="sm" onClick={() => navigate('/products/add')}>
                      Detaylı Ürün Ekle
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
                  
                  <div className="mt-3 mb-3">
                    <Button variant="outline-primary" size="sm" onClick={() => setShowQuickAddProduct(true)}>
                      Yeni Ürün Ekle
                    </Button>
                  </div>
                  
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
              
              {/* Hızlı Ürün Ekleme Formu */}
              {showQuickAddProduct && (
                <div className="quick-add-product mt-3">
                  <h5 className="mb-3">Hızlı Ürün Ekle</h5>
                  
                  {quickAddError && (
                    <Alert variant="danger" className="mb-3">
                      {quickAddError}
                    </Alert>
                  )}
                  
                  <Form onSubmit={handleQuickAddProduct}>
                    <Row>
                      <Col md={previewImage ? 8 : 12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ürün Adı*</Form.Label>
                          <Form.Control
                            type="text"
                            name="title"
                            value={quickProduct.title}
                            onChange={handleQuickProductChange}
                            placeholder="Ürünün adını girin"
                            required
                          />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Ürün Açıklaması*</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            name="description"
                            value={quickProduct.description}
                            onChange={handleQuickProductChange}
                            placeholder="Ürün hakkında kısa bir açıklama"
                            required
                          />
                        </Form.Group>
                        
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Fiyat (₺)</Form.Label>
                              <Form.Control
                                type="number"
                                step="0.01"
                                min="0"
                                name="price"
                                value={quickProduct.price}
                                onChange={handleQuickProductChange}
                                placeholder="Ürün fiyatı"
                                disabled={quickProduct.onlyForTrade}
                              />
                            </Form.Group>
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group className="mb-3 mt-4">
                              <Form.Check
                                type="checkbox"
                                id="quickOnlyForTrade"
                                name="onlyForTrade"
                                label="Sadece Takas İçin"
                                checked={quickProduct.onlyForTrade}
                                onChange={handleQuickProductChange}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Kategori*</Form.Label>
                              <Form.Select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                required
                              >
                                <option value="">Kategori Seçin</option>
                                {Array.isArray(categories) && categories.length > 0 ? (
                                  categories.map(cat => (
                                    <option key={cat._id || cat.id} value={cat._id || cat.id}>
                                      {cat.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>Kategoriler yüklenemedi</option>
                                )}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Ürün Durumu*</Form.Label>
                              <Form.Select
                                name="condition"
                                value={quickProduct.condition}
                                onChange={handleQuickProductChange}
                                required
                              >
                                <option value="Yeni">Sıfır</option>
                                <option value="Yeni Gibi">Yeni Gibi</option>
                                <option value="İyi">İyi</option>
                                <option value="Makul">Orta</option>
                                <option value="Kötü">Kötü</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                        
                        <Form.Group className="mb-3">
                          <Form.Label>Konum*</Form.Label>
                          <Form.Control
                            type="text"
                            name="location"
                            value={quickProduct.location}
                            onChange={handleQuickProductChange}
                            placeholder="Ürün konumu (Şehir, İlçe vb.)"
                            required
                          />
                        </Form.Group>
                      </Col>
                      
                      {previewImage && (
                        <Col md={4}>
                          <div className="text-center">
                            <img 
                              src={previewImage} 
                              alt="Ürün Önizleme" 
                              className="img-thumbnail mb-2" 
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                        </Col>
                      )}
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Ürün Resmi*</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleQuickImageChange}
                        required
                      />
                      <Form.Text className="text-muted">
                        Ürünün görünür bir fotoğrafını ekleyin.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="listInProfile"
                        name="listInProfile"
                        label="Bu ürünü profilimde de listele"
                        checked={quickProduct.listInProfile}
                        onChange={handleQuickProductChange}
                      />
                      <Form.Text className="text-muted">
                        İşaretlerseniz, ürün hesabınızda da listelenir. İşaretlemezseniz, sadece bu takas teklifi için kullanılır.
                      </Form.Text>
                    </Form.Group>
                    
                    <div className="d-flex justify-content-between mt-3">
                      <Button variant="outline-secondary" onClick={() => setShowQuickAddProduct(false)}>
                        İptal
                      </Button>
                      <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={quickAddLoading}
                      >
                        {quickAddLoading ? 'Ekleniyor...' : 'Ürünü Ekle ve Seç'}
                      </Button>
                    </div>
                  </Form>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleToggleTradeModal}>
            Kapat
          </Button>
          {!tradeSuccess && myProducts && myProducts.length > 0 && !showQuickAddProduct && (
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