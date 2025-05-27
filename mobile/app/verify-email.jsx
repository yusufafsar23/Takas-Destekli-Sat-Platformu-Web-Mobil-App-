import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyEmail, isLoading } = useAuth();
  
  // Get email from params or context
  const email = params.email || '';
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }
    
    if (!email) {
      Alert.alert('Hata', 'E-posta adresi bulunamadı.');
      return;
    }
    
    setLoading(true);
    
    try {
      await verifyEmail(code, email);
      Alert.alert(
        'Başarılı',
        'E-posta adresiniz başarıyla doğrulandı!',
        [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      Alert.alert('Hata', error.message || 'Doğrulama işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>E-posta Doğrulama</ThemedText>
      </View>
      
      <View style={styles.form}>
        <ThemedText style={styles.subtitle}>
          E-posta adresinize gönderilen 6 haneli doğrulama kodunu giriniz
        </ThemedText>
        
        {email ? (
          <ThemedText style={styles.emailInfo}>
            {email} adresine gönderilen kod
          </ThemedText>
        ) : null}
        
        <TextInput
          style={styles.input}
          placeholder="Doğrulama Kodu (6 haneli)"
          placeholderTextColor="#888"
          value={code}
          onChangeText={text => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={true}
        />
        
        <TouchableOpacity 
          style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Doğrula</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.resendButton}
          onPress={() => Alert.alert('Bilgi', 'Doğrulama kodu tekrar gönderildi.')}
        >
          <ThemedText style={styles.resendText}>Kodu tekrar gönder</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emailInfo: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 18,
    letterSpacing: 5,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#a5d6a7',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 15,
    padding: 10,
  },
  resendText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
}); 