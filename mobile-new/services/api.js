import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { Platform } from 'react-native';

// API server URL - tüm uygulama için kullanılabilir
export const API_SERVER_URL = 'http://192.168.1.61:5000';

// API tabanı URL - otomatik olarak yönetilecek
const getApiBaseUrl = () => {
  console.log('Platform: ', Platform.OS);
  
  // Use the hardcoded IP for all platforms to ensure consistency
  const serverIP = '192.168.1.61';
  const port = 5000;
  
  if (Platform.OS === 'android' && !Platform.isTV) {
    // Android emülatör için - localhost yerine 10.0.2.2 kullanılır
    // Gerçek cihaz için IP adresini kullan
    console.log('Android URL kullanılıyor...');
    return `http://${serverIP}:${port}/api`;
  } else if (Platform.OS === 'ios') {
    // iOS için bilgisayarın IP adresini kullan (Expo Go için localhost çalışmaz)
    console.log('iOS URL kullanılıyor...');
    return `http://${serverIP}:${port}/api`;
  } else {
    // Gerçek cihazlar ve diğer platformlar için
    console.log('Web/Diğer platformlar için URL kullanılıyor...');
    return `http://${serverIP}:${port}/api`;
  }
};

const API_BASE_URL = getApiBaseUrl();

// API URL'in kullanılıp kullanılmayacağını belirlemek için flag
console.log('API Ayarları:', {
  apiUrl: API_BASE_URL,
  platform: Platform.OS
});

// Axios örneği oluşturma
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 saniye zaman aşımı (daha uzun süre bekle)
  validateStatus: status => status >= 200 && status < 300, // Başarı durumunu kontrol etmek için
});

// Simüle edilmiş veri yanıtı
const simulateResponse = (data, delay = 500) => {
  return new Promise(resolve => setTimeout(() => resolve({ data }), delay));
};

// İstek öncesi token ekleme ve offline mod kontrolü
api.interceptors.request.use(
  async (config) => {
    try {
      // Offline modu kontrol et
      const isOfflineMode = await AsyncStorage.getItem('offlineMode');
      
      // İlk kullanımda offline modu "false" olarak ayarla (varsayılan olarak online mod)
      if (isOfflineMode === null) {
        await AsyncStorage.setItem('offlineMode', 'false');
        console.log('Offline mod varsayılan olarak devre dışı');
      }
      
      // Eğer offline mod aktifse dummy veri kullan 
      if (isOfflineMode === 'true') {
        console.log('Offline mod aktif, API isteği yapılmayacak:', config.url);
        return Promise.reject({ 
          isDummyDataMode: true, 
          config: config
        });
      }

      // Token'ı birden fazla storage key'den kontrol et
      let token = null;
      const tokenKeys = ['authToken', 'token'];
      
      for (const key of tokenKeys) {
        const storedToken = await AsyncStorage.getItem(key);
        if (storedToken) {
          token = storedToken;
          break;
        }
      }
      
      // Token varsa header'a ekle
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Token başarıyla eklendi:', config.url);
      } else {
        console.warn('Token bulunamadı:', config.url);
      }
      
      // Parametreleri log'a yazdır
      console.log('API İsteği gönderiliyor:', config.url, 'Parametreler:', config.params || 'Yok');
      
      // Kategori filtresini kontrol et
      if (config.params && config.params.category) {
        // Kategori ID'si geçerli formatta mı kontrol et
        const categoryId = config.params.category;
        console.log('Kategori filtresi tespit edildi:', categoryId);
        
        // Kategori ID'sinin MongoDB ObjectId formatına uygun olup olmadığını kontrol et
        // Eğer değilse gereksiz ID gönderme
        if (typeof categoryId === 'string' && !/^[0-9a-fA-F]{24}$/.test(categoryId)) {
          console.log('Kategori ID geçersiz format, değiştirildi:', categoryId);
          // Kısa ID'yi kaldır, sadece kategori adını kullan
          if (config.params.title) {
            config.params.search = config.params.title; // Kategori adını arama terimi olarak kullan
          }
          delete config.params.category; // Geçersiz kategori ID'sini kaldır
        }
      }
      
      return config;
    } catch (error) {
      console.error('API Request Interceptor hatası:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Yanıt işleme
api.interceptors.response.use(
  (response) => {
    try {
      const dataPreview = response.data ? 
        (typeof response.data === 'object' ? 
          JSON.stringify(response.data).substring(0, 300) + '...' : 
          String(response.data).substring(0, 100)) : 
        'No data';
      
      console.log(`API Response [${response.status}] from: ${response.config.url}`, 
        'Data structure:', Array.isArray(response.data) ? 
          `Array with ${response.data.length} items` : 
          Object.keys(response.data || {}).join(', '), 
        'Preview:', dataPreview);
      
      // Array yanıtlarını modifiye etmiyoruz
      return response.data;
    } catch (logError) {
      console.error('Error logging response:', logError);
      return response.data;
    }
  },
  async (error) => {
    // Eğer 401 hatası alındıysa ve refresh token varsa
    if (error.response?.status === 401) {
      try {
        // Refresh token'ı al
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('Refresh token bulunamadı');
        }

        // Refresh token ile yeni token al
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        if (response.data?.token) {
          // Yeni token'ı kaydet
          await AsyncStorage.setItem('authToken', response.data.token);
          await AsyncStorage.setItem('token', response.data.token);

          // Orijinal isteği yeni token ile tekrarla
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token yenileme hatası:', refreshError);
        // Token yenileme başarısız olursa kullanıcıyı çıkış yapmaya zorla
        await AsyncStorage.multiRemove(['authToken', 'token', 'refreshToken', 'user', 'userData', 'user_data']);
      }
    }

    // Dummy veri modundaysa ve ağ hatası alındıysa
    if (error.isDummyDataMode) {
      console.log('Offline mod aktif, ağ isteği engellendi:', error.config.url);
      return Promise.reject({
        customMessage: 'Offline mod aktif. Gerçek veriler yüklenemiyor.',
        isOfflineMode: true
      });
    }
    
    const originalRequest = error.config;
    
    // Hata detaylarını logla
    if (error.response) {
      console.log('API Hata Yanıtı:', {
        status: error.response.status,
        data: error.response.data,
        endpoint: originalRequest?.url
      });
    } else if (error.request) {
      console.log('API İstek Hatası - Yanıt alınamadı:', {
        url: originalRequest?.url,
        message: error.message
      });
      
      // Ağ hatası durumunda otomatik olarak offline moda geç
      try {
        await AsyncStorage.setItem('offlineMode', 'true');
        console.log('Ağ hatası nedeniyle offline moda geçildi');
      } catch (storageError) {
        console.error('Offline mod ayarlanırken hata:', storageError);
      }
    } else {
      console.log('API Hata:', error.message, originalRequest?.url);
    }
    
    // Anlamlı hata mesajları oluştur
    if (error.code === 'ECONNABORTED') {
      error.customMessage = 'İstek zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edin.';
      error.isOfflineMode = true;
    } else if (!error.response) {
      error.customMessage = 'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.';
      error.isOfflineMode = true;
    } else if (error.response.status >= 500) {
      error.customMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    } else if (error.response.status === 404) {
      error.customMessage = 'İstenen kaynak bulunamadı.';
    } else if (error.response.data && error.response.data.message) {
      error.customMessage = error.response.data.message;
    } else {
      error.customMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }
    
    return Promise.reject(error);
  }
);

// Dummy Data API - offline çalışma için
const dummyAPI = {
  get: (url, config = {}) => {
    console.log('Dummy API GET:', url);
    
    // Kategoriler
    if (url.includes('/categories')) {
      return simulateResponse([
        { id: 1, name: 'Elektronik', icon: 'phone-portrait', slug: 'elektronik' },
        { id: 2, name: 'Ev Eşyaları', icon: 'home', slug: 'ev-esyalari' },
        { id: 3, name: 'Giyim', icon: 'shirt', slug: 'giyim' },
        { id: 4, name: 'Kitap & Hobi', icon: 'book', slug: 'kitap-hobi' },
        { id: 5, name: 'Spor', icon: 'football', slug: 'spor' },
        { id: 6, name: 'Oyun & Konsol', icon: 'game-controller', slug: 'oyun-konsol' }
      ]);
    }
    
    // Öne çıkan ürünler
    if (url.includes('/products/featured')) {
      return simulateResponse([
        {
          id: 1,
          title: 'iPhone 13 Pro',
          description: 'Mükemmel durumda, tüm aksesuarlarıyla birlikte.',
          price: 24000,
          imageUrl: 'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13',
          category: 'Elektronik',
          slug: 'iphone-13-pro'
        },
        {
          id: 2,
          title: 'PlayStation 5',
          description: 'Kutusunda, 2 oyun kumandası ile birlikte.',
          price: 18000,
          imageUrl: 'https://placehold.co/600x400/4169E1/FFFFFF?text=PlayStation+5',
          category: 'Oyun & Konsol',
          slug: 'playstation-5'
        },
        {
          id: 3,
          title: 'MacBook Pro M2',
          description: '16 GB RAM, 512 GB SSD, Space Gray.',
          price: 42000,
          imageUrl: 'https://placehold.co/600x400/20B2AA/FFFFFF?text=MacBook+Pro',
          category: 'Bilgisayar',
          slug: 'macbook-pro-m2'
        },
        {
          id: 4,
          title: 'Samsung QLED TV',
          description: '65 inç, 4K Ultra HD, Smart TV',
          price: 32000,
          imageUrl: 'https://placehold.co/600x400/800080/FFFFFF?text=Samsung+TV',
          category: 'Elektronik',
          slug: 'samsung-qled-tv'
        }
      ]);
    }
    
    // Ürünler
    if (url.includes('/products') && !url.includes('/featured')) {
      return simulateResponse({
        items: [
          {
            id: 4,
            title: 'Antika Saat',
            description: 'Antika değeri olan klasik saat, çalışır durumda',
            price: 3500,
            imageUrl: 'https://placehold.co/600x400/D2B48C/FFFFFF?text=Antika+Saat',
            category: 'Antika'
          },
          {
            id: 5,
            title: 'Nike Spor Ayakkabı',
            description: 'Yeni sezon, hiç giyilmemiş, 42 numara',
            price: 2800,
            imageUrl: 'https://placehold.co/600x400/696969/FFFFFF?text=Nike+Ayakkabı',
            category: 'Giyim'
          },
          {
            id: 6,
            title: 'Avengers Koleksiyon Seti',
            description: 'Tüm Avengers figürleri, kutusunda',
            price: 1200,
            imageUrl: 'https://placehold.co/600x400/FF4500/FFFFFF?text=Avengers',
            category: 'Koleksiyon'
          }
        ],
        total: 3,
        page: 1,
        limit: 10
      });
    }
    
    // Ürün detayı
    if (url.includes('/products/') && url.split('/').length > 2) {
      const productId = parseInt(url.split('/').pop());
      
      if (productId === 1) {
        return simulateResponse({
          id: 1,
          title: 'iPhone 13 Pro',
          description: 'Mükemmel durumda, tüm aksesuarlarıyla birlikte. Çizik, sıyrık yok. Pil sağlığı %90. Kutusu, kılıfı ve şarj cihazı ile verilecektir. Takas için MacBook Air M1 veya M2 düşünülebilir.',
          price: 24000,
          imageUrl: 'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13',
          category: 'Elektronik',
          seller: {
            id: 101,
            name: 'Ahmet Yılmaz',
            rating: 4.8,
            location: 'İstanbul, Kadıköy',
            profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=AY'
          },
          openToTrade: true,
          tradeOptions: ['MacBook Air', 'iPad Pro', 'Apple Watch'],
          condition: 'Çok İyi',
          createdAt: '2023-05-15T14:30:00Z',
          images: [
            'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13',
            'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13+2',
            'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13+3'
          ]
        });
      }
      
      if (productId === 2) {
        return simulateResponse({
          id: 2,
          title: 'PlayStation 5',
          description: 'Kutusunda, 2 oyun kumandası ile birlikte. 1 yıllık, garanti devam ediyor. 5 adet oyun ile birlikte verilecektir: FIFA 22, Spider-Man, God of War, GTA 5, Resident Evil Village.',
          price: 18000,
          imageUrl: 'https://placehold.co/600x400/4169E1/FFFFFF?text=PlayStation+5',
          category: 'Oyun & Konsol',
          seller: {
            id: 102,
            name: 'Mehmet Demir',
            rating: 4.5,
            location: 'Ankara, Çankaya',
            profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=MD'
          },
          openToTrade: true,
          tradeOptions: ['Xbox Series X', 'Gaming Laptop'],
          condition: 'Yeni Gibi',
          createdAt: '2023-06-02T10:15:00Z',
          images: [
            'https://placehold.co/600x400/4169E1/FFFFFF?text=PlayStation+5',
            'https://placehold.co/600x400/4169E1/FFFFFF?text=PlayStation+5+2',
            'https://placehold.co/600x400/4169E1/FFFFFF?text=PlayStation+5+3'
          ]
        });
      }
      
      return Promise.reject({ response: { status: 404, data: { message: 'Ürün bulunamadı' } } });
    }
    
    // Varsayılan olarak boş dizi
    return simulateResponse([]);
  },
  
  post: (url, data, config = {}) => {
    console.log('Dummy API POST:', url, data);
    
    // Giriş işlemi
    if (url.includes('/auth/login')) {
      if (data.email === 'test@example.com' && data.password === 'password123') {
        return simulateResponse({
          token: 'dummy-token-123',
          refreshToken: 'dummy-refresh-token-123',
          user: {
            id: 999,
            name: 'Test Kullanıcı',
            email: 'test@example.com',
            profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=TK'
          }
        });
      }
      
      return Promise.reject({
        response: {
          status: 401,
          data: { message: 'E-posta adresi veya şifre hatalı.' }
        }
      });
    }
    
    // Kayıt işlemi
    if (url.includes('/auth/register')) {
      return simulateResponse({
        token: 'dummy-token-123',
        refreshToken: 'dummy-refresh-token-123',
        user: {
          id: 1000,
          name: data.name,
          email: data.email,
          profileImage: 'https://placehold.co/200x200/E0E0E0/333333?text=NEW'
        }
      });
    }
    
    // Varsayılan başarılı yanıt
    return simulateResponse({ success: true });
  },
  
  put: (url, data, config = {}) => {
    console.log('Dummy API PUT:', url, data);
    return simulateResponse({ success: true });
  },
  
  delete: (url, config = {}) => {
    console.log('Dummy API DELETE:', url);
    return simulateResponse({ success: true });
  }
};

// Her zaman hem dummy API hem gerçek API export et
// Kullanıcı hangi API'yi kullanacağı AppContext'teki isOfflineMode değerine göre belirlenecek
export { api, dummyAPI };

// Default export - offline moda göre dinamik olarak seçilecek
const createDynamicAPI = {
  get: async (url, config = {}) => {
    try {
      const isOfflineMode = await AsyncStorage.getItem('offlineMode');
      if (isOfflineMode === 'true') {
        console.log('DynamicAPI: Offline modda dummy veri kullanılıyor:', url);
        return dummyAPI.get(url, config);
      } else {
        console.log('DynamicAPI: Online modda gerçek API kullanılıyor:', url);
        return api.get(url, config);
      }
    } catch (error) {
      console.error('API seçimi hatası:', error);
      return dummyAPI.get(url, config);
    }
  },
  
  post: async (url, data, config = {}) => {
    try {
      const isOfflineMode = await AsyncStorage.getItem('offlineMode');
      if (isOfflineMode === 'true') {
        return dummyAPI.post(url, data, config);
      } else {
        return api.post(url, data, config);
      }
    } catch (error) {
      console.error('API seçimi hatası:', error);
      return dummyAPI.post(url, data, config);
    }
  },
  
  put: async (url, data, config = {}) => {
    try {
      const isOfflineMode = await AsyncStorage.getItem('offlineMode');
      if (isOfflineMode === 'true') {
        return dummyAPI.put(url, data, config);
      } else {
        return api.put(url, data, config);
      }
    } catch (error) {
      console.error('API seçimi hatası:', error);
      return dummyAPI.put(url, data, config);
    }
  },
  
  delete: async (url, config = {}) => {
    try {
      const isOfflineMode = await AsyncStorage.getItem('offlineMode');
      if (isOfflineMode === 'true') {
        return dummyAPI.delete(url, config);
      } else {
        return api.delete(url, config);
      }
    } catch (error) {
      console.error('API seçimi hatası:', error);
      return dummyAPI.delete(url, config);
    }
  }
};

export default createDynamicAPI;

// API durum kontrolü için fonksiyon
export const checkAPIStatus = async () => {
  try {
    // 5 saniye kısa timeout ile basit bir API isteği yap
    const response = await axios.get(`${API_SERVER_URL}/api/status`, {
      timeout: 5000, // 5 saniye timeout ile hızlı kontrol
    });
    
    return {
      online: true,
      status: response.status,
      message: 'API sunucusu çalışıyor'
    };
  } catch (error) {
    console.error('API durum kontrolü başarısız:', error.message);
    
    // Hata mesajı oluştur
    const statusInfo = {
      online: false,
      message: 'API sunucusu erişilemez'
    };
    
    // Ağ hatası türünü belirle
    if (error.code === 'ECONNABORTED') {
      statusInfo.errorType = 'timeout';
      statusInfo.detailedMessage = 'API isteği zaman aşımına uğradı (5s)';
    } else if (!error.response) {
      statusInfo.errorType = 'network';
      statusInfo.detailedMessage = 'Ağ bağlantısı yok veya sunucu çalışmıyor';
    } else {
      statusInfo.errorType = 'server';
      statusInfo.status = error.response.status;
      statusInfo.detailedMessage = `Sunucu hatası: ${error.response.status}`;
    }
    
    return statusInfo;
  }
};

// API dışı doğrudan erişim için fonksiyon
export const directApiAccess = async (endpoint, method = 'GET', data = null) => {
  try {
    const authToken = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('token');
    
    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    // Endpoint'in /api ile başladığından emin olalım
    const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_SERVER_URL}${normalizedEndpoint}`, options);
    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error(`Error in direct API access to ${endpoint}:`, error);
    throw error;
  }
}; 