import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API tabanı URL
const API_BASE_URL = 'https://api.takasplatform.com/api/v1';

// Axios örneği oluşturma
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000 // 10 saniye zaman aşımı
});

// İstek öncesi token ekleme
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Auth token alınırken hata:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Yanıt işleme
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 401 Unauthorized hatası ve henüz tekrar denenmedi ise
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Refresh token işlemi burada yapılabilir
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('Refresh token bulunamadı');
        }
        
        // Refresh token ile yeni token alma
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });
        
        const { token } = response.data;
        await AsyncStorage.setItem('authToken', token);
        
        // Orijinal isteği tekrarlama
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Oturum süresi doldu, kullanıcıyı çıkış yapmaya zorla
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 