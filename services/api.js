import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API tabanı URL - Takas platform backend sunucusu
const API_BASE_URL = 'http://192.168.1.61:5000';

// Axios örneği oluşturma
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000 // 15 saniye zaman aşımı
});

// İstek öncesi token ekleme
api.interceptors.request.use(
  async (config) => {
    try {
      // Birden fazla token anahtarını kontrol et
      let token = await AsyncStorage.getItem('authToken');
      if (!token) {
        token = await AsyncStorage.getItem('token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('API: Added auth token to request');
      } else {
        console.log('API: No auth token found for request');
      }
      return config;
    } catch (error) {
      console.error('API: Error getting auth token:', error);
      return config;
    }
  },
  (error) => {
    console.error('API: Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Yanıt işleme
api.interceptors.response.use(
  (response) => {
    // Başarılı yanıtlar için
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 401 Unauthorized hatası ve henüz tekrar denenmedi ise
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('API: 401 Unauthorized error, attempting recovery');
      originalRequest._retry = true;
      
      try {
        // Refresh token işlemi burada yapılabilir
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.log('API: No refresh token found');
          throw new Error('Refresh token bulunamadı');
        }
        
        console.log('API: Attempting to refresh token');
        
        // Refresh token ile yeni token alma
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
          refreshToken
        });
        
        if (response.data && response.data.token) {
          const { token } = response.data;
          console.log('API: Successfully refreshed token');
          
          // Token'ı hem authToken hem de token anahtarlarıyla kaydet
          await AsyncStorage.setItem('authToken', token);
          await AsyncStorage.setItem('token', token);
          
          // API isteklerinde kullanılacak token ayarı
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Orijinal isteği tekrarlama
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } else {
          console.log('API: Token refresh response did not contain a token');
          throw new Error('Invalid refresh token response');
        }
      } catch (refreshError) {
        console.error('API: Token refresh failed:', refreshError);
        
        // Oturum süresi doldu, kullanıcıyı çıkış yapmaya zorla
        await AsyncStorage.multiRemove(['authToken', 'token', 'refreshToken', 'user', 'user_data', 'userData']);
        
        // Uygulama event'i olarak bildir
        if (global.eventEmitter) {
          global.eventEmitter.emit('auth_error', { 
            message: 'Oturum hatası, tekrar giriş yapmalısınız',
            error: refreshError 
          });
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Diğer hata durumları için
    if (error.response) {
      // Sunucu yanıtı aldık, ancak 2xx dışında bir durum kodu
      console.error(`API: Response error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // İstek yapıldı ancak hiçbir yanıt alınamadı
      console.error('API: No response received:', error.request);
    } else {
      // İstek ayarlanırken bir şeyler yanlış gitti
      console.error('API: Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 