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
  const [authState, setAuthState] = useState('initializing'); // 'initializing', 'authenticated', 'unauthenticated'

  // Normalize a user object to ensure it has both id and _id properties
  const normalizeUserData = (userData) => {
    if (!userData) return null;
    
    const normalized = {...userData};
    
    // Ensure user has proper ID format
    if (!normalized._id && normalized.id) {
      normalized._id = normalized.id;
      console.log('AuthContext: Added _id from id property');
    } else if (!normalized.id && normalized._id) {
      normalized.id = normalized._id;
      console.log('AuthContext: Added id from _id property');
    } else if (!normalized._id && !normalized.id) {
      console.warn('AuthContext: User data missing both id and _id properties!');
    }
    
    return normalized;
  };

  // Save user data to AsyncStorage with multiple keys for compatibility
  const saveUserToStorage = async (userData, authToken) => {
    try {
      if (userData) {
        const userJSON = JSON.stringify(userData);
        await AsyncStorage.setItem('user', userJSON);
        await AsyncStorage.setItem('user_data', userJSON);
        await AsyncStorage.setItem('userData', userJSON);
        console.log('AuthContext: User data saved to multiple storage keys');
      }
      
      if (authToken) {
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('token', authToken);
        console.log('AuthContext: Token saved to multiple storage keys');
      }
    } catch (storageError) {
      console.error('AuthContext: Failed to save user data to storage:', storageError);
    }
  };

  // Uygulama başladığında AsyncStorage'dan kullanıcı bilgilerini alma
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        console.log('AuthContext: Attempting to load user data from AsyncStorage');
        
        // Try different possible AsyncStorage keys for auth token
        const authTokenKeys = ['authToken', 'token'];
        let storedToken = null;
        
        for (const key of authTokenKeys) {
          const token = await AsyncStorage.getItem(key);
          if (token) {
            console.log(`AuthContext: Found token with key '${key}'`);
            storedToken = token;
            break;
          }
        }
        
        // Try different possible AsyncStorage keys for user data
        const userDataKeys = ['user', 'user_data', 'userData'];
        let storedUser = null;
        
        for (const key of userDataKeys) {
          const userData = await AsyncStorage.getItem(key);
          if (userData) {
            console.log(`AuthContext: Found user data with key '${key}'`);
            storedUser = userData;
            break;
          }
        }

        if (storedUser && storedToken) {
          // Parse the stored user data
          let userData;
          try {
            userData = JSON.parse(storedUser);
            console.log('AuthContext: Successfully parsed user data:', JSON.stringify(userData));
          } catch (parseError) {
            console.error('AuthContext: Error parsing user data:', parseError);
            userData = null;
          }
          
          if (userData) {
            // Normalize the user data
            const normalizedUser = normalizeUserData(userData);
            
            setUser(normalizedUser);
            setToken(storedToken);
            setAuthState('authenticated');
            
            // API isteklerinde kullanılacak token ayarı
            try {
              if (api && api.defaults && api.defaults.headers) {
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                console.log('AuthContext: Token set in API headers');
              } else {
                console.error('AuthContext: API instance or headers not properly initialized');
              }
            } catch (headerError) {
              console.error('AuthContext: Error setting token in API headers:', headerError);
            }
            console.log('AuthContext: User authenticated successfully from storage');
          } else {
            console.error('AuthContext: User data couldn\'t be parsed');
            setAuthState('unauthenticated');
          }
        } else {
          if (!storedToken) console.log('AuthContext: No authentication token found');
          if (!storedUser) console.log('AuthContext: No user data found');
          setAuthState('unauthenticated');
        }
      } catch (err) {
        console.error('AuthContext: Error loading stored authentication data:', err);
        setAuthState('unauthenticated');
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
      console.log('AuthContext: Attempting login for', email);
      const data = await authService.login(email, password);
      
      if (!data) {
        throw new Error('No data returned from login');
      }
      
      console.log('AuthContext: Login response received:', 
        JSON.stringify({
          hasToken: !!data.token,
          hasUser: !!data.user,
          userKeys: data.user ? Object.keys(data.user) : []
        })
      );
      
      // Validate the data
      if (!data.token) {
        throw new Error('No token received from server');
      }
      
      if (!data.user) {
        throw new Error('No user data received from server');
      }
      
      // Normalize the user data
      const normalizedUser = normalizeUserData(data.user);
      
      // Set state
      setUser(normalizedUser);
      setToken(data.token);
      setAuthState('authenticated');

      console.log('AuthContext: User successfully logged in:', 
        JSON.stringify({
          id: normalizedUser.id || normalizedUser._id,
          email: normalizedUser.email
        })
      );

      // Save user data to storage
      await saveUserToStorage(normalizedUser, data.token);
      
      // API isteklerinde kullanılacak token ayarı
      try {
        if (api && api.defaults && api.defaults.headers) {
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          console.log('AuthContext: Token set in API headers after login');
        } else {
          console.error('AuthContext: API instance or headers not properly initialized');
        }
      } catch (headerError) {
        console.error('AuthContext: Error setting token in API headers after login:', headerError);
      }

      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Giriş yapılırken bir hata oluştu';
      console.error('AuthContext: Login error:', errorMessage);
      setError(errorMessage);
      setAuthState('unauthenticated');
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
      
      // Normalize the user data
      const normalizedUser = normalizeUserData(data.user);
      
      setUser(normalizedUser);
      setToken(data.token);
      setAuthState('authenticated');

      console.log('AuthContext: Yeni kullanıcı kaydedildi:', normalizedUser);

      // Save user data to storage
      await saveUserToStorage(normalizedUser, data.token);
      
      // API isteklerinde kullanılacak token ayarı
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      return data;
    } catch (err) {
      console.error('AuthContext: Register error:', err);
      setError(err.response?.data?.message || 'Kayıt olurken bir hata oluştu');
      setAuthState('unauthenticated');
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
      const userKeys = ['user', 'user_data', 'userData'];
      const tokenKeys = ['authToken', 'token'];
      
      for (const key of userKeys) {
        await AsyncStorage.removeItem(key);
      }
      
      for (const key of tokenKeys) {
        await AsyncStorage.removeItem(key);
      }
      
      // State'leri temizleme
      setUser(null);
      setToken(null);
      setAuthState('unauthenticated');
      
      // API header'ından token'ı kaldırma
      delete api.defaults.headers.common['Authorization'];
      
      console.log('AuthContext: Kullanıcı çıkış yaptı');
    } catch (err) {
      console.error('AuthContext: Çıkış yapılırken bir hata oluştu:', err);
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
        // Normalize the user data
        const normalizedUser = normalizeUserData(data.user);
        
        setUser(normalizedUser);
        setToken(data.token);
        setAuthState('authenticated');
        
        // Save user data to storage
        await saveUserToStorage(normalizedUser, data.token);
        
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
      
      // Normalize the user data
      const normalizedUser = normalizeUserData(updatedUser);
      
      setUser(normalizedUser);
      
      // Save user data to storage
      await saveUserToStorage(normalizedUser, null);
      
      console.log('AuthContext: Kullanıcı profili güncellendi:', normalizedUser);
      return normalizedUser;
    } catch (err) {
      console.error('AuthContext: Profile update error:', err);
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
  
  // Refresh user data - load from API first, then try storage if API fails
  const refreshUserData = async () => {
    try {
      console.log('AuthContext: Refreshing user data');
      setLoading(true);
      
      // First try to get current user data from API if possible
      let userData = null;
      let currentToken = token;
      
      try {
        // Make sure we have a token for the API request
        if (!currentToken) {
          const authTokenKeys = ['authToken', 'token'];
          for (const key of authTokenKeys) {
            const storedToken = await AsyncStorage.getItem(key);
            if (storedToken) {
              currentToken = storedToken;
              break;
            }
          }
          
          // If we found a token in storage, update the headers
          if (currentToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
          }
        }
        
        if (currentToken) {
          const currentUserResponse = await authService.getCurrentUser();
          if (currentUserResponse && currentUserResponse.user) {
            userData = currentUserResponse.user;
            console.log('AuthContext: Got fresh user data from API');
            
            // Normalize the user data
            userData = normalizeUserData(userData);
            
            // Save the updated user data to storage
            await saveUserToStorage(userData, currentToken);
          }
        } else {
          console.log('AuthContext: No token available for API refresh');
        }
      } catch (apiError) {
        console.log('AuthContext: Could not refresh from API, trying AsyncStorage:', apiError.message);
      }
      
      // If API call failed, try AsyncStorage
      if (!userData) {
        // Try all possible storage keys
        const userDataKeys = ['user', 'user_data', 'userData'];
        for (const key of userDataKeys) {
          const storedUser = await AsyncStorage.getItem(key);
          if (storedUser) {
            try {
              userData = JSON.parse(storedUser);
              console.log(`AuthContext: Refreshed user data from AsyncStorage key '${key}'`);
              
              // Normalize the user data
              userData = normalizeUserData(userData);
              break;
            } catch (parseError) {
              console.error(`AuthContext: Error parsing user data from key '${key}':`, parseError);
            }
          }
        }
      }
      
      if (userData) {
        // Update context state
        setUser(userData);
        if (currentToken) setToken(currentToken);
        setAuthState('authenticated');
        return userData;
      } else {
        console.error('AuthContext: No user data found when refreshing');
        setAuthState('unauthenticated');
        return null;
      }
    } catch (err) {
      console.error('AuthContext: Error refreshing user data:', err);
      setAuthState('unauthenticated');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Check if the user is authenticated with both user ID and token
  const isUserAuthenticated = () => {
    const hasValidUser = !!(user && (user.id || user._id));
    const hasValidToken = !!token;
    const isLoggedIn = hasValidUser && hasValidToken;
    
    console.log('AuthContext: Authentication check:', 
      JSON.stringify({
        hasUser: !!user,
        hasValidUserId: hasValidUser, 
        hasToken: hasValidToken,
        isLoggedIn
      })
    );
    
    return isLoggedIn;
  };

  // AuthContext değerleri
  const value = {
    user,
    token,
    loading,
    error,
    authState,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateProfile,
    changePassword,
    refreshUserData,
    isLoggedIn: isUserAuthenticated()
  };

  // Log authentication state changes
  useEffect(() => {
    console.log('AuthContext: Authentication state changed:', 
      JSON.stringify({
        hasUser: !!user,
        userId: user?.id || user?._id || 'none',
        hasToken: !!token,
        authState,
        isLoggedIn: isUserAuthenticated()
      })
    );
  }, [user, token, authState]);

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