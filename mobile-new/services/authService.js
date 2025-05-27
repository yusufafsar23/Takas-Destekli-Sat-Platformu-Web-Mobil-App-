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
        // Kullanıcı verisini normalize et
        const normalizedUser = {
          ...response.user,
          _id: response.user._id || response.user.id,
          id: response.user._id || response.user.id
        };
        
        // fullName alanından name ve surname alanlarını oluştur (yerel kullanım için)
        if (normalizedUser.fullName) {
          const nameParts = normalizedUser.fullName.split(' ');
          if (nameParts.length > 0) {
            normalizedUser.name = nameParts[0];
            normalizedUser.surname = nameParts.slice(1).join(' ');
          }
        }
        
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
      // Make a simple JSON request without handling profile image
      const response = await api.post('/users/register', userData);
      
      // Token ve kullanıcı bilgilerini kaydet
      if (response && response.token) {
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('token', response.token); // Yedek token storage
        
        if (response.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.refreshToken);
        }
        
        if (response.user) {
          // Kullanıcı verisini normalize et
          const normalizedUser = {
            ...response.user,
            _id: response.user._id || response.user.id,
            id: response.user._id || response.user.id
          };
          
          // fullName alanından name ve surname alanlarını oluştur (yerel kullanım için)
          if (normalizedUser.fullName) {
            const nameParts = normalizedUser.fullName.split(' ');
            if (nameParts.length > 0) {
              normalizedUser.name = nameParts[0];
              normalizedUser.surname = nameParts.slice(1).join(' ');
            }
          }
          
          const userStr = JSON.stringify(normalizedUser);
          await AsyncStorage.setItem('user', userStr);
          await AsyncStorage.setItem('userData', userStr); // Yedek user storage
        }
        
        // Offline modu devre dışı bırak, çünkü başarılı bir kayıt olduk
        await AsyncStorage.setItem('offlineMode', 'false');
      }
      
      return response;
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
  async verifyEmail(code, email) {
    try {
      const response = await api.post('/users/verify-email', { code, email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Yeni doğrulama kodu gönderme
  async resendVerificationCode(email) {
    try {
      const response = await api.post('/users/resend-verification', { email });
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

      const response = await api.patch('/users/profile', profileData, {
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
      
      // Backend'in beklediği formata dönüştür
      // Sadece backend'in izin verdiği alanları gönder: 'username', 'fullName', 'phone', 'address', 'profilePicture'
      const backendData = {};
      
      // name ve surname -> fullName olarak birleştir
      if (userData.name) {
        backendData.fullName = userData.name;
        if (userData.surname) {
          backendData.fullName += ' ' + userData.surname;
        }
      }
      
      // Diğer izin verilen alanları ekle
      if (userData.phone) backendData.phone = userData.phone;
      if (userData.address) backendData.address = userData.address;
      if (userData.profilePicture) backendData.profilePicture = userData.profilePicture;
      
      console.log('Backend format:', backendData);
      
      // Handle profile image if provided
      let formData = null;
      let response = null;
      
      if (userData.profileImage && userData.profileImage.startsWith('file:')) {
        // If profile image is a local file URI, create FormData
        formData = new FormData();
        
        // Add text fields
        Object.keys(backendData).forEach(key => {
          if (key !== 'profileImage') {
            formData.append(key, backendData[key]);
          }
        });
        
        // Add profile image
        const filename = userData.profileImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('profileImage', {
          uri: userData.profileImage,
          name: filename,
          type
        });
      }
      
      // Doğrudan API çağrısı yap, hata olsa bile offline moda geçme
      console.log('Sending PATCH request to /users/profile');
      response = await api.patch(
        '/users/profile', 
        formData || backendData,
        formData ? {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        } : undefined
      );
      console.log('Profile update response:', response);
      
      // API yanıtını normalleştir
      if (response && response.data) {
        response = response.data;
      }
      
      // Sunucudan gelen kullanıcı verisini yerel depolamaya kaydet
      if (response && response.user) {
        // Local verileri güncellerken bio'yu da kaydet (sadece yerel)
        const localUserData = {
          ...backendData,
          ...response.user,
          bio: userData.bio // Bio alanını yerel olarak sakla
        };
        await this.updateLocalUserData(localUserData);
        return { success: true, user: localUserData };
      }
      
      // Sunucudan kullanıcı verisi gelmezse, gönderilen verileri kullan
      const localUser = {
        ...backendData,
        bio: userData.bio // Bio alanını yerel olarak sakla
      };
      await this.updateLocalUserData(localUser);
      return { success: true, user: localUser };
      
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
  
  // Yerel kullanıcı verilerini güncelleme yardımcı metodu
  async updateLocalUserData(userData) {
    try {
      // AsyncStorage'daki kullanıcı verisini güncelle
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        
        // Kullanıcı verisini güncelle
        let updatedUser = { ...parsedUser };
        
        // fullName alanını işle
        if (userData.fullName) {
          updatedUser.fullName = userData.fullName;
        } else if (userData.name && userData.surname) {
          updatedUser.fullName = `${userData.name} ${userData.surname}`.trim();
        } else if (userData.name) {
          updatedUser.fullName = userData.name;
        }
        
        // Diğer alanları güncelle
        if (userData.phone !== undefined) updatedUser.phone = userData.phone;
        if (userData.address !== undefined) updatedUser.address = userData.address;
        if (userData.bio !== undefined) updatedUser.bio = userData.bio;
        if (userData.profilePicture !== undefined) updatedUser.profilePicture = userData.profilePicture;
        
        // Yerel kullanım için name ve surname alanlarını da sakla
        if (userData.name !== undefined) updatedUser.name = userData.name;
        if (userData.surname !== undefined) updatedUser.surname = userData.surname;
        
        // Güncellenmiş veriyi kaydet
        const updatedUserStr = JSON.stringify(updatedUser);
        await AsyncStorage.setItem('user', updatedUserStr);
        console.log('Kullanıcı verisi AsyncStorage\'da güncellendi');
        
        // Yedek storage'ı da güncelle
        await AsyncStorage.setItem('userData', updatedUserStr);
      }
    } catch (storageError) {
      console.error('AsyncStorage güncelleme hatası:', storageError);
    }
  },
  
  // Helper method to process profile update response
  processProfileUpdateResponse(response, userData) {
    // Ensure response exists
    if (!response) {
      console.log('No response received, creating a local success response');
      this.updateLocalUserData(userData);
      return { success: true, user: userData };
    }
    
    // Check if we have a valid response
    if (response.data) {
      // If user object exists in response, use it to update local storage
      if (response.data.user) {
        AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('Updated user data in storage with server response');
      } else {
        // If no user object but success is true, update with provided data
        if (response.data.success) {
          this.updateLocalUserData(userData);
        }
      }
      
      return response.data;
    } else {
      // If no data property, treat as the raw response
      if (response.user) {
        AsyncStorage.setItem('user', JSON.stringify(response.user));
        console.log('Updated user data in storage with server response');
      } else {
        // No user object, update with provided data
        this.updateLocalUserData(userData);
      }
      
      // Add success flag if not present
      if (response.success === undefined) {
        response.success = true;
      }
      
      return response;
    }
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

      console.log('Fetching current user profile from server');
      const response = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Current user response:', response);

      // API yanıtını normalleştir
      let userData = response;
      if (response && response.user) {
        userData = response.user;
      }

      if (userData) {
        // Kullanıcı verisini normalize et
        const normalizedUser = {
          ...userData,
          _id: userData._id || userData.id,
          id: userData._id || userData.id
        };
        
        // fullName alanından name ve surname alanlarını oluştur (yerel kullanım için)
        if (normalizedUser.fullName) {
          const nameParts = normalizedUser.fullName.split(' ');
          if (nameParts.length > 0) {
            normalizedUser.name = nameParts[0];
            normalizedUser.surname = nameParts.slice(1).join(' ');
          }
        }
        
        const userStr = JSON.stringify(normalizedUser);
        await AsyncStorage.setItem('user', userStr);
        await AsyncStorage.setItem('userData', userStr);
        console.log('User data updated from server:', normalizedUser);
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