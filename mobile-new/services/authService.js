import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const authService = {
  // Kullanıcı girişi
  async login(email, password) {
    try {
      console.log('Login attempt for email:', email);
      
      // Offline modu devre dışı bırak
      await AsyncStorage.setItem('offlineMode', 'false');
      
      // API endpoint'i düzelt
      const response = await api.post('/users/login', { email, password });
      console.log('Login response:', response);
      
      if (!response || !response.token) {
        throw new Error('Invalid login response - missing token');
      }

      // Token ve kullanıcı bilgilerini kaydet
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('token', response.token); // Yedek token storage
      console.log('Auth token saved');

      if (response.refreshToken) {
        await AsyncStorage.setItem('refreshToken', response.refreshToken);
        console.log('Refresh token saved');
      }

      // Kullanıcı bilgilerini normalize et ve kaydet
      if (response.user) {
        const normalizedUser = {
          ...response.user,
          _id: response.user._id || response.user.id,
          id: response.user._id || response.user.id
        };
        const userStr = JSON.stringify(normalizedUser);
        await AsyncStorage.setItem('user', userStr);
        await AsyncStorage.setItem('userData', userStr); // Yedek user storage
        console.log('User data saved:', normalizedUser);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      
      // Hata mesajını düzgün formatta hazırla
      let errorMessage = 'Giriş yapılırken bir hata oluştu';
      
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 401) {
          errorMessage = 'E-posta adresi veya şifre hatalı';
        } else if (error.response.status === 404) {
          errorMessage = 'Sunucu bağlantısı kurulamadı';
        }
      } else if (error.request) {
        errorMessage = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.';
      }
      
      throw new Error(errorMessage);
    }
  },

  // Kullanıcı kaydı
  async register(userData) {
    try {
      const response = await api.post('/users/register', userData);
      
      // Token ve kullanıcı bilgilerini kaydet
      if (response.data && response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        
        if (response.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // Offline modu devre dışı bırak, çünkü başarılı bir kayıt olduk
        await AsyncStorage.setItem('offlineMode', 'false');
      }
      
      return response.data;
    } catch (error) {
      console.error('Register hatası:', error);
      throw error;
    }
  },

  // Kullanıcı çıkışı
  async logout() {
    try {
      // Önce API çağrısı yap
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          await api.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (apiError) {
        console.log('Logout API error:', apiError);
      }

      // Tüm auth verilerini temizle
      await AsyncStorage.multiRemove([
        'authToken',
        'token',
        'refreshToken',
        'user',
        'userData',
        'user_data'
      ]);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Şifremi unuttum
  async forgotPassword(email) {
    try {
      const response = await api.post('/users/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Şifre sıfırlama
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/users/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Email doğrulama
  async verifyEmail(token) {
    try {
      const response = await api.post('/users/verify-email', { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Profil güncelleme
  async updateProfile(profileData) {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await api.put('/users/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response && response.user) {
        const normalizedUser = {
          ...response.user,
          _id: response.user._id || response.user.id,
          id: response.user._id || response.user.id
        };
        const userStr = JSON.stringify(normalizedUser);
        await AsyncStorage.setItem('user', userStr);
        await AsyncStorage.setItem('userData', userStr);
      }

      return response;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  },
  
  // Kullanıcı profil bilgilerini güncelleme (isim, telefon, adres vb.)
  async updateUserProfile(userData) {
    try {
      console.log('Sending profile update request:', userData);
      
      // Try different endpoints to handle potential server variations
      try {
        // First try the standard endpoint
        const response = await api.patch('/users/profile', userData);
        console.log('Profile update response status (standard endpoint):', response.status);
        
        // Process response and return
        return this.processProfileUpdateResponse(response, userData);
      } catch (firstError) {
        console.error('First endpoint failed:', firstError.message);
        
        // Try alternative endpoint if first fails
        try {
          const response = await api.patch('/users', userData);
          console.log('Profile update response status (alternative endpoint):', response.status);
          
          // Process response and return
          return this.processProfileUpdateResponse(response, userData);
        } catch (secondError) {
          console.error('Second endpoint failed:', secondError.message);
          
          // One more alternative endpoint
          try {
            const response = await api.put('/users/profile', userData);
            console.log('Profile update response status (PUT method):', response.status);
            
            // Process response and return
            return this.processProfileUpdateResponse(response, userData);
          } catch (thirdError) {
            console.error('All endpoints failed:', thirdError.message);
            throw firstError; // Throw the original error
          }
        }
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      console.error('Hata detayları:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },
  
  // Helper method to process profile update response
  processProfileUpdateResponse(response, userData) {
    // Check if we have a valid response
    if (response.data) {
      // If user object exists in response, use it to update local storage
      if (response.data.user) {
        AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('Updated user data in storage with server response');
      } else {
        // If no user object but success is true, update with provided data
        if (response.data.success) {
          AsyncStorage.getItem('user').then(userJson => {
            if (userJson) {
              const currentUser = JSON.parse(userJson);
              const updatedUser = { ...currentUser, ...userData };
              AsyncStorage.setItem('user', JSON.stringify(updatedUser));
              console.log('Updated user data in storage with provided data');
            }
          }).catch(err => console.error('Error updating storage:', err));
        }
      }
    }
    
    // Add success flag if not present
    if (response.data && response.data.success === undefined) {
      response.data.success = true;
    }
    
    return response.data;
  },
  
  // Belirli bir kullanıcının profilini alma
  async getUserProfile(userId) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`${userId} ID'li kullanıcı bilgileri alma hatası:`, error);
      throw error;
    }
  },

  // Şifre değiştirme
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/users/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Kullanıcı bilgilerini alma
  async getCurrentUser() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response) {
        const normalizedUser = {
          ...response,
          _id: response._id || response.id,
          id: response._id || response.id
        };
        const userStr = JSON.stringify(normalizedUser);
        await AsyncStorage.setItem('user', userStr);
        await AsyncStorage.setItem('userData', userStr);
        return normalizedUser;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  // Token kontrolü
  async validateToken(token) {
    try {
      const response = await api.post('/auth/validate-token', { token });
      return response.isValid;
    } catch (error) {
      return false;
    }
  },
  
  // Oturum kontrolü
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const isValid = await this.validateToken(token);
      if (!isValid) {
        // Token geçersizse tüm auth verilerini temizle
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};

export default authService; 