import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://10.196.150.126:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the auth token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // İstek detaylarını logla
    console.log(`API Request [${config.method.toUpperCase()}] ${config.url}`, {
      url: config.url,
      method: config.method,
      headers: config.headers,
      params: config.params,
      data: config.data,
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    // Response verilerini kontrol et ve logla
    const method = response.config.method.toUpperCase();
    const url = response.config.url;
    const status = response.status;
    
    console.log(`API Response [${status}] [${method}] ${url}`, {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method,
      data: response.data,
      hasImages: response.data && response.data.data && response.data.data.images ? 
        `${response.data.data.images.length} images` : 'no images',
    });
    
    return response;
  },
  (error) => {
    // Hata detaylarını logla
    console.error('API Error Response:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      errorDetails: error.response?.data?.error || error.response?.data?.message
    });
    
    return Promise.reject(error);
  }
);

// Endpoints
export const authService = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  verifyEmail: (code, email) => api.post('/users/verify-email', { code, email }),
  profile: () => {
    console.log('Fetching user profile');
    return api.get('/users/profile')
      .then(response => {
        console.log('User profile response:', JSON.stringify(response.data));
        return response;
      })
      .catch(error => {
        console.error('Error fetching profile:', error);
        throw error;
      });
  },
  updateProfile: (userData) => {
    console.log('Updating user profile with data:', userData);
    return api.patch('/users/profile', userData)
      .then(response => {
        console.log('Profile update response:', JSON.stringify(response.data));
        return response;
      })
      .catch(error => {
        console.error('Error updating profile:', error);
        throw error;
      });
  },
  changePassword: (passwordData) => {
    console.log('Changing user password');
    return api.post('/users/change-password', passwordData)
      .then(response => {
        console.log('Change password response:', JSON.stringify(response.data));
        return response;
      })
      .catch(error => {
        console.error('Error changing password:', error);
        throw error;
      });
  },
};

export const productService = {
  getAllProducts: (params) => {
    console.log("getAllProducts params:", params);
    
    // Clone params to avoid modifying the original
    const queryParams = { ...params };
    
    // Test modu için noFilter parametresi kontrolü
    if (queryParams && queryParams.noFilter === true) {
      console.log("⚠️ Test modu: Tüm filtreleri kaldır özelliği aktif");
      queryParams.noFilter = 'true';
    }
    
    // Birden fazla kategori ID'si ile filtreleme
    if (queryParams && queryParams.categoryIds) {
      console.log("📋 Birden fazla kategori ID'si filtrelemesi:", queryParams.categoryIds);
      
      // ID'leri parçalara ayır
      const categoryIds = queryParams.categoryIds.split(',').filter(id => id && id.trim());
      
      if (categoryIds.length > 0) {
        // Geçerli ID'leri filtrele
        const validIds = categoryIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id.trim()));
        
        if (validIds.length > 0) {
          // ID'leri backend'e uygun formatta gönder
          queryParams.categoryIds = validIds.join(',');
          console.log(`✅ ${validIds.length} geçerli kategori ID'si ile filtreleniyor`);
          
          // Eğer aynı zamanda category parametresi varsa kaldır
          if (queryParams.category) {
            delete queryParams.category;
          }
        } else {
          console.error("❌ Geçerli kategori ID'si bulunamadı");
          delete queryParams.categoryIds;
        }
      } else {
        delete queryParams.categoryIds;
      }
    }
    // Ana kategori ile filtreleme
    else if (queryParams && queryParams.parentCategory) {
      console.log("📁 Ana kategori filtresi:", queryParams.parentCategory);
      
      // ID formatını kontrol et
      if (queryParams.parentCategory && /^[0-9a-fA-F]{24}$/.test(queryParams.parentCategory)) {
        console.log("✅ Geçerli MongoDB ana kategori ID'si:", queryParams.parentCategory);
        
        // Backend'e ana kategori ID'sini gönder
        // Backend bu ID'nin alt kategorilerini de dahil edecek şekilde ayarlanacak
      } else {
        console.error("❌ Geçersiz ana kategori ID formatı:", queryParams.parentCategory);
        delete queryParams.parentCategory;
      }
    } 
    // Standart kategori filtresi (tek kategori ile filtreleme)
    else if (queryParams && queryParams.category) {
      console.log("📄 Tek kategori filtresi:", queryParams.category);
      
      // ID formatını kontrol et
      if (queryParams.category && /^[0-9a-fA-F]{24}$/.test(queryParams.category)) {
        console.log("✅ Geçerli MongoDB kategori ID'si:", queryParams.category);
      } else {
        console.error("❌ Geçersiz kategori ID formatı:", queryParams.category);
        delete queryParams.category;
      }
    }
    
    // Condition (durum) filtrelemesi için format düzeltmesi
    if (queryParams && queryParams.condition) {
      console.log("Durum filtresi:", queryParams.condition);
      
      // Boş değeri kontrol et
      if (queryParams.condition.trim() === '') {
        console.log("Boş durum filtresi kaldırılıyor");
        delete queryParams.condition;
      } else {
        // Değerleri normalize et - Türkçe karşılıklara dönüştür
        const conditionMap = {
          'new': 'Sıfır',
          'like-new': 'Yeni Gibi',
          'good': 'İyi',
          'fair': 'Orta',
          'poor': 'Kötü',
          'sıfır': 'Sıfır',
          'yeni gibi': 'Yeni Gibi',
          'iyi': 'İyi',
          'orta': 'Orta',
          'kötü': 'Kötü'
        };
        
        const normalizedCondition = conditionMap[queryParams.condition.toLowerCase()];
        if (normalizedCondition) {
          queryParams.condition = normalizedCondition;
          console.log("Durum filtresi Türkçeye dönüştürüldü:", queryParams.condition);
        }
      }
    }
    
    // Limit ve sayfalama parametrelerini ayarla
    if (!queryParams.count) {
      queryParams.limit = queryParams.limit || 100; // Varsayılan olarak 100 ürün
    }
    
    console.log("📤 API isteği gönderiliyor:", queryParams);
    return api.get('/products', { params: queryParams })
      .then(response => {
        // Response debugging
        console.log("API yanıtı:", {
          status: response.status,
          hasData: !!response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          count: Array.isArray(response.data) ? response.data.length : 
                (response.data && Array.isArray(response.data.data)) ? 
                  response.data.data.length : 'unknown',
        });
        
        // Yanıt içinde kullanılabilir veri olduğundan emin ol
        if (response.data && response.data.success === false) {
          console.error("API başarısız yanıt döndü:", response.data);
          // Yanıt hatalı olsa da devam et
        }
        
        return response;
      })
      .catch(error => {
        console.error("Ürün listesi alınırken hata:", error);
        
        // Hata durumunda boş sonuç döndür
        return {
          data: [],
          status: error.response?.status || 500,
          statusText: error.message || 'Unknown error'
        };
      });
  },
  
  // Tüm ürünleri getiren fonksiyon (debug için)
  getAllProductsNoFilter: () => {
    console.log("UYARI: Filtresiz tüm ürünler getiriliyor (DEBUG)");
    return api.get('/products', { 
      params: { 
        limit: 1000, // Çok büyük limit
        sort: '-createdAt' // En yeni ürünler önce
      } 
    });
  },
  getUserProducts: (userId, params) => api.get(`/products/user/${userId}`, { params }),
  getProductById: (id) => {
    console.log("Fetching product details for ID:", id);
    return api.get(`/products/${id}`)
      .then(response => {
        // Ürün verisini kontrol et
        console.log("Product API raw response:", response);
        
        // Ürün verilerini daha detaylı kontrol et - özellikle owner bilgisi
        let productData = null;
        if (response.data && response.data.data) {
          productData = response.data.data;
        } else if (response.data) {
          productData = response.data;
        }
        
        if (productData && productData.owner) {
          console.log("OWNER DATA ANALYSIS:", {
            ownerObject: productData.owner,
            ownerId: productData.owner._id || productData.owner.id,
            ownerIdType: typeof (productData.owner._id || productData.owner.id),
            ownerStringRepresentation: String(productData.owner._id || productData.owner.id),
            ownerKeys: Object.keys(productData.owner)
          });
        }
        
        // Ürün resimlerini kontrol et
        if (response.data && response.data.data) {
          const product = response.data.data;
          console.log("Product has images:", product.images && product.images.length > 0);
          
          if (product.images && product.images.length > 0) {
            console.log("First image details:", product.images[0]);
          }
        }
        
        return response;
      })
      .catch(error => {
        console.error("Error fetching product with ID:", id, error);
        throw error;
      });
  },
  createProduct: (productData) => {
    // FormData objesi olduğunda multipart/form-data formatını belirt
    if (productData instanceof FormData) {
      console.log("Creating product with FormData");
      return api.post('/products', productData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    
    // Normal JSON objesi
    console.log("Creating product with JSON");
    return api.post('/products', productData);
  },
  updateProduct: (id, productData) => {
    // FormData gönderiyorsak, multipart/form-data olarak belirt
    if (productData instanceof FormData) {
      console.log("Updating product with FormData:", id);
      return api.put(`/products/${id}`, productData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
    
    // JSON nesnesi ise normal şekilde gönder
    console.log("Updating product with JSON:", id);
    return api.put(`/products/${id}`, productData);
  },
  deleteProduct: (id) => {
    console.log("Attempting to delete product with ID:", id);
    return api.delete(`/products/${id}`)
      .then(response => {
        console.log("Product deletion successful:", response.data);
        return response;
      })
      .catch(error => {
        console.error("Product deletion failed:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          productId: id
        });
        throw error;
      });
  },
  updateProductVisibility: (id, isVisible) => {
    console.log(`Updating product visibility to ${isVisible ? 'visible' : 'hidden'}:`, id);
    // status active = görünür, status inactive = gizli
    return api.put(`/products/${id}`, { status: isVisible ? 'active' : 'inactive' });
  },
};

export const tradeOfferService = {
  createTradeOffer: (offerData) => {
    console.log("Sending trade offer data:", offerData);
    return api.post('/trade-offers', offerData)
      .then(response => {
        console.log("Trade offer creation successful:", response.data);
        return response;
      })
      .catch(error => {
        console.error("Trade offer creation failed:", {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          offerData
        });
        throw error;
      });
  },
  getMyTradeOffers: () => api.get('/trade-offers/my-offers')
    .then(response => {
      console.log("Trade offers raw API response:", response);
      
      // API yanıtı detaylı inceleme
      let offers = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        offers = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        offers = response.data;
      } else if (Array.isArray(response)) {
        offers = response;
      }
      
      console.log("Processed trade offers:", offers);
      
      // Sunucudan gelen id/(_id) tutarsızlıklarını düzelt
      if (Array.isArray(offers)) {
        offers.forEach(offer => {
          // Ana offer için ID düzeltme
          if (offer._id && !offer.id) {
            offer.id = offer._id;
          }
          
          // requestedProduct için ID düzeltme
          if (offer.requestedProduct && offer.requestedProduct._id && !offer.requestedProduct.id) {
            offer.requestedProduct.id = offer.requestedProduct._id;
          }
          
          // offeredProduct için ID düzeltme
          if (offer.offeredProduct && offer.offeredProduct._id && !offer.offeredProduct.id) {
            offer.offeredProduct.id = offer.offeredProduct._id;
          }
        });
      }
      
      return response;
    }),
  getTradeOfferById: (id) => api.get(`/trade-offers/${id}`),
  respondToTradeOffer: (id, response) => {
    console.log('Responding to trade offer:', id, response);
    // Check the response value and call the appropriate endpoint
    if (response.response === 'accept') {
      return api.put(`/trade-offers/${id}/accept`, { responseMessage: response.message || '' });
    } else if (response.response === 'reject') {
      return api.put(`/trade-offers/${id}/reject`, { responseMessage: response.message || '' });
    } else {
      console.error('Invalid response type:', response.response);
      return Promise.reject(new Error('Invalid response type. Must be "accept" or "reject".'));
    }
  },
};

export const messageService = {
  getConversations: () => api.get('/messages/conversations'),
  getArchivedConversations: () => api.get('/messages/conversations/archived'),
  getMessages: (conversationId, params) => api.get(`/messages/conversations/${conversationId}/messages`, { params }),
  createConversation: (participantId, productId, tradeOfferId) => 
    api.post('/messages/conversations', { participantId, productId, tradeOfferId }),
  sendMessage: (conversationId, text, attachments) => {
    console.log("Sending message with exact conversationId:", conversationId);
    // Tam URL'yi console'a yazdır
    const url = `/messages/conversations/${conversationId}`;
    console.log("Full API URL:", API_URL + url);
    
    return api.post(url, { 
      conversationId, // Nesne içinde de conversationId gönder
      text,
      ...(attachments && { attachments })
    })
    .then(response => {
      console.log("Message sent successfully:", response.data);
      return response;
    })
    .catch(error => {
      console.error("Send message failed with URL:", url);
      console.error("Send message failed:", {
        conversationId,
        text,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method
      });
      throw error;
    });
  },
  markAsRead: (conversationId) => api.put(`/messages/conversations/${conversationId}/read`),
  archiveConversation: (conversationId) => api.put(`/messages/conversations/${conversationId}/archive`),
  unarchiveConversation: (conversationId) => api.put(`/messages/conversations/${conversationId}/unarchive`),
  getUnreadCount: () => api.get('/messages/unread/count')
    .then(response => {
      console.log('Unread count API response:', {
        fullResponse: response,
        data: response.data,
        count: response.data?.count
      });
      return response;
    })
    .catch(error => {
      console.error('Failed to get unread count:', error);
      throw error;
    }),
};

// Fiyat tahmini servisi (api.js içine ekleyin)
export const pricePredictionService = {
  getPricePrediction: (productData) => {
    console.log("Fiyat tahmini isteniyor:", productData);
    return api.post('/price-prediction', productData);
  },
  
  // Kategori bazlı gerekli özellikleri getiren fonksiyon
  getCategoryAttributes: (categoryId) => {
    console.log("Kategori için gerekli özellikler isteniyor:", categoryId);
    return api.get(`/price-prediction/attributes/${categoryId}`);
  }
};

// Kategori ID haritalaması - Sabit ID'leri MongoDB ID'lerine dönüştürmek için
const CATEGORY_ID_MAPPING = {
  // Ana kategoriler
  '1': null, // Elektronik
  '2': null, // Ev Eşyaları
  '3': null, // Giyim
  '4': null, // Kitap & Hobi
  '5': null, // Spor
  '6': null, // Oyun & Konsol
  
  // Alt kategoriler
  '101': null, // Bilgisayarlar
  '102': null, // Telefonlar
  '103': null, // Televizyonlar
  '104': null, // Ses Sistemleri
  '201': null, // Mobilya
  '202': null, // Mutfak Eşyaları
  '203': null, // Yatak ve Banyo
  '204': null, // Dekorasyon
  '301': null, // Kadın Giyim
  '302': null, // Erkek Giyim
  '303': null, // Çocuk Giyim
  '304': null, // Ayakkabı ve Çanta
  '401': null, // Kitaplar
  '402': null, // Müzik & Film
  '403': null, // Koleksiyon
  '404': null, // El İşi
  '501': null, // Spor Malzemeleri
  '502': null, // Outdoor
  '503': null, // Fitness
  '504': null, // Bisiklet & Scooter
  '601': null, // Konsollar
  '602': null, // Oyunlar
  '603': null  // Aksesuarlar
};

// Sabit kategori ID'sini MongoDB ID'sine dönüştüren yardımcı fonksiyon
const getMongoCategoryId = (categoryId) => {
  // Eğer zaten bir MongoDB ID gibi görünüyorsa, aynen döndür
  if (categoryId && categoryId.length === 24 && /^[0-9a-f]+$/i.test(categoryId)) {
    return categoryId;
  }
  
  // Sabit ID ise, haritalama değeri varsa döndür
  return CATEGORY_ID_MAPPING[categoryId] || categoryId;
};

// Kategorilerin MongoDB ID'lerini güncelleyen fonksiyon
const updateCategoryIdMappings = (categories) => {
  if (!categories || !Array.isArray(categories)) return;
  
  // Ana kategorileri güncelle
  categories.forEach(cat => {
    if (!cat || !cat.name) return;
    
    // Ana kategori eşleştirme
    if (cat.name === 'Elektronik') CATEGORY_ID_MAPPING['1'] = cat._id;
    else if (cat.name === 'Ev Eşyaları') CATEGORY_ID_MAPPING['2'] = cat._id;
    else if (cat.name === 'Giyim') CATEGORY_ID_MAPPING['3'] = cat._id;
    else if (cat.name === 'Kitap & Hobi') CATEGORY_ID_MAPPING['4'] = cat._id;
    else if (cat.name === 'Spor') CATEGORY_ID_MAPPING['5'] = cat._id;
    else if (cat.name === 'Oyun & Konsol') CATEGORY_ID_MAPPING['6'] = cat._id;
    
    // Alt kategori eşleştirme - eğer varsa
    if (cat.subcategories || cat.children) {
      const subcats = cat.subcategories || cat.children || [];
      subcats.forEach(subcat => {
        if (!subcat || !subcat.name) return;
        
        // Elektronik altındaki alt kategoriler
        if (cat.name === 'Elektronik') {
          if (subcat.name === 'Bilgisayarlar') CATEGORY_ID_MAPPING['101'] = subcat._id;
          else if (subcat.name === 'Telefonlar') CATEGORY_ID_MAPPING['102'] = subcat._id;
          else if (subcat.name === 'Televizyonlar') CATEGORY_ID_MAPPING['103'] = subcat._id;
          else if (subcat.name === 'Ses Sistemleri') CATEGORY_ID_MAPPING['104'] = subcat._id;
        }
        // Diğer ana kategoriler için benzer kontroller...
        // Bu kısmı kısa tutuyorum, gerekirse tüm alt kategoriler için yapılabilir
      });
    }
  });
  
  console.log('Kategori ID Eşleştirmeleri güncellendi:', CATEGORY_ID_MAPPING);
};

export const categoryService = {
  getAllCategories: async (retryCount = 0) => {
    try {
      console.log('Categories API çağrılıyor...');
      const response = await api.get('/categories', { timeout: 10000 }); // 10 saniye timeout
      
      // Yanıt yapısını detaylı incele
      console.log('Categories API yanıt yapısı:', {
        fullResponse: response,
        hasData: !!response.data,
        hasDataData: !!(response.data && response.data.data),
        hasSuccess: !!(response.data && response.data.success),
        dataType: response.data ? typeof response.data : 'yok',
        dataDataType: response.data && response.data.data ? typeof response.data.data : 'yok',
        isDataArray: response.data && Array.isArray(response.data),
        isDataDataArray: response.data && response.data.data && Array.isArray(response.data.data)
      });
      
      // Kategori ID eşleştirmelerini güncelle
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        updateCategoryIdMappings(response.data.data);
      } else if (response.data && Array.isArray(response.data)) {
        updateCategoryIdMappings(response.data);
      }
      
      // Örnek kategori
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('İlk kategori örneği:', response.data.data[0]);
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('İlk kategori örneği:', response.data[0]);
      }
      
      // Tüm kategorilerin ID'lerini logla
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log('Tüm kategori ID\'leri (data.data):', 
          response.data.data.map(cat => ({ 
            name: cat.name,
            id: cat.id,
            _id: cat._id,
            slug: cat.slug
          }))
        );
      } else if (response.data && Array.isArray(response.data)) {
        console.log('Tüm kategori ID\'leri (data):', 
          response.data.map(cat => ({ 
            name: cat.name,
            id: cat.id,
            _id: cat._id,
            slug: cat.slug
          }))
        );
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      
      // Hata durumunda otomatik yeniden deneme (en fazla 2 kez)
      if (retryCount < 2) {
        console.log(`Kategoriler yüklenirken hata oluştu, ${retryCount + 1}. deneme yapılıyor...`);
        // Kısa bir bekleme süresi ekleyelim
        await new Promise(resolve => setTimeout(resolve, 1000));
        return categoryService.getAllCategories(retryCount + 1);
      }
      
      throw error;
    }
  },
  getCategoryById: async (id) => {
    try {
      // Sabit ID'yi MongoDB ID'sine çevir
      const mongoId = getMongoCategoryId(id);
      
      console.log(`Fetching category with ID: ${id} (MongoDB ID: ${mongoId})`);
      const response = await api.get(`/categories/${mongoId}`);
      console.log(`Category ${id} response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  },
  getMainCategoriesWithSubcategories: async () => {
    try {
      console.log('Fetching main categories with subcategories');
      // İlk yöntem - kategori ağacı formatında
      const response = await api.get('/categories?format=tree');
      console.log('Categories tree response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching category tree:', error);
      throw error;
    }
  },
  getSubcategories: async (categoryId) => {
    try {
      console.log(`Fetching subcategories for category ID: ${categoryId}`);
      const response = await api.get(`/categories/${categoryId}/subcategories`);
      console.log(`Subcategories for ${categoryId} response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching subcategories for ${categoryId}:`, error);
      throw error;
    }
  }
};

export default api;