import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen email ve şifre alanlarını doldurunuz.');
      return;
    }

    try {
      await login(email, password, rememberMe);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Giriş Hatası', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen options={{ 
        title: 'Giriş Yap',
        headerBackVisible: true,
      }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <Image 
            source={require('@/assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          <ThemedText type="title" style={styles.title}>Takas Platformu</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>Hesabınıza giriş yapın</ThemedText>
          
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#888"
            />
            
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkboxInner, rememberMe && styles.checkboxActive]} />
              </TouchableOpacity>
              <ThemedText type="default">Beni Hatırla</ThemedText>
            </View>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push('/auth/forgot-password')}
            >
              <ThemedText type="default" style={styles.forgotPasswordText}>
                Şifremi Unuttum
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.registerContainer}>
            <ThemedText type="default">Hesabınız yok mu? </ThemedText>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.registerLink}>
                  Kayıt Ol
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  checkboxActive: {
    backgroundColor: '#0a7ea4',
  },
  button: {
    height: 50,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#0a7ea4',
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  registerLink: {
    color: '#0a7ea4',
  },
}); 