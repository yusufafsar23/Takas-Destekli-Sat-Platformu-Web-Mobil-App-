import api from './api';

// Ürünleri getirme
const getProducts = async (filters) => {
  try {
    console.log('Requesting products with filters:', filters);
    
    // Tam kategori eşleşmesi isteniyor mu?
    const exactCategoryMatch = filters?.exactCategory;
    
    // Kategori ID'si kontrolü
    if (filters && filters.category) {
      const categoryId = filters.category;
      
      // MongoDB ObjectId formatına uygun mu kontrol et - 24 karakter hexadecimal
      if (typeof categoryId === 'string' && !/^[0-9a-fA-F]{24}$/.test(categoryId)) {
        console.log('Kategori ID MongoDB formatında değil, filtreleme şekli değiştiriliyor');
        // Kategoriye göre değil, arama terimlerine göre filtreleme yap
        if (!filters.search && filters.title) {
          filters.search = filters.title;
        }
        
        // Tam eşleşme isteniyorsa kategori adını filtre olarak ekle
        if (exactCategoryMatch && filters.categoryName) {
          filters.exactCategoryName = filters.categoryName;
        }
        
        delete filters.category;
      }
    } else if (exactCategoryMatch && filters?.categoryName) {
      // ID yok ama kategori adı varsa ve tam eşleşme isteniyorsa
      filters.exactCategoryName = filters.categoryName;
    }
    
    // Gereksiz parametreleri temizle
    if (filters) {
      delete filters.exactCategory;
      delete filters.categoryName;
    }
    
    const response = await api.get('/products', { params: filters });
    
    // Standardize response format
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      // Standard backend format {success, count, data}
      console.log(`Retrieved ${response.data.data.length} products`);
      
      // Tam kategori eşleşmesi isteniyorsa yanıt verilerini filtrele
      if (exactCategoryMatch && filters?.exactCategoryName) {
        const categoryName = filters.exactCategoryName.toLowerCase();
        console.log('Tam kategori eşleşmesi aranıyor:', categoryName);
        
        const filteredData = response.data.data.filter(product => {
          // Kategori adını kontrol et
          let productCategory = '';
          let matched = false;
          
          if (product.category) {
            if (typeof product.category === 'object') {
              productCategory = (product.category.name || '').toLowerCase();
              console.log(`Ürün kategorisi (object): ${productCategory}, aranan: ${categoryName}`);
              matched = productCategory.includes(categoryName);
            } else if (typeof product.category === 'string') {
              productCategory = product.category.toLowerCase();
              console.log(`Ürün kategorisi (string): ${productCategory}, aranan: ${categoryName}`);
              matched = productCategory.includes(categoryName);
            }
          }
          
          // categoryName özelligi varsa direkt onu da kontrol et
          if (product.categoryName) {
            const prodCatName = product.categoryName.toLowerCase();
            console.log(`Ürün categoryName: ${prodCatName}, aranan: ${categoryName}`);
            matched = matched || prodCatName.includes(categoryName);
          }
          
          // Kategori olmayan durum için ürün başlığını kontrol et
          if (!matched && product.title) {
            // Özel durumlar için başlıkta kategori adı geçiyor mu kontrol et
            if (categoryName === 'elektronik' && 
                product.title.toLowerCase().match(/telefon|tablet|bilgisayar|laptop|tv|televizyon|elektronik|kulaklık|şarj|kamera/)) {
              matched = true;
            } else if (categoryName === 'spor' && 
                       product.title.toLowerCase().match(/spor|fitness|koşu|futbol|basketbol|forma/)) {
              matched = true;
            }
          }
          
          return matched;
        });
        
        console.log(`Filtered to ${filteredData.length} products after exact category match`);
        return {
          ...response.data,
          data: filteredData
        };
      }
      
      return response.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Handle direct array response
      console.log(`Retrieved ${response.data.length} products (array format)`);
      
      // Tam kategori eşleşmesi isteniyorsa yanıt verilerini filtrele
      if (exactCategoryMatch && filters?.exactCategoryName) {
        const categoryName = filters.exactCategoryName.toLowerCase();
        console.log('Tam kategori eşleşmesi aranıyor (Array format):', categoryName);
        
        const filteredData = response.data.filter(product => {
          // Kategori adını kontrol et
          let productCategory = '';
          let matched = false;
          
          if (product.category) {
            if (typeof product.category === 'object') {
              productCategory = (product.category.name || '').toLowerCase();
              matched = productCategory.includes(categoryName);
            } else if (typeof product.category === 'string') {
              productCategory = product.category.toLowerCase();
              matched = productCategory.includes(categoryName);
            }
          }
          
          // categoryName özelligi varsa direkt onu da kontrol et
          if (product.categoryName) {
            const prodCatName = product.categoryName.toLowerCase();
            matched = matched || prodCatName.includes(categoryName);
          }
          
          // Kategori olmayan durum için ürün başlığını kontrol et
          if (!matched && product.title) {
            // Özel durumlar için başlıkta kategori adı geçiyor mu kontrol et
            if (categoryName === 'elektronik' && 
                product.title.toLowerCase().match(/telefon|tablet|bilgisayar|laptop|tv|televizyon|elektronik|kulaklık|şarj|kamera/)) {
              matched = true;
            } else if (categoryName === 'spor' && 
                       product.title.toLowerCase().match(/spor|fitness|koşu|futbol|basketbol|forma/)) {
              matched = true;
            }
          }
          
          return matched;
        });
        
        console.log(`Filtered to ${filteredData.length} products after exact category match`);
        return {
          success: true,
          count: filteredData.length,
          data: filteredData
        };
      }
      
      return {
        success: true,
        count: response.data.length,
        data: response.data
      };
    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
      // Handle {items: []} format
      console.log(`Retrieved ${response.data.items.length} products (items format)`);
      
      // Tam kategori eşleşmesi isteniyorsa yanıt verilerini filtrele
      if (exactCategoryMatch && filters?.exactCategoryName) {
        const categoryName = filters.exactCategoryName.toLowerCase();
        console.log('Tam kategori eşleşmesi aranıyor (Items format):', categoryName);
        
        const filteredItems = response.data.items.filter(product => {
          // Kategori adını kontrol et
          let productCategory = '';
          let matched = false;
          
          if (product.category) {
            if (typeof product.category === 'object') {
              productCategory = (product.category.name || '').toLowerCase();
              matched = productCategory.includes(categoryName);
            } else if (typeof product.category === 'string') {
              productCategory = product.category.toLowerCase();
              matched = productCategory.includes(categoryName);
            }
          }
          
          // categoryName özelligi varsa direkt onu da kontrol et
          if (product.categoryName) {
            const prodCatName = product.categoryName.toLowerCase();
            matched = matched || prodCatName.includes(categoryName);
          }
          
          // Kategori olmayan durum için ürün başlığını kontrol et
          if (!matched && product.title) {
            // Özel durumlar için başlıkta kategori adı geçiyor mu kontrol et
            if (categoryName === 'elektronik' && 
                product.title.toLowerCase().match(/telefon|tablet|bilgisayar|laptop|tv|televizyon|elektronik|kulaklık|şarj|kamera/)) {
              matched = true;
            } else if (categoryName === 'spor' && 
                       product.title.toLowerCase().match(/spor|fitness|koşu|futbol|basketbol|forma/)) {
              matched = true;
            }
          }
          
          return matched;
        });
        
        console.log(`Filtered to ${filteredItems.length} products after exact category match`);
        return {
          success: true,
          count: filteredItems.length,
          data: filteredItems
        };
      }
      
      return {
        success: true,
        count: response.data.items.length,
        data: response.data.items
      };
    }
    
    // Default empty response
    console.log('Unexpected product response format, returning empty array');
    return {
      success: true,
      count: 0,
      data: []
    };
  } catch (error) {
    console.error('Error fetching products:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Eğer kategori ile ilgili bir hata varsa, kategori olmadan tekrar deneyelim
    if (error.response?.status === 500 && filters && filters.category) {
      console.log('Kategori filtresiyle 500 hatası alındı, kategori olmadan tekrar deneniyor');
      // Kategori filtresini kaldırıp tekrar dene
      const newFilters = { ...filters };
      delete newFilters.category;
      
      try {
        console.log('Yeniden istek yapılıyor (kategori olmadan):', newFilters);
        const response = await api.get('/products', { params: newFilters });
        
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          return response.data;
        } else if (response.data && Array.isArray(response.data)) {
          return {
            success: true,
            count: response.data.length,
            data: response.data
          };
        }
        
        return {
          success: true,
          count: 0,
          data: []
        };
      } catch (retryError) {
        console.error('Tekrar denemede de hata oluştu:', retryError.message);
      }
    }
    
    throw error;
  }
};

// Öne çıkan ürünleri getirme
const getFeaturedProducts = async () => {
  try {
    console.log('Requesting featured products');
    const response = await api.get('/products/featured');
    
    // Standardize response format
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      // Standard backend format {success, count, data}
      console.log(`Retrieved ${response.data.data.length} featured products`);
      return response.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Handle direct array response
      console.log(`Retrieved ${response.data.length} featured products (array format)`);
      return {
        success: true,
        count: response.data.length,
        data: response.data
      };
    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
      // Handle {items: []} format
      console.log(`Retrieved ${response.data.items.length} featured products (items format)`);
      return {
        success: true,
        count: response.data.items.length,
        data: response.data.items
      };
    }
    
    // Default empty response
    console.log('Unexpected featured products response format, returning empty array');
    return {
      success: true,
      count: 0,
      data: []
    };
  } catch (error) {
    console.error('Error fetching featured products:', error);
    // Eğer öne çıkan ürün bulunamazsa, normal ürünleri getir
    if (error.response && error.response.status === 404) {
      console.log('No featured products found, fetching regular products instead');
      try {
        const regularProductsResponse = await getProducts({ limit: 6, sort: 'createdAt' });
        return regularProductsResponse;
      } catch (fallbackError) {
        console.error('Error in fallback to regular products:', fallbackError);
        return {
          success: false,
          count: 0,
          data: []
        };
      }
    }
    throw error;
  }
};

// Kullanıcının ürünlerini getirme
const getUserProducts = async (userId) => {
  try {
    console.log(`Requesting products for user: ${userId}`);
    const response = await api.get(`/products/user/${userId}`);
    console.log(`Retrieved ${response.data?.data?.length || 0} products for user`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user products:', error);
    throw error;
  }
};

// Giriş yapmış kullanıcının ürünlerini getirme
const getCurrentUserProducts = async () => {
  try {
    console.log('Requesting products for current user');
    
    // Try different endpoints if the server implementation varies
    try {
      const response = await api.get('/products/myproducts');
      console.log('myproducts endpoint response:', response.status, 
        'data structure:', Object.keys(response.data || {}).join(', '));
      
      // Return in standardized format
      if (response.data?.products && Array.isArray(response.data.products)) {
        return {
          success: true,
          products: response.data.products
        };
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        return {
          success: true,
          products: response.data.data
        };
      } else if (Array.isArray(response.data)) {
        return {
          success: true,
          products: response.data
        };
      }
      
      return response.data;
    } catch (firstError) {
      console.log('First endpoint failed, trying alternative:', firstError.message);
      
      // Try alternative endpoint
      try {
        const response = await api.get('/products/user');
        console.log('Alternative endpoint response:', response.status);
        
        // Return in standardized format
        if (response.data?.products && Array.isArray(response.data.products)) {
          return {
            success: true,
            products: response.data.products
          };
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          return {
            success: true,
            products: response.data.data
          };
        } else if (Array.isArray(response.data)) {
          return {
            success: true,
            products: response.data
          };
        }
        
        return response.data;
      } catch (secondError) {
        console.error('Both endpoints failed:', secondError.message);
        throw firstError; // Throw the original error
      }
    }
  } catch (error) {
    console.error('Error fetching current user products:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Ürün detayını getirme
const getProduct = async (id) => {
  try {
    console.log(`Requesting product details for ID: ${id}`);
    
    // ID geçerlilik kontrolü
    if (!id) {
      console.error('Geçersiz ürün ID\'si: değer boş veya undefined');
      // Varsayılan veri döndür
      return {
        _id: 'unknown',
        id: 'unknown',
        title: "Ürün bilgisi bulunamadı (geçersiz ID)",
        price: "-",
        description: "Bu ürün bilgisi bulunamıyor çünkü geçersiz bir ID belirtilmiş.",
        image: null,
        imageUrl: null,
        __isErrorPlaceholder: true
      };
    }
    
    // MongoDB ObjectId formatına benzemiyor ise uyarı log'u
    if (typeof id === 'string' && !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.warn(`Ürün ID'si (${id}) MongoDB ObjectId formatına benzemiyor, backend'in nasıl işleyeceği belirsiz`);
    }
    
    try {
      const response = await api.get(`/products/${id}`);
      
      // API yanıtını detaylı loglama
      console.log('API yanıt detayları:', {
        status: response.status,
        dataType: typeof response.data,
        isSuccess: response.data?.success,
        hasData: !!response.data?.data,
        hasOwner: !!(response.data?.data?.owner || response.data?.owner)
      });
      
      // Ürün verisini çıkar
      let productData = null;
      if (response.data?.data) {
        productData = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        productData = response.data;
      }
      
      // Ürün verisini işle ve owner bilgisini iyileştir
      if (productData) {
        console.log('OWNER DETECTION - Ürün veri kontrolü:', {
          hasOwner: !!productData.owner,
          hasSeller: !!productData.seller,
          hasCreatedBy: !!productData.createdBy,
          hasUserId: !!productData.userId
        });
        
        // Owner bilgisi eksikse ancak diğer alanlardan referans bilgisi varsa
        if (!productData.owner) {
          // Seller bilgisini owner olarak kopyala
          if (productData.seller && typeof productData.seller === 'object') {
            console.log('Owner bilgisi eksik. Seller -> Owner kopyalanıyor');
            productData.owner = { ...productData.seller };
          }
          // CreatedBy bilgisini owner olarak kopyala
          else if (productData.createdBy && typeof productData.createdBy === 'object') {
            console.log('Owner bilgisi eksik. CreatedBy -> Owner kopyalanıyor');
            productData.owner = { ...productData.createdBy };
          }
          // UserId bilgisini minimal owner objesi olarak kopyala
          else if (productData.userId) {
            console.log('Owner bilgisi eksik. UserId ile minimal owner oluşturuluyor');
            productData.owner = { 
              _id: productData.userId,
              id: productData.userId,
              username: productData.createdByUsername || 'Satıcı'
            };
          }
        }
        
        // Owner bilgisini loglama
        if (productData.owner) {
          console.log('İşlenmiş owner bilgisi:', {
            _id: productData.owner._id,
            id: productData.owner.id,
            username: productData.owner.username
          });
        }
      }
      
      // API response formatını koru ama iyileştirilmiş veriyi döndür
      if (response.data?.data) {
        return {
          ...response.data,
          data: productData
        };
      } else {
        return productData;
      }
    } catch (apiError) {
      // 500 hatası veya ağ hatası durumunda
      console.error(`API request error for product ${id}:`, {
        message: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data
      });
      
      // 500 hatası durumunda varsayılan veri döndür
      if (apiError.response?.status === 500) {
        console.log(`500 hatası alındı, ürün ${id} için varsayılan veri döndürülüyor`);
        return {
          _id: id || 'error',
          id: id || 'error',
          title: "Ürün bilgisi alınamadı (sunucu hatası)",
          price: "-",
          description: "Bu ürün bilgisi şu anda sunucudan alınamıyor.",
          image: null,
          imageUrl: null,
          // Varsayılan veri - görünüm için gerekli minimum değerler
          __isErrorPlaceholder: true
        };
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    throw error;
  }
};

// Ürün detayını slug ile getirme
const getProductBySlug = async (slug) => {
  try {
    console.log(`Requesting product details for slug: ${slug}`);
    const response = await api.get(`/products/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product with slug ${slug}:`, error);
    throw error;
  }
};

// Ürün oluşturma
const createProduct = async (productData) => {
  try {
    console.log('Creating new product');
    const response = await api.post('/products', productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Product created successfully');
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

// Ürün güncelleme
const updateProduct = async (id, productData) => {
  try {
    console.log(`Updating product: ${id}`);
    
    // FormData olup olmadığını kontrol et
    if (productData instanceof FormData) {
      // Kategori işleme - kategori bir isim ise ID'ye dönüştürmeye çalış
      const category = productData.get('category');
      
      if (category && typeof category === 'string') {
        console.log('Category value:', category);
        
        // Sayısal bir değer mi kontrol et
        if (/^\d+$/.test(category)) {
          console.log('Kategori sayısal bir değer:', category);
          
          // CATEGORIES sabitinden kategori adını bul
          try {
            const { CATEGORIES } = require('../constants');
            const categoryObj = CATEGORIES.find(cat => cat.id === category);
            
            if (categoryObj) {
              console.log(`Sayısal ID'den kategori adı bulundu: ${categoryObj.name}`);
              // FormData'dan mevcut kategoriyi çıkar
              const newFormData = new FormData();
              
              // FormData'daki diğer tüm alanları kopyala
              for (let pair of productData.entries()) {
                if (pair[0] !== 'category') {
                  newFormData.append(pair[0], pair[1]);
                }
              }
              
              // Kategori adını ekle
              newFormData.append('category', categoryObj.name);
              
              // productData'yı güncelle
              productData = newFormData;
            }
          } catch (err) {
            console.error('Kategori dönüştürme hatası:', err);
          }
        }
      }
    }
    
    const response = await api.put(`/products/${id}`, productData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Product updated successfully');
    return response.data;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Ürün silme
const deleteProduct = async (id) => {
  try {
    console.log(`Deleting product: ${id}`);
    const response = await api.delete(`/products/${id}`);
    console.log('Product deleted successfully');
    return response.data;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error;
  }
};

// Ürünü favorilere ekleme/çıkarma
const toggleFavorite = async (id) => {
  try {
    console.log(`Toggling favorite status for product: ${id}`);
    const response = await api.post(`/products/${id}/favorite`);
    return response.data;
  } catch (error) {
    console.error(`Error toggling favorite for product ${id}:`, error);
    throw error;
  }
};

const productService = {
  getProducts,
  getFeaturedProducts,
  getUserProducts,
  getCurrentUserProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite
};

export default productService; 