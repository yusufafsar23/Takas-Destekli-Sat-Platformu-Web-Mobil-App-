import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const ProfileEditScreen = ({ route, navigation }) => {
  const { user: routeUser } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    phone: '',
    address: '',
    bio: ''
  });

  // Errors state
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Pre-fill form with user data from route params
    if (routeUser) {
      setFormData({
        name: routeUser.name?.split(' ')[0] || '',
        surname: routeUser.name?.split(' ').slice(1).join(' ') || '',
        phone: routeUser.phone || '',
        address: routeUser.address || '',
        bio: routeUser.bio || ''
      });
    } else {
      // If no user provided in route, get user from AsyncStorage
      const loadUserData = async () => {
        try {
          setLoading(true);
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const nameParts = parsedUser.name?.split(' ') || ['', ''];
            setFormData({
              name: nameParts[0] || '',
              surname: nameParts.slice(1).join(' ') || '',
              phone: parsedUser.phone || '',
              address: parsedUser.address || '',
              bio: parsedUser.bio || ''
            });
          }
        } catch (error) {
          console.error('User bilgisi alınamadı:', error);
          Alert.alert('Hata', 'Kullanıcı bilgileri yüklenemedi.');
        } finally {
          setLoading(false);
        }
      };
      
      loadUserData();
    }
  }, [routeUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Ad alanı boş bırakılamaz';
    }
    
    if (!formData.surname.trim()) {
      newErrors.surname = 'Soyad alanı boş bırakılamaz';
    }
    
    if (formData.phone && !/^\+?[0-9\s]{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Combine name and surname
      const fullName = `${formData.name} ${formData.surname}`.trim();
      
      // Prepare user data for update
      const userData = {
        name: fullName,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio
      };
      
      console.log('Attempting to update profile with data:', userData);
      
      // Call API to update user data
      const response = await authService.updateUserProfile(userData);
      console.log('Profile update response:', response);
      
      if (response && response.success) {
        // Update local storage
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const updatedUser = { ...parsedUser, ...userData };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('User data updated in AsyncStorage');
        }
        
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi', [
          { 
            text: 'Tamam', 
            onPress: () => navigation.goBack() 
          }
        ]);
      } else {
        console.error('Profile update failed with response:', response);
        Alert.alert('Hata', response?.message || 'Profil güncellenemedi. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      console.error('Hata detayları:', error.response?.data || error.message);
      
      // Show a more helpful error message if possible
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Profil güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.';
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Bilgiler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
          
          <Input
            label="Ad"
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
            placeholder="Adınız"
            error={errors.name}
            autoCapitalize="words"
          />
          
          <Input
            label="Soyad"
            value={formData.surname}
            onChangeText={(text) => handleInputChange('surname', text)}
            placeholder="Soyadınız"
            error={errors.surname}
            autoCapitalize="words"
          />
          
          <Input
            label="Telefon"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            placeholder="Telefon numaranız"
            error={errors.phone}
            keyboardType="phone-pad"
          />
          
          <Input
            label="Adres"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            placeholder="Açık adresiniz"
            error={errors.address}
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Hakkımda</Text>
          
          <Input
            label="Biyografi"
            value={formData.bio}
            onChangeText={(text) => handleInputChange('bio', text)}
            placeholder="Kendinizi tanıtan bir yazı"
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.buttonsContainer}>
          <Button 
            text="Vazgeç" 
            onPress={() => navigation.goBack()} 
            type="outline"
            style={styles.button}
          />
          
          <Button 
            text={saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"} 
            onPress={handleSave}
            disabled={saving}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
  }
});

export default ProfileEditScreen; 