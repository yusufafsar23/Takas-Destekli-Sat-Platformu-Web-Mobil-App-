import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

// Create the auth context
const AuthContext = createContext();

// Helper function to extract user data from different API response formats
const extractUserData = (response) => {
  if (!response) return null;
  
  let userData = null;
  
  // Direct user object
  if (response.firstName !== undefined || response.username !== undefined || response.fullName !== undefined) {
    userData = response;
  }
  
  // User in response.data
  else if (response.data && (response.data.firstName !== undefined || response.data.username !== undefined || response.data.fullName !== undefined)) {
    userData = response.data;
  }
  
  // User in response.data.user
  else if (response.data && response.data.user && 
     (response.data.user.firstName !== undefined || response.data.user.username !== undefined || response.data.user.fullName !== undefined)) {
    userData = response.data.user;
  }
  
  // User in response.data.data
  else if (response.data && response.data.data && 
     (response.data.data.firstName !== undefined || response.data.data.username !== undefined || response.data.data.fullName !== undefined)) {
    userData = response.data.data;
  }
  
  // fullName'i ve username'i kontrol et ve temizle
  if (userData) {
    console.log('CRITICAL DEBUG - User data found:', userData);
    
    // Username'i kontrol et - yoksa farklı yerlerden bul
    if (!userData.username) {
      // email adresinden @ öncesini kullanıcı adı olarak atayabiliriz
      if (userData.email && userData.email.includes('@')) {
        userData.username = userData.email.split('@')[0];
        console.log(`CRITICAL DEBUG - Username created from email: "${userData.username}"`);
      }
    } else {
      console.log(`CRITICAL DEBUG - Username available: "${userData.username}"`);
    }
    
    // fullName yoksa firstName ve lastName'den oluştur
    if (!userData.fullName && (userData.firstName || userData.lastName)) {
      userData.fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      console.log(`CRITICAL DEBUG - fullName created from firstName and lastName: "${userData.fullName}"`);
    }
    
    // fullName varsa temizle
    if (userData.fullName) {
      userData.fullName = userData.fullName.trim();
      console.log(`CRITICAL DEBUG - Final fullName: "${userData.fullName}"`);
    } else {
      // Hiçbir isim bilgisi yoksa username'i kullan
      if (userData.username) {
        userData.fullName = userData.username;
        console.log(`CRITICAL DEBUG - Using username as fullName: "${userData.fullName}"`);
      } else {
        userData.fullName = '';
      }
    }
    
    console.log('CRITICAL DEBUG - Final user data:', {
      username: userData.username || '[MISSING]',
      fullName: userData.fullName || '[MISSING]',
      email: userData.email || '[MISSING]'
    });
  }
  
  return userData;
};

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authService.profile();
          console.log('Auth profile response (RAW):', JSON.stringify(response));
          const userData = extractUserData(response);
          console.log('Extracted user data (AFTER PROCESSING):', JSON.stringify(userData));
          setUser(userData);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        // Clear token if invalid
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.login(credentials);
      const token = response.data?.token || response.token;
      
      if (token) {
        localStorage.setItem('token', token);
      } else {
        throw new Error('No token received from server');
      }
      
      const userData = extractUserData(response);
      setUser(userData);
      return response.data || response;
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş yapılamadı');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.register(userData);
      const token = response.data?.token || response.token;
      
      if (token) {
        localStorage.setItem('token', token);
      } else {
        throw new Error('No token received from server');
      }
      
      const userDataFromResponse = extractUserData(response);
      setUser(userDataFromResponse);
      return response.data || response;
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt yapılamadı');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = (callback) => {
    localStorage.removeItem('token');
    setUser(null);
    setIsLoading(false); // Çıkış yapınca loading durumunu da kapat
    
    // Eğer callback varsa çağır (yönlendirme için)
    if (typeof callback === 'function') {
      callback();
    }
  };

  // Update profile function
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.updateProfile(userData);
      const updatedUserData = extractUserData(response);
      setUser(updatedUserData);
      return updatedUserData;
    } catch (err) {
      setError(err.response?.data?.message || 'Profil güncellenemedi');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 