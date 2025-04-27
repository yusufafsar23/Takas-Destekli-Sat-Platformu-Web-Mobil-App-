import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

const API_URL = 'http://localhost:5000/api';

// Context oluşturma
const AuthContext = createContext(undefined);

// Context Provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Uygulama başlangıcında AsyncStorage'dan kullanıcı bilgilerini alma
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        const storedUser = await AsyncStorage.getItem('user_data');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Giriş fonksiyonu
  const login = async (email, password, rememberMe = false) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/users/login`, {
        email,
        password,
        rememberMe
      });

      const { user, token } = response.data;
      
      // Token'ı ve kullanıcı bilgilerini kaydetme
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      // Kullanıcı verilerini state'e kaydetme
      setUser(user);
      setToken(token);
      
      // Varsayılan axios header'larına token'ı ekleme
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Giriş yapılamadı.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Kayıt fonksiyonu
  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/users/register`, userData);
      
      const { user, token } = response.data;
      
      // Token'ı ve kullanıcı bilgilerini kaydetme
      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      // Kullanıcı verilerini state'e kaydetme
      setUser(user);
      setToken(token);
      
      // Varsayılan axios header'larına token'ı ekleme
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Kayıt yapılamadı.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // API çağrısı (backend'de logout endpoint'i varsa)
      if (token) {
        try {
          await axios.post(`${API_URL}/users/logout`);
        } catch (error) {
          console.error('Error logging out from server:', error);
        }
      }
      
      // Storage'dan kullanıcı bilgilerini temizleme
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      // State'i temizleme
      setUser(null);
      setToken(null);
      
      // Axios header'larından token'ı kaldırma
      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Şifre sıfırlama için e-posta gönderme
  const forgotPassword = async (email) => {
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/users/forgot-password`, { email });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'İstek gönderilemedi.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Şifre sıfırlama
  const resetPassword = async (token, newPassword) => {
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/users/reset-password`, {
        token,
        newPassword
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Şifre sıfırlanamadı.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // E-posta doğrulama
  const verifyEmail = async (token) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/users/verify-email`, { token });
      
      const { user, token: newToken } = response.data;
      
      // Token'ı ve kullanıcı bilgilerini güncelleme
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      
      // Kullanıcı verilerini state'e kaydetme
      setUser(user);
      setToken(newToken);
      
      // Varsayılan axios header'larına token'ı ekleme
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'E-posta doğrulanamadı.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Profil güncelleme
  const updateProfile = async (userData) => {
    try {
      if (!token) throw new Error('Oturum açık değil.');
      
      setIsLoading(true);
      const response = await axios.put(`${API_URL}/users/profile`, userData);
      
      const updatedUser = response.data.user;
      
      // Güncellenmiş kullanıcı bilgilerini kaydetme
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      // Kullanıcı verilerini state'e kaydetme
      setUser(updatedUser);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Profil güncellenemedi.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Şifre değiştirme
  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!token) throw new Error('Oturum açık değil.');
      
      setIsLoading(true);
      await axios.put(`${API_URL}/users/password`, {
        currentPassword,
        newPassword
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Şifre değiştirilemedi.';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Context değerini oluşturma
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
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

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 