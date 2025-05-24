import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Badge } from 'react-bootstrap';
import { Button, Input, Alert, Loader } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { productService, tradeOfferService } from '../services/api';

const Profile = () => {
  const { user, updateProfile, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Products and Trade Offers state
  const [userProducts, setUserProducts] = useState([]);
  const [tradeOffers, setTradeOffers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [productError, setProductError] = useState('');
  const [offerError, setOfferError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (user) {
      console.log("PROFILE CRITICAL - Kullanıcı verileri:", JSON.stringify(user));
      
      // Öncelikle fullName değerini belirle
      let fullNameValue = '';
      
      // CASE 1: Doğrudan fullName kullan (varsa)
      if (user.fullName && user.fullName.trim() !== '') {
        fullNameValue = user.fullName.trim();
        console.log(`PROFILE CRITICAL - fullName zaten mevcut: "${fullNameValue}"`);
      } 
      // CASE 2: firstName ve lastName'i birleştir (ikisi veya biri varsa)
      else if (user.firstName || user.lastName) {
        fullNameValue = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        console.log(`PROFILE CRITICAL - firstName ve lastName'den fullName oluşturuldu: "${fullNameValue}"`);
      }
      
      // Hiçbir değer yoksa son çare olarak username kullan
      if (!fullNameValue && user.username) {
        fullNameValue = user.username;
        console.log(`PROFILE CRITICAL - fullName FALLBACK (username): "${fullNameValue}"`);
      }
      
      // Username bilgisini ekle (varsa ve fullName'den farklıysa)
      let displayNameValue = fullNameValue;
      if (user.username && user.username !== fullNameValue) {
        // Format: "Ad Soyad kullanıcı_adı" - parantezsiz
        displayNameValue = fullNameValue ? `${fullNameValue} ${user.username}` : user.username;
        console.log(`PROFILE CRITICAL - Username eklendi (parantezsiz): "${displayNameValue}"`);
      }
      
      console.log(`PROFILE CRITICAL - Form değerleri (SON): fullName="${displayNameValue}"`);
      
      // Form verilerini güncelle
      setFormData({
        fullName: displayNameValue,
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        zipCode: user.zipCode || ''
      });
    }
  }, [user]);

  useEffect(() => {
    // Load user products when the listings tab is selected
    if (activeTab === 'listings') {
      fetchUserProducts();
    }
    
    // Load trade offers when the offers tab is selected
    if (activeTab === 'offers') {
      fetchTradeOffers();
    }
  }, [activeTab]);
  
  const fetchUserProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductError('');
      
      if (user) {
        // Debug kullanıcı kimliği
        console.log("PRODUCTS DEBUG - Kullanıcı bilgileri:", {
          user_id: user.id || user._id,
          id_type: typeof (user.id || user._id),
          user_keys: Object.keys(user)
        });
        
        // Kullanıcı ID'sini doğru formatta belirle
        const userId = user.id || user._id;
        
        if (!userId) {
          console.error("PRODUCTS ERROR - Kullanıcı ID bulunamadı:", user);
          setProductError('Kullanıcı kimliği bulunamadı. Lütfen yeniden giriş yapın.');
          return;
        }
        
        console.log(`PRODUCTS DEBUG - ${userId} ID'li kullanıcının ürünleri getiriliyor...`);
        
        try {
          // Hata ayıklama için timeout ekle
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Ürün yükleme zaman aşımı')), 15000)
          );
          
          // İstek ile timeout yarışı
          const response = await Promise.race([
            productService.getUserProducts(userId),
            timeoutPromise
          ]);
          
          console.log("PRODUCTS DEBUG - API yanıtı:", response);
          
          // Yanıt formatını kontrol et
          let productsData = [];
          
          if (response && response.data) {
            if (Array.isArray(response.data)) {
              productsData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              productsData = response.data.data;
            } else if (typeof response.data === 'object') {
              // Nesne olabilir, içeriğine bakalım
              console.log("PRODUCTS DEBUG - Veri nesnesi anahtarları:", Object.keys(response.data));
              // Dizi içeren bir anahtar var mı diye kontrol et
              for (const key of Object.keys(response.data)) {
                if (Array.isArray(response.data[key])) {
                  productsData = response.data[key];
                  console.log(`PRODUCTS DEBUG - Ürün dizisi '${key}' anahtarında bulundu`);
                  break;
                }
              }
            }
          }
          
          console.log("PRODUCTS DEBUG - İşlenmiş ürün verisi:", productsData);
          setUserProducts(productsData);
        } catch (innerError) {
          console.error("PRODUCTS ERROR - Ürün yükleme iç hatası:", innerError);
          setProductError(`Ürünler yüklenemedi: ${innerError.message}`);
        }
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata oluştu:', error);
      setProductError('Ürünleriniz yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoadingProducts(false);
    }
  };
  
  const fetchTradeOffers = async () => {
    try {
      setLoadingOffers(true);
      setOfferError('');
      
      if (user) {
        console.log("OFFERS DEBUG - Teklifleri yükleme başlıyor...");
        
        try {
          // Hata ayıklama için timeout ekle
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Teklif yükleme zaman aşımı')), 15000)
          );
          
          // İstek ile timeout yarışı
          const response = await Promise.race([
            tradeOfferService.getMyTradeOffers(),
            timeoutPromise
          ]);
          
          console.log("OFFERS DEBUG - API yanıtı:", response);
          
          // Yanıt formatını kontrol et
          let offersData = [];
          
          if (response && response.data) {
            if (Array.isArray(response.data)) {
              offersData = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              offersData = response.data.data;
            } else if (typeof response.data === 'object') {
              // Nesne olabilir, içeriğine bakalım
              console.log("OFFERS DEBUG - Veri nesnesi anahtarları:", Object.keys(response.data));
              // Dizi içeren bir anahtar var mı diye kontrol et
              for (const key of Object.keys(response.data)) {
                if (Array.isArray(response.data[key])) {
                  offersData = response.data[key];
                  console.log(`OFFERS DEBUG - Teklif dizisi '${key}' anahtarında bulundu`);
                  break;
                }
              }
            }
          }
          
          console.log("OFFERS DEBUG - İşlenmiş teklif verisi:", offersData);
          
          // ID düzeltmelerini yap
          offersData = offersData.map(offer => {
            const fixedOffer = { ...offer };
            // Ana teklif ID'si
            if (fixedOffer._id && !fixedOffer.id) fixedOffer.id = fixedOffer._id;
            
            // İstenen ürün ID'si
            if (fixedOffer.requestedProduct) {
              if (fixedOffer.requestedProduct._id && !fixedOffer.requestedProduct.id) {
                fixedOffer.requestedProduct.id = fixedOffer.requestedProduct._id;
              }
            }
            
            // Teklif edilen ürün ID'si
            if (fixedOffer.offeredProduct) {
              if (fixedOffer.offeredProduct._id && !fixedOffer.offeredProduct.id) {
                fixedOffer.offeredProduct.id = fixedOffer.offeredProduct._id;
              }
            }
            
            return fixedOffer;
          });
          
          setTradeOffers(offersData);
        } catch (innerError) {
          console.error("OFFERS ERROR - Teklif yükleme iç hatası:", innerError);
          setOfferError(`Teklifler yüklenemedi: ${innerError.message}`);
        }
      }
    } catch (error) {
      console.error('Takas teklifleri yüklenirken hata oluştu:', error);
      setOfferError('Takas teklifleriniz yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoadingOffers(false);
    }
  };
  
  // Format currency
  const formatPrice = (price) => {
    if (!price) return 'Sadece Takas';
    return `${Number(price).toLocaleString('tr-TR')} ₺`;
  };
  
  // Helper to get offer status in Turkish
  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Beklemede',
      'accepted': 'Kabul Edildi',
      'rejected': 'Reddedildi',
      'canceled': 'İptal Edildi',
      'completed': 'Tamamlandı'
    };
    
    return statusMap[status] || status;
  };
  
  // Helper to get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'danger';
      case 'canceled': return 'secondary';
      case 'completed': return 'info';
      default: return 'primary';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
    setSuccessMessage('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
    setPasswordSuccessMessage('');
  };

  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!formData.fullName) {
      newErrors.fullName = 'Ad Soyad gereklidir';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre gereklidir';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gereklidir';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    try {
      console.log("FORM SUBMIT DEBUG - Form verisi:", formData);
      
      // Username'i ayır (eğer varsa ve boşluk içeriyorsa)
      let cleanFullName = formData.fullName.trim();
      
      // Son kelime username olabilir - eğer kullanıcı birden fazla kelime girdiyse
      // ve tam isim ile username farklıysa ilk kısmını kullan
      if (user && user.username && cleanFullName.includes(user.username) && 
          cleanFullName.indexOf(user.username) > 0) {
        cleanFullName = cleanFullName.substring(0, cleanFullName.lastIndexOf(user.username)).trim();
        console.log(`FORM SUBMIT DEBUG - Username temizlendi: "${cleanFullName}"`);
      }
      
      // Backend'in beklediği formatta veri oluştur
      const backendData = {
        fullName: cleanFullName,
        phone: formData.phone || '',
        address: formData.address || ''
      };
      
      // Eğer şehir veya posta kodu varsa, adresi güncelle
      if (formData.city || formData.zipCode) {
        let fullAddress = formData.address || '';
        if (formData.city) fullAddress += (fullAddress ? ', ' : '') + formData.city;
        if (formData.zipCode) fullAddress += (fullAddress ? ' ' : '') + formData.zipCode;
        backendData.address = fullAddress.trim();
      }
      
      console.log("FORM SUBMIT DEBUG - Backend'e gönderilecek veri:", backendData);
      
      await updateProfile(backendData);
      
      setSuccessMessage('Profil başarıyla güncellendi.');
    } catch (err) {
      console.error("FORM SUBMIT DEBUG - Profil güncelleme hatası:", err);
      setApiError(err.response?.data?.message || 'Profil güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      // Bu işlevi backend'e eklemeniz gerekecek
      // await authService.changePassword(passwordData);
      setPasswordSuccessMessage('Şifre başarıyla güncellendi.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Şifre güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  // Debug fonksiyonu güncelleyelim
  useEffect(() => {
    // Window nesnesine debug fonksiyonunu ekle
    window.debugUserProfile = () => {
      console.log("DEBUG - Local Storage Token:", localStorage.getItem('token'));
      console.log("DEBUG - User Object:", user);
      
      if (user && user.fullName) {
        console.log("DEBUG - fullName:", user.fullName);
      }
      
      return {
        user,
        token: localStorage.getItem('token'),
        formData
      };
    };
    
    // Komponent temizlendiğinde kaldır
    return () => {
      delete window.debugUserProfile;
    };
  }, [user, formData]);

  if (!user) {
    return <Loader centered text="Kullanıcı bilgileri yükleniyor..." />;
  }

  return (
    <Container className="py-5">
      <Row>
        <Col lg={3} md={4} className="mb-4">
          <Card className="shadow">
            <Card.Body>
              <div className="text-center mb-3">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  {/* İlk harf */}
                  {user && user.fullName ? 
                    user.fullName.charAt(0).toUpperCase() : 
                    (user && user.firstName ? 
                      user.firstName.charAt(0).toUpperCase() : '?')}
                </div>
                <h5 className="mt-3">
                  {user.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '?')}
                </h5>
                <p className="text-muted">{user.email || ''}</p>
              </div>
              <Nav className="flex-column" variant="pills" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav.Item>
                  <Nav.Link eventKey="profile" className="mb-2">Profil Bilgileri</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="password" className="mb-2">Şifre Değiştir</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="listings" className="mb-2">İlanlarım</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="offers" className="mb-2">Tekliflerim</Nav.Link>
                </Nav.Item>
              </Nav>
              <Button 
                variant="outline-danger" 
                block 
                className="mt-4"
                onClick={logout}
              >
                Çıkış Yap
              </Button>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={9} md={8}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <Tab.Content>
                <Tab.Pane active={activeTab === 'profile'}>
                  <h3 className="mb-4">Profil Bilgileri</h3>
                  
                  {apiError && <Alert variant="danger" message={apiError} />}
                  {successMessage && <Alert variant="success" message={successMessage} />}
                  
                  {isLoading ? (
                    <Loader centered />
                  ) : (
                    <form onSubmit={handleProfileSubmit}>
                          <Input
                            type="text"
                        label="Ad Soyad"
                        name="fullName"
                        value={formData.fullName}
                            onChange={handleChange}
                        error={errors.fullName}
                            required
                          />
                      
                      <Input
                        type="email"
                        label="Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        required
                        disabled
                      />
                      
                      <Input
                        type="tel"
                        label="Telefon"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        required
                      />
                      
                      <Input
                        type="text"
                        label="Adres"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        error={errors.address}
                      />
                      
                      <Row>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Şehir"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            error={errors.city}
                          />
                        </Col>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Posta Kodu"
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={handleChange}
                            error={errors.zipCode}
                          />
                        </Col>
                      </Row>
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        className="mt-4"
                      >
                        Profili Güncelle
                      </Button>
                    </form>
                  )}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'password'}>
                  <h3 className="mb-4">Şifre Değiştir</h3>
                  
                  {apiError && <Alert variant="danger" message={apiError} />}
                  {passwordSuccessMessage && <Alert variant="success" message={passwordSuccessMessage} />}
                  
                  {isLoading ? (
                    <Loader centered />
                  ) : (
                    <form onSubmit={handlePasswordSubmit}>
                      <Input
                        type="password"
                        label="Mevcut Şifre"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.currentPassword}
                        required
                      />
                      
                      <Input
                        type="password"
                        label="Yeni Şifre"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.newPassword}
                        required
                      />
                      
                      <Input
                        type="password"
                        label="Yeni Şifre Tekrarı"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.confirmPassword}
                        required
                      />
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        className="mt-4"
                      >
                        Şifreyi Değiştir
                      </Button>
                    </form>
                  )}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'listings'}>
                  <h3 className="mb-4">İlanlarım</h3>
                  
                  {productError && <Alert variant="danger" message={productError} />}
                  
                  {loadingProducts ? (
                    <Loader centered />
                  ) : userProducts.length > 0 ? (
                    <Row>
                      {userProducts.map((product) => (
                        <Col md={6} key={product._id || product.id}>
                          <Card className="mb-3">
                            <Card.Body>
                              <div className="d-flex">
                                <div className="product-image mr-3" style={{ width: '90px', height: '90px', overflow: 'hidden' }}>
                                  {product.images && product.images.length > 0 ? (
                                    <img 
                                      src={typeof product.images[0] === 'string' 
                                        ? product.images[0] 
                                        : product.images[0].url || '/images/product-placeholder.jpg'
                                      } 
                                      alt={product.title}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '100%', height: '100%' }}>
                                      <i className="bi bi-image text-secondary"></i>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h5 className="mb-1">{product.title}</h5>
                                  <p className="mb-1 text-primary font-weight-bold">{formatPrice(product.price)}</p>
                                  <div className="d-flex">
                                    <Badge bg={product.status === 'active' ? 'success' : 'secondary'} className="me-2">
                                      {product.status === 'active' ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                    {product.acceptsTradeOffers && (
                                      <Badge bg="info">Takas Kabul Edilir</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card.Body>
                            <Card.Footer className="bg-white text-end">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => window.location.href = `/products/${product._id || product.id}`}
                              >
                                Görüntüle
                              </Button>
                            </Card.Footer>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <div className="text-center p-4 bg-light rounded">
                      <p className="mb-3">Henüz ilan oluşturmadınız.</p>
                      <Button 
                        variant="primary"
                        size="sm"
                        onClick={() => window.location.href = '/products/add'}
                      >
                        Yeni İlan Ekle
                      </Button>
                    </div>
                  )}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'offers'}>
                  <h3 className="mb-4">Tekliflerim</h3>
                  
                  {offerError && <Alert variant="danger" message={offerError} />}
                  
                  {loadingOffers ? (
                    <Loader centered />
                  ) : tradeOffers.length > 0 ? (
                    <div>
                      {tradeOffers.map((offer) => (
                        <Card className="mb-3" key={offer._id || offer.id}>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <h5 className="mb-0">
                                {offer.isSender ? 'Gönderilen Teklif' : 'Alınan Teklif'}
                              </h5>
                              <Badge bg={getStatusVariant(offer.status)}>
                                {getStatusText(offer.status)}
                              </Badge>
                            </div>
                            
                            <div className="row">
                              <div className="col-md-5">
                                <p className="text-muted mb-1">İstenen Ürün</p>
                                <div className="d-flex">
                                  <div className="product-image me-2" style={{ width: '60px', height: '60px', overflow: 'hidden' }}>
                                    {offer.requestedProduct?.images && offer.requestedProduct.images.length > 0 ? (
                                      <img 
                                        src={typeof offer.requestedProduct.images[0] === 'string' 
                                          ? offer.requestedProduct.images[0] 
                                          : offer.requestedProduct.images[0].url || '/images/product-placeholder.jpg'
                                        } 
                                        alt={offer.requestedProduct.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '100%', height: '100%' }}>
                                        <i className="bi bi-image text-secondary"></i>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="mb-1 font-weight-bold">{offer.requestedProduct?.title || 'Ürün Bilgisi Yok'}</p>
                                    <small className="text-muted">{formatPrice(offer.requestedProduct?.price)}</small>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="col-md-2 text-center d-flex align-items-center justify-content-center">
                                <i className="bi bi-arrow-left-right text-primary" style={{ fontSize: '1.5rem' }}></i>
                              </div>
                              
                              <div className="col-md-5">
                                <p className="text-muted mb-1">Teklif Edilen Ürün</p>
                                <div className="d-flex">
                                  <div className="product-image me-2" style={{ width: '60px', height: '60px', overflow: 'hidden' }}>
                                    {offer.offeredProduct?.images && offer.offeredProduct.images.length > 0 ? (
                                      <img 
                                        src={typeof offer.offeredProduct.images[0] === 'string' 
                                          ? offer.offeredProduct.images[0] 
                                          : offer.offeredProduct.images[0].url || '/images/product-placeholder.jpg'
                                        } 
                                        alt={offer.offeredProduct.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: '100%', height: '100%' }}>
                                        <i className="bi bi-image text-secondary"></i>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="mb-1 font-weight-bold">{offer.offeredProduct?.title || 'Ürün Bilgisi Yok'}</p>
                                    <small className="text-muted">{formatPrice(offer.offeredProduct?.price)}</small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card.Body>
                          <Card.Footer className="bg-white text-end">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => window.location.href = `/trade-offers/${offer._id || offer.id}`}
                            >
                              Detayları Görüntüle
                            </Button>
                          </Card.Footer>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-light rounded">
                      <p>Henüz takas teklifi bulunmuyor.</p>
                    </div>
                  )}
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 