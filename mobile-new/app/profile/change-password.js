import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return false;
    }

    if (formData.newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter uzunluğunda olmalıdır');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      Alert.alert('Hata', 'Yeni şifre mevcut şifreyle aynı olamaz');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      await changePassword(formData.currentPassword, formData.newPassword);
      
      Alert.alert(
        'Başarılı',
        'Şifreniz başarıyla değiştirildi',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      
      let errorMessage = 'Şifre değiştirilirken bir hata oluştu. Lütfen tekrar deneyin.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Mevcut şifreniz yanlış';
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.title}>Şifre Değiştir</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mevcut Şifre</Text>
          <TextInput
            style={styles.input}
            value={formData.currentPassword}
            onChangeText={(text) => handleInputChange('currentPassword', text)}
            placeholder="Mevcut şifrenizi girin"
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Yeni Şifre</Text>
          <TextInput
            style={styles.input}
            value={formData.newPassword}
            onChangeText={(text) => handleInputChange('newPassword', text)}
            placeholder="Yeni şifrenizi girin"
            secureTextEntry
          />
          <Text style={styles.helperText}>Şifre en az 6 karakter uzunluğunda olmalıdır</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Yeni Şifre Tekrar</Text>
          <TextInput
            style={styles.input}
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            placeholder="Yeni şifrenizi tekrar girin"
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Şifreyi Değiştir</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 