import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

// Create the auth context
const AuthContext = createContext();

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
          setUser(response.data);
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
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return response.data;
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
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt yapılamadı');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Update profile function
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authService.updateProfile(userData);
      setUser(response.data);
      return response.data;
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