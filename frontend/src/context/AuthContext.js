import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

// Create the auth context
const AuthContext = createContext();

// Helper function to extract user data from different API response formats
const extractUserData = (response) => {
  if (!response) return null;
  
  // Direct user object
  if (response.firstName !== undefined || response.username !== undefined) {
    return response;
  }
  
  // User in response.data
  if (response.data && (response.data.firstName !== undefined || response.data.username !== undefined)) {
    return response.data;
  }
  
  // User in response.data.user
  if (response.data && response.data.user && 
     (response.data.user.firstName !== undefined || response.data.user.username !== undefined)) {
    return response.data.user;
  }
  
  // User in response.data.data
  if (response.data && response.data.data && 
     (response.data.data.firstName !== undefined || response.data.data.username !== undefined)) {
    return response.data.data;
  }
  
  return null;
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
          console.log('Auth profile response:', response);
          const userData = extractUserData(response);
          console.log('Extracted user data:', userData);
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