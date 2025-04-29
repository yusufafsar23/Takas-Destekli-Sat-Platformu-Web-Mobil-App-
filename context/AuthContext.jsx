import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';
import api from '../services/api';

// Auth context oluşturma
const AuthContext = createContext();

// Auth Provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Uygulama başladığında AsyncStorage'dan kullanıcı bilgilerini alma
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // API isteklerinde kullanılacak token ayarı
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (err) {
        console.error('Error loading stored authentication data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStoredData();
  }, []);

  // Giriş fonksiyonu
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      setToken(data.token);

      // AsyncStorage'a kullanıcı verilerini kaydetme
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      await AsyncStorage.setItem('token', data.token);
      
      // API isteklerinde kullanılacak token ayarı
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş yapılırken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt fonksiyonu
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register(userData);
      setUser(data.user);
      setToken(data.token);

      // AsyncStorage'a kullanıcı verilerini kaydetme
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      await AsyncStorage.setItem('token', data.token);
      
      // API isteklerinde kullanılacak token ayarı
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt olurken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      await authService.logout();
      
      // AsyncStorage'dan kullanıcı verilerini temizleme
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      
      // State'leri temizleme
      setUser(null);
      setToken(null);
      
      // API header'ından token'ı kaldırma
      delete api.defaults.headers.common['Authorization'];
    } catch (err) {
      console.error('Çıkış yapılırken bir hata oluştu:', err);
    }
  };

  // Şifremi unuttum fonksiyonu
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.forgotPassword(email);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre sıfırlama isteği gönderilirken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Şifre sıfırlama fonksiyonu
  const resetPassword = async (token, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.resetPassword(token, newPassword);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Email doğrulama fonksiyonu
  const verifyEmail = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.verifyEmail(token);
      
      // Kullanıcı bilgilerini güncelleme
      if (data.user && data.token) {
        setUser(data.user);
        setToken(data.token);
        
        // AsyncStorage'a güncel verileri kaydetme
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('token', data.token);
        
        // API isteklerinde kullanılacak token ayarı
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
      
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Email doğrulanırken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Profil güncelleme fonksiyonu
  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await authService.updateProfile(profileData);
      setUser(updatedUser);
      
      // AsyncStorage'da kullanıcı verilerini güncelleme
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (err) {
      setError(err.response?.data?.message || 'Profil güncellenirken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Şifre değiştirme fonksiyonu
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.changePassword(currentPassword, newPassword);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre değiştirilirken bir hata oluştu');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // AuthContext değerleri
  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Auth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 