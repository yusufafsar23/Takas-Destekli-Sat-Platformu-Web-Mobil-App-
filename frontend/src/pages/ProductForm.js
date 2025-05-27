import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productService, categoryService } from '../services/api';
import PricePrediction from '../components/PricePrediction';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [onlyForTrade, setOnlyForTrade] = useState(false);
  const [acceptsTradeOffers, setAcceptsTradeOffers] = useState(true);
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('active');
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [attributes, setAttributes] = useState({});

  // Yapay zeka fiyat tahmini için
  const [showPricePrediction, setShowPricePrediction] = useState(false);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [categoryDebug, setCategoryDebug] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Fetch product details if editing
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories();
        // Examine the response
        console.log("Category response:", response);
        
        // Handle different API response formats
        let categoriesData = [];
        
        if (response?.data?.data && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (Array.isArray(response)) {
          categoriesData = response;
        }
        
        console.log("İşlenen kategoriler:", categoriesData);
        
        // Kategori ID türlerini yazdır
        const debugCategoryData = categoriesData.map(cat => ({
          name: cat.name,
          id: cat.id,
          _id: cat._id,
          type: typeof cat._id,
          debug_id_type: cat.id ? typeof cat.id : 'yok'
        }));
        console.log("Kategori ID'leri ve türleri:", debugCategoryData);
        setCategoryDebug(debugCategoryData);
        
        // Kategori MongoID'lerini doğrudan konsola yazdır
        console.log("Kategori ID'leri MongoDB:");
        categoriesData.forEach(cat => {
          if (cat.name === 'Ev Eşyaları') {
            console.log(`Ev Eşyaları MongoID: ${cat._id}`);
          }
          console.log(`${cat.name}: ${cat._id}`);
        });
        
        setCategories(categoriesData);
      } catch (err) {
        console.error('Kategoriler yüklenirken hata oluştu:', err);
        setError('Kategoriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
        setCategories([]);
      }
    };
    
    fetchCategories();
    
    if (isEditing) {
      const fetchProductDetails = async () => {
        try {
          setLoading(true);
          const response = await productService.getProductById(id);
          console.log("Product details response:", response);
          
          // Get product data, handling different API response formats
          let product = null;
          if (response?.data?.data) {
            product = response.data.data;
          } else if (response?.data) {
            product = response.data;
          } else if (response) {
            product = response;
          }
          
          if (!product) {
            throw new Error("Ürün detayları alınamadı");
          }
          
          console.log("Processed product details:", product);
          
          // Check if current user is the owner
          if (product.owner && product.owner !== user.id && product.userId !== user.id) {
            navigate('/profile');
            return;
          }
          
          // Set form values
          setTitle(product.title || '');
          setDescription(product.description || '');
          setPrice(product.price ? product.price.toString() : '');
          setOnlyForTrade(!product.price || parseFloat(product.price) === 0);
          
          // Set acceptsTradeOffers from product
          if (product.acceptsTradeOffers !== undefined) {
            setAcceptsTradeOffers(product.acceptsTradeOffers);
          }
          
          // Set the category - handle both object and string formats
          if (product.category) {
            if (typeof product.category === 'object' && product.category._id) {
              setCategory(product.category._id);
              console.log("Setting category from object._id:", product.category._id);
            } else if (typeof product.category === 'object' && product.category.id) {
              setCategory(product.category.id);
              console.log("Setting category from object.id:", product.category.id);
            } else if (typeof product.category === 'string') {
              // If we have a string, check if it's an ID or a name
              if (/^[0-9a-fA-F]{24}$/.test(product.category)) {
                setCategory(product.category);
                console.log("Setting category from string ID:", product.category);
              } else {
                // If it's a name, find the matching category ID
                console.log("Category appears to be a name:", product.category);
                // We'll handle this when categories are loaded
              }
            } else if (product.categoryId) {
              setCategory(product.categoryId);
              console.log("Setting category from categoryId:", product.categoryId);
            }
          } else if (product.categoryId) {
            setCategory(product.categoryId);
            console.log("Setting category from fallback categoryId:", product.categoryId);
          }
          
          setCondition(product.condition || 'İyi');
          setLocation(product.location || '');
          
          // Set status
          if (product.status) {
            setStatus(product.status);
          }
          
          // Handle different image formats
          if (product.images) {
            let processedImages = [];
            let previewUrls = [];
            
            if (Array.isArray(product.images)) {
              if (product.images.length > 0) {
                if (typeof product.images[0] === 'string') {
                  // Array of strings
                  processedImages = product.images;
                  previewUrls = product.images;
                } else if (typeof product.images[0] === 'object') {
                  // Array of objects with url property
                  if (product.images[0].url) {
                    processedImages = product.images;
                    previewUrls = product.images.map(img => img.url);
                  } else {
                    // Try to extract first string property
                    processedImages = product.images;
                    previewUrls = product.images.map(img => {
                      const stringVal = Object.values(img).find(v => typeof v === 'string');
                      return stringVal || '';
                    }).filter(url => url);
                  }
                }
              }
            } else if (typeof product.images === 'string') {
              // Single string URL
              processedImages = [product.images];
              previewUrls = [product.images];
            }
            
            console.log("Processed images:", processedImages);
            console.log("Preview URLs:", previewUrls);
            
            setImages(processedImages);
            setImagePreviewUrls(previewUrls);
          }
          
          setLoading(false);
          setError(null);
        } catch (err) {
          setError('Ürün detayları yüklenirken bir hata oluştu.');
          setLoading(false);
          console.error('Product load error:', err);
        }
      };
      
      fetchProductDetails();
    }
  }, [id, isEditing, navigate, user]);
  
  // Kategori seçimi değiştiğinde
  useEffect(() => {
    // If category is a name and not an ID, try to find the matching category
    if (category && categories.length > 0 && !/^[0-9a-fA-F]{24}$/.test(category)) {
      console.log("Looking for category ID for name:", category);
      const categoryObj = categories.find(cat => 
        cat.name === category || 
        cat.name?.toLowerCase() === category?.toLowerCase()
      );
      
      if (categoryObj) {
        console.log("Found category by name. Setting ID:", categoryObj._id || categoryObj.id);
        setCategory(categoryObj._id || categoryObj.id);
      }
    }
  }, [category, categories]);
  
  // Kategori değiştiğinde yapay zeka fiyat tahmini göster
  useEffect(() => {
    if (category) {
      setShowPricePrediction(true);
    } else {
      setShowPricePrediction(false);
    }
  }, [category]);

  // Fiyat tahmini tamamlandığında çağrılacak fonksiyon
  const handlePricePredict = (prediction) => {
    console.log("Fiyat tahmini sonucu:", prediction);
    
    if (prediction && prediction.estimatedPrice) {
      // Fiyat tahmini sonucunu fiyat alanına ata
      const predictedPrice = prediction.estimatedPrice.toString();
      console.log("Atanacak fiyat değeri:", predictedPrice);
      
      // Doğrudan fiyat değerini ayarla
      setPrice(predictedPrice);
      
      // Takas seçeneğini kapat (çünkü fiyat belirledik)
      setOnlyForTrade(false);
      
      // Kullanıcıya bildirim ver
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  // Özellikler değiştiğinde çağrılacak fonksiyon
  const handleAttributeChange = (attributeName, value) => {
    setAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  const handleImageChange = (e) => {
    e.preventDefault();
    
    const files = Array.from(e.target.files);
    
    // Limit to max 5 images
    if (imageFiles.length + files.length > 5) {
      setError('En fazla 5 resim yükleyebilirsiniz.');
      return;
    }
    
    // Process each file
    const newImageFiles = [...imageFiles];
    const newPreviewUrls = [...imagePreviewUrls];
    
    files.forEach(file => {
      // Check file type
      if (!file.type.match('image.*')) {
        setError('Lütfen sadece resim dosyaları yükleyin.');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Resim dosyası 5MB\'dan küçük olmalıdır.');
        return;
      }
      
      newImageFiles.push(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result);
        setImagePreviewUrls([...newPreviewUrls]);
      };
      reader.readAsDataURL(file);
    });
    
    setImageFiles(newImageFiles);
    setError(null);
  };
  
  const handleRemoveImage = (index) => {
    // If it's an existing image (from server)
    if (index < images.length) {
      setImages(images.filter((_, i) => i !== index));
      setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
    } 
    // If it's a new image (not yet uploaded)
    else {
      const newIndex = index - images.length;
      setImageFiles(imageFiles.filter((_, i) => i !== newIndex));
      setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Formda gerekli alanların kontrolü
    if (!title.trim()) {
      setError('Başlık gereklidir.');
      return;
    }
    
    if (!description.trim()) {
      setError('Açıklama gereklidir.');
      return;
    }
    
    if (!category) {
      setError('Kategori gereklidir.');
      return;
    }
    
    if (!location.trim()) {
      setError('Konum gereklidir.');
      return;
    }
    
    if (!onlyForTrade && (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      setError('Geçerli bir fiyat giriniz.');
      return;
    }
    
    try {
      setSubmitLoading(true);
      setError(null);
      
      // FormData oluştur - hem ürün bilgileri hem de resimler için
      const formData = new FormData();
      
      // Temel ürün bilgilerini ekle
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', onlyForTrade ? 0 : price);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location);
      formData.append('acceptsTradeOffers', acceptsTradeOffers);
      formData.append('status', status);
      
      if (Object.keys(attributes).length > 0) {
        formData.append('attributes', JSON.stringify(attributes));
      }
      
      // Mevcut resimleri ekle (eğer düzenleme modundaysa)
      if (isEditing && images && images.length > 0) {
        formData.append('existingImages', JSON.stringify(images));
      }
      
      // Yeni resimleri ekle
      if (imageFiles.length > 0) {
        console.log(`Appending ${imageFiles.length} images to FormData`);
        imageFiles.forEach((file, index) => {
          console.log(`Adding image ${index + 1}:`, file.name, file.type, file.size);
          formData.append('images', file);
        });
      } else {
        console.log('No new images to upload');
      }
      
      // FormData içeriğini kontrol et (debug için)
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        if (key === 'images') {
          console.log(`${key}: [File object]`);
        } else if (key === 'existingImages') {
          console.log(`${key}: JSON string of existing images`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      console.log('Submitting product data with FormData');
      
      let response;
      if (isEditing) {
        response = await productService.updateProduct(id, formData);
      } else {
        response = await productService.createProduct(formData);
      }
      
      // Handle different API response formats
      let productData = null;
      if (response?.data?.data) {
        productData = response.data.data;
      } else if (response?.data) {
        productData = response.data;
      } else if (response) {
        productData = response;
      }
      
      if (!productData) {
        throw new Error("Ürün kayıt sonucu alınamadı");
      }
      
      console.log('Product saved successfully:', productData);
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/products/${productData._id || productData.id}`);
      }, 1500);
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err?.response?.data?.message || 'Ürün kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSubmitLoading(false);
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
  
  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={10}>
      <Card>
            <Card.Header>
              <h4>{isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h4>
            </Card.Header>
        <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">Ürün başarıyla {isEditing ? 'güncellendi' : 'oluşturuldu'}!</Alert>}
              
          <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Başlık</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ürün başlığı"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Form.Group>
                
                {/* Resim Yükleme */}
                <Form.Group className="mb-3">
                  <Form.Label>Ürün Resimleri</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mb-2"
                  />
                  <Form.Text className="text-muted">
                    En fazla 5 resim yükleyebilirsiniz. Her resim maksimum 5MB olmalıdır.
                  </Form.Text>
                  
                  {/* Resim Önizlemeleri */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="mt-3">
                      <Row>
                        {imagePreviewUrls.map((url, index) => (
                          <Col key={index} xs={6} md={3} className="mb-3">
                            <div className="position-relative">
                              <img
                                src={url}
                                alt={`Önizleme ${index + 1}`}
                                className="img-fluid rounded"
                                style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                className="position-absolute top-0 end-0 m-1"
                                onClick={() => handleRemoveImage(index)}
                                style={{ padding: '2px 6px' }}
                              >
                                ×
                              </Button>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                </Form.Group>
                
                    <Form.Group className="mb-3">
                  <Form.Label>Kategori</Form.Label>
                      <Form.Select
                        value={category}
                    onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="">Kategori Seçin</option>
                    {categories
                      .filter(cat => {
                        // Konsola her kategori adını yazdır (debug için)
                        const catName = cat.name || '';
                        console.log(`Kategori adı ve ID: "${catName}" - ${cat._id}`);
                        
                        // Gizlenecek kategorilerin adları - tam olarak eşleşecek şekilde
                        const hiddenCategories = [
                          'Aydınlatma', 
                          'Bahçe', 
                          'Diğer', 
                          'Fotoğraf ve Kamera', 
                          'Otomotiv Parçaları',
                          'Otomobil ve Parçaları',
                          'Elektronik',
                          // 'Giyim' - Erkek Giyim ve Kadın Giyim kategorilerinin gösterilmesi için kaldırıldı
                          'Ev Eşyaları'
                        ];
                        
                        // Kelime bazlı kontrolü de ekleyelim
                        const containsHiddenKeyword = (name) => {
                          const keywords = ['Otomobil', 'Otomotiv', 'Aydınlatma', 'Bahçe', 'Fotoğraf', 'Kamera', 'Elektronik', 'Ev Eşyaları'];
                          // 'Giyim' kelimesi kaldırıldı, böylece 'Erkek Giyim' ve 'Kadın Giyim' gösterilecek
                          return keywords.some(keyword => name.includes(keyword));
                        };
                        
                        // Karar sürecini detaylı loglayalım
                        const isHidden = hiddenCategories.includes(catName);
                        const containsKeyword = containsHiddenKeyword(catName);
                        
                        console.log(`  - "${catName}": Tam eşleşme: ${isHidden}, Keyword içeriyor: ${containsKeyword}`);
                        
                        // Doğrudan bu ID'yi kontrol edelim
                        if (cat._id === "68137ab1358c748f63723fda") {
                          console.log(`  - ID'si "68137ab1358c748f63723fda" olan kategori bulundu: "${catName}"`);
                          return false; // Bu ID'yi de gizle
                        }
                        
                        // Tam ad kontrolü veya kelime bazlı kontrol
                        return !isHidden && !containsKeyword;
                      })
                      .map((cat) => (
                      <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                    ))}
                      </Form.Select>
                    </Form.Group>
                
                {/* Kategori bazlı özellikler - Sadece AI tahmini için */}
                {/* Bu bölüm kaldırıldı - artık PricePrediction bileşeninde gösterilecek */}
                  
                    <Form.Group className="mb-3">
                  <Form.Label>Ürün Durumu</Form.Label>
                      <Form.Select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        required
                      >
                    <option value="Yeni">Yeni</option>
                        <option value="Yeni Gibi">Yeni Gibi</option>
                        <option value="İyi">İyi</option>
                    <option value="Makul">Makul</option>
                        <option value="Kötü">Kötü</option>
                      </Form.Select>
                    </Form.Group>
                
                {/* Yapay zeka fiyat tahmini */}
                {showPricePrediction && (
                  <>
                    <hr />
                    {success && (
                      <Alert variant="success" className="mb-3">
                        ✅ Tahmini fiyat ürün fiyatına uygulandı!
                      </Alert>
                    )}
                  <PricePrediction 
                    productData={{
                      title,
                      description,
                      category,
                      categoryName: categories.find(cat => cat._id === category)?.name || '',
                      condition,
                      attributes
                    }}
                    onPredictionComplete={handlePricePredict}
                  />
                    <hr />
                  </>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="onlyForTrade"
                    label="Sadece Takas - Fiyat Belirtme"
                    checked={onlyForTrade}
                    onChange={(e) => setOnlyForTrade(e.target.checked)}
                  />
                </Form.Group>
                
                {!onlyForTrade && (
                  <Form.Group className="mb-3">
                    <Form.Label>Fiyat (₺)</Form.Label>
                    <Form.Control
                      type="number"
                      placeholder="Fiyat"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required={!onlyForTrade}
                    />
                  </Form.Group>
                )}
                
                <Form.Group className="mb-3">
                  <Form.Label>Açıklama</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    placeholder="Ürün açıklaması"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Konum</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Şehir, ilçe (ör. İstanbul, Kadıköy)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <div className="mt-4 d-flex justify-content-between">
                  <Button variant="secondary" onClick={() => navigate(-1)}>
                İptal
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                        {isEditing ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                  </>
                ) : (
                      isEditing ? 'Ürünü Güncelle' : 'Ürünü Oluştur'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductForm; 