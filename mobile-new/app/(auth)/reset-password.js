import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../services/authService';

export default function ResetPassword() {
  const { token } = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isTokenChecking, setIsTokenChecking] = useState(true);
  const [isResetSuccessful, setIsResetSuccessful] = useState(false);

  // Token doğrulama
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsTokenChecking(false);
        return;
      }

      try {
        await authService.validateToken(token);
        setIsTokenValid(true);
      } catch (error) {
        console.error('Token doğrulama hatası:', error);
        setIsTokenValid(false);
      } finally {
        setIsTokenChecking(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async () => {
    // Form doğrulama
    if (!newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter uzunluğunda olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    try {
      setIsLoading(true);
      await authService.resetPassword(token, newPassword);
      setIsResetSuccessful(true);
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      Alert.alert(
        'Hata',
        error.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Token kontrol edilirken yükleniyor ekranı
  if (isTokenChecking) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Token doğrulanıyor...</Text>
      </View>
    );
  }

  // Geçersiz token durumu
  if (!isTokenValid) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Geçersiz veya Süresi Dolmuş Token</Text>
        <Text style={styles.errorText}>
          Şifre sıfırlama bağlantınızın süresi dolmuş veya geçersiz. Lütfen yeni bir şifre sıfırlama isteği gönderin.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/forgot-password')}
        >
          <Text style={styles.backButtonText}>Şifremi Unuttum Sayfasına Git</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Şifre sıfırlama başarılı
  if (isResetSuccessful) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.successTitle}>Şifre Başarıyla Sıfırlandı</Text>
        <Text style={styles.successText}>
          Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
        </Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal form görünümü
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Şifre Sıfırlama</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.description}>
          Lütfen yeni şifrenizi girin.
        </Text>
        
        <TextInput
          style={styles.input}
          placeholder="Yeni Şifre"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Şifre Tekrar"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Şifreyi Sıfırla</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formContainer: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 20,
    color: '#666',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#D32F2F',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2E7D32',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 