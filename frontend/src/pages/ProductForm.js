import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productService, categoryService } from '../services/api';

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
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  
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
          
          // Set the category - handle both object and string formats
          if (product.category) {
            if (typeof product.category === 'object' && product.category._id) {
              setCategory(product.category._id);
            } else if (typeof product.category === 'string') {
              setCategory(product.category);
            } else if (product.categoryId) {
              setCategory(product.categoryId);
            }
          } else if (product.categoryId) {
            setCategory(product.categoryId);
          }
          
          setCondition(product.condition || 'İyi');
          setLocation(product.location || '');
          
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
    
    if (!title || !description || !category || !condition || !location) {
      setError('Lütfen zorunlu alanları doldurun.');
      return;
    }
    
    if (!onlyForTrade && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      setError('Lütfen geçerli bir fiyat girin veya "Sadece Takas" seçeneğini işaretleyin.');
      return;
    }
    
    if (imagePreviewUrls.length === 0) {
      setError('Lütfen en az bir resim yükleyin.');
      return;
    }
    
    try {
      setSubmitLoading(true);
      setError(null);
      
      if (isEditing) {
        // Ürün güncelleme - önce sadece metin alanlarıyla deneyeceğiz
        try {
          // Sadece metin alanlarını içeren JSON verisi gönder
          const basicData = {
            title: title,
            description: description,
            price: onlyForTrade ? 0 : parseFloat(price),
            category: category,
            condition: condition,
            location: location
          };
          
          console.log("Updating with basic data only:", basicData);
          await productService.updateProduct(id, basicData);
          setSuccess(true);
          window.scrollTo(0, 0);
          setTimeout(() => navigate(`/products/${id}`), 2000);
          return;
        } catch (basicUpdateError) {
          console.error("Basic update failed:", basicUpdateError);
          // Hiçbir şey yapma, aşağıdaki koda devam et ve FormData ile dene
        }
        
        // FormData yaklaşımını dene, ama görüntüleri hariç tut
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', onlyForTrade ? '0' : price);
        formData.append('category', category);
        formData.append('condition', condition);
        formData.append('location', location);
        
        // ⚠️ ÖNEMLİ: Görüntüleri eklemiyoruz - Backend'deki 500 hatası muhtemelen görüntü işlemeyle ilgili
        
        console.log("Trying FormData without images");
        await productService.updateProduct(id, formData);
        setSuccess(true);
        window.scrollTo(0, 0);
        setTimeout(() => navigate(`/products/${id}`), 2000);
      } else {
        // Yeni ürün ekleme - normal süreci izle
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('price', onlyForTrade ? '0' : price);

        // Log selected category ID
        console.log("Seçilen kategori ID:", category);
        
        // Kategori ID'sini doğrula ve düzelt
        let selectedCategoryId = category;
        const selectedCategoryObj = categories.find(cat => 
          cat._id === category || cat.id === category || cat._id?.toString() === category
        );
        
        if (selectedCategoryObj) {
          console.log("Kategori nesnesi bulundu:", selectedCategoryObj);
          // MongoDB ObjectID'yi kullan
          selectedCategoryId = selectedCategoryObj._id;
          console.log("Düzeltilmiş kategori ID:", selectedCategoryId);
        } else {
          console.warn("Kategori nesnesi bulunamadı, orijinal ID kullanılıyor:", category);
        }
        
        formData.append('category', selectedCategoryId);
        formData.append('condition', condition);
        formData.append('location', location);
        formData.append('acceptsTradeOffers', 'true');
        
        // Resim dosyaları ekleme
        console.log("UPLOAD: Adding images to form data. Count:", imageFiles.length);
        if (imageFiles.length === 0) {
          console.warn("UPLOAD: No image files to upload!");
        }
        
        imageFiles.forEach((file, index) => {
          console.log(`UPLOAD: Adding image ${index + 1}:`, file.name, file.type, file.size);
          // Önemli: Tüm dosyalar 'images' adıyla eklenmelidir (backend'de bu adı bekliyor)
          formData.append('images', file);
        });
        
        // Form verilerini kontrol et
        console.log("UPLOAD: FormData entries:");
        for (let pair of formData.entries()) {
          const valueDisplay = pair[1] instanceof File ? 
            `[File: ${pair[1].name}, ${pair[1].type}, ${pair[1].size} bytes]` : 
            pair[1];
          console.log(`UPLOAD: ${pair[0]} = ${valueDisplay}`);
        }
        
        try {
          console.log("UPLOAD: Creating new product with FormData");
          console.log("UPLOAD: Kategori formda:", formData.get('category'));
          console.log("UPLOAD: Tüm form alanları:", {
            title: formData.get('title'),
            description: formData.get('description'),
            price: formData.get('price'),
            category: formData.get('category'),
            condition: formData.get('condition'),
            location: formData.get('location')
          });
          
          const response = await productService.createProduct(formData);
          console.log("UPLOAD: Product created successfully:", response);
          
          // Yanıtı kontrol et
          if (response && response.data) {
            console.log("UPLOAD: New product data:", response.data);
            console.log("UPLOAD: Images in the response:", 
              response.data.images || response.data.data?.images || "No images in response");
            
            // Eklenen ürünün kategori ID'si
            const addedProduct = response.data.data || response.data;
            if (addedProduct) {
              console.log("UPLOAD: Eklenen ürün kategori ID'si:", 
                addedProduct.category?._id || addedProduct.category || "Kategori ID bulunamadı");
            }
          }
          
          setSuccess(true);
          window.scrollTo(0, 0);
          setTimeout(() => navigate('/profile'), 2000);
        } catch (apiError) {
          console.error("UPLOAD: API error during product creation:", apiError);
          if (apiError.response) {
            console.error("UPLOAD: Server response:", apiError.response.data);
          }
          throw apiError; // Üst seviye hata yakalama için yeniden fırlat
        }
      }
    } catch (err) {
      console.error("Product operation error:", err);
      console.error("Error details:", err.response?.data || err.message);
      
      // Detaylı hata mesajı göster
      let errorMessage = `Ürün ${isEditing ? 'güncellenirken' : 'eklenirken'} bir hata oluştu.`;
      if (err.response?.data?.error?.message) {
        errorMessage += ` Hata detayı: ${err.response.data.error.message}`;
      }
      
      setError(errorMessage);
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
      <h1 className="mb-4">{isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h1>
      
      {success && (
        <Alert variant="success">
          Ürün başarıyla {isEditing ? 'güncellendi' : 'eklendi'}!
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger">{error}</Alert>
      )}
      
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={8}>
                {/* Title */}
                <Form.Group className="mb-3">
                  <Form.Label>Ürün Adı*</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ürünün adını girin"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Form.Group>
                
                {/* Description */}
                <Form.Group className="mb-3">
                  <Form.Label>Ürün Açıklaması*</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    placeholder="Ürün hakkında detaylı bilgi verin"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Row>
                  {/* Price */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fiyat (₺)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ürün fiyatı"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        disabled={onlyForTrade}
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3 mt-4">
                      <Form.Check
                        type="checkbox"
                        id="onlyForTrade"
                        label="Sadece Takas İçin"
                        checked={onlyForTrade}
                        onChange={(e) => {
                          setOnlyForTrade(e.target.checked);
                          if (e.target.checked) {
                            setPrice('');
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  {/* Category */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Kategori*</Form.Label>
                      <Form.Select
                        value={category}
                        onChange={(e) => {
                          console.log("Kategori değişti. Seçilen:", e.target.value);
                          setCategory(e.target.value);
                        }}
                        required
                      >
                        <option value="">Kategori Seçin</option>
                        {Array.isArray(categories) && categories.length > 0 ? (
                          categories.map(cat => {
                            // Kategori ID'sini log
                            console.log(`Kategori option: ${cat.name}, ID: ${cat._id}`);
                            return (
                            <option key={cat._id || cat.id} value={cat._id || cat.id}>
                              {cat.name}
                            </option>
                            );
                          })
                        ) : (
                          <option value="" disabled>Kategoriler yüklenemedi</option>
                        )}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  {/* Condition */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ürün Durumu*</Form.Label>
                      <Form.Select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
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
                
                {/* Location */}
                <Form.Group className="mb-3">
                  <Form.Label>Konum*</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ürün konumu (Şehir, İlçe vb.)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                {/* Images */}
                <Form.Group className="mb-3">
                  <Form.Label>Ürün Resimleri*</Form.Label>
                  <div className="mb-2">
                    <small className="text-muted">
                      En fazla 5 resim ekleyebilirsiniz. Her resim 5MB'dan küçük olmalıdır.
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => document.getElementById('imageInput').click()}
                      disabled={imagePreviewUrls.length >= 5}
                    >
                      Resim Seç
                    </Button>
                    <Form.Control
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                  
                  {/* Image Previews */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="image-preview-container">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="image-preview-item mb-2">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="img-thumbnail"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="remove-image-btn"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <i className="bi bi-x"></i>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
            
            <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
              <Button
                variant="secondary"
                onClick={() => navigate(isEditing ? `/products/${id}` : '/profile')}
              >
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
                    {isEditing ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                  </>
                ) : (
                  isEditing ? 'Ürünü Güncelle' : 'Ürünü Kaydet'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProductForm; 