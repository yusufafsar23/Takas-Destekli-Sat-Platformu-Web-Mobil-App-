import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../services/authService';

export default function VerifyEmail() {
  const { token } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        setError('Doğrulama token\'ı bulunamadı');
        setIsLoading(false);
        return;
      }

      try {
        await authService.verifyEmail(token);
        setIsSuccess(true);
      } catch (err) {
        console.error('E-posta doğrulama hatası:', err);
        setError(err.response?.data?.message || 'E-posta doğrulaması başarısız oldu');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmailToken();
  }, [token]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>E-posta doğrulanıyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.statusContainer}>
          <Text style={styles.errorTitle}>Doğrulama Başarısız</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorInfo}>
            Doğrulama bağlantınızın süresi dolmuş veya geçersiz olabilir. Lütfen tekrar deneyiniz.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.buttonText}>Giriş Sayfasına Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered]}>
      <View style={styles.statusContainer}>
        <Text style={styles.successTitle}>E-posta Doğrulandı!</Text>
        <Text style={styles.successMessage}>
          E-posta adresiniz başarıyla doğrulandı. Artık hesabınızla giriş yapabilirsiniz.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Giriş Yap</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    lineHeight: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    color: '#D32F2F',
  },
  errorInfo: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 