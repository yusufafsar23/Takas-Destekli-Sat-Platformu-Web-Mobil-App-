import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleRegister = async () => {
    // Form validation
    if (!username || !email || !password || !confirmPassword || !fullName) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz.');
      return;
    }

    try {
      await register({
        username,
        email,
        password,
        fullName,
        phone
      });
      Alert.alert(
        'Kayıt Başarılı', 
        'Hesabınız oluşturuldu. Lütfen e-posta adresinizi doğrulayın.',
        [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      Alert.alert('Kayıt Hatası', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen options={{ 
        title: 'Kayıt Ol',
        headerBackVisible: true,
      }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>Yeni Hesap Oluştur</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>Hemen kayıt olun ve takaslamaya başlayın</ThemedText>
          
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı Adı*"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="E-posta*"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad*"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Telefon"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Şifre*"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar*"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#888"
            />
            
            <ThemedText type="small" style={styles.infoText}>
              * ile işaretli alanlar zorunludur.
            </ThemedText>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                {isLoading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.loginContainer}>
            <ThemedText type="default">Zaten hesabınız var mı? </ThemedText>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.loginLink}>
                  Giriş Yap
                </ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  infoText: {
    marginBottom: 16,
    fontStyle: 'italic',
  },
  button: {
    height: 50,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  loginLink: {
    color: '#0a7ea4',
  },
}); 