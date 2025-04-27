import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API temel URL'i
const API_URL = 'http://localhost:5000/api';

// Axios instance oluşturma
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - her istekte token kontrolü yapma
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - hata işleme
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 401 hatası ve token yenileme mantığı burada uygulanabilir
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token yenileme veya kullanıcıyı logout yapma mantığı
      // Bu örnekte basitçe logout yapıyoruz
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    }
    
    return Promise.reject(error);
  }
);

export default api; 