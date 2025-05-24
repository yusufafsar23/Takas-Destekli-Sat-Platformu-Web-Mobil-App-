import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';

const LoginScreen = ({ route, navigation }) => {
  // Get any redirect parameters if they exist
  const { redirectTo, productId } = route.params || {};
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const validateEmail = (text) => {
    setEmail(text);
    setGeneralError('');
    
    if (!text) {
      setEmailError('E-posta adresi gerekli');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      setEmailError('Geçerli bir e-posta adresi girin');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const validatePassword = (text) => {
    setPassword(text);
    setGeneralError('');
    
    if (!text) {
      setPasswordError('Şifre gerekli');
      return false;
    }
    
    if (text.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // Formun geçerliliğini kontrol et
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    setLoading(true);
    setGeneralError('');
    
    try {
      // Test account handling
      if (email === 'test@example.com' && password === 'test123') {
        console.log('Using test account credentials');
        // Create a mock response for the test account
        const testUserData = {
          _id: 'test123',
          username: 'testuser',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'user',
          emailVerified: true
        };
        
        await AsyncStorage.setItem('authToken', 'test-token-123');
        await AsyncStorage.setItem('user', JSON.stringify(testUserData));
        
        // Offline modu devre dışı bırak
        await AsyncStorage.setItem('offlineMode', 'false');
        
        // Handle redirect if needed
        if (redirectTo === 'ProductDetail' && productId) {
          navigation.replace('ProductDetail', { productId });
          return;
        }
        
        // Otherwise navigate to home screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeTabs' }],
        });
        
        return;
      }
      
      // Backend'e giriş isteği gönder
      console.log('Attempting login with credentials:', { email });
      const response = await authService.login(email, password);
      console.log('Login successful');
      
      // Handle redirect if needed
      if (redirectTo === 'ProductDetail' && productId) {
        console.log('Redirecting to ProductDetail with productId:', productId);
        navigation.replace('ProductDetail', { productId });
        return;
      }
      
      // Default navigation to home
      console.log('Navigating to HomeTabs');
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeTabs' }],
      });
    } catch (error) {
      console.error('Giriş yaparken hata:', error);
      
      // Hata mesajını string olarak al
      let errorMessage = error.message || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      setGeneralError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logo}
            defaultSource={require('../assets/icon.png')}
          />
          <Text style={styles.logoText}>Takas Platform</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
          
          {generalError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}
          
          <Input
            label="E-posta"
            value={email}
            onChangeText={validateEmail}
            placeholder="E-posta adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            leftIcon={<Ionicons name="mail-outline" size={20} color="#666" />}
          />
          
          <Input
            label="Şifre"
            value={password}
            onChangeText={validatePassword}
            placeholder="Şifrenizi girin"
            secureTextEntry={secureTextEntry}
            error={passwordError}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#666" />}
            rightIcon={
              <TouchableOpacity onPress={toggleSecureTextEntry}>
                <Ionicons
                  name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            }
          />
          
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => Alert.alert('Bilgi', 'Şifre sıfırlama işlevi geliştirme aşamasında')}
          >
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>
          
          <Button
            text={loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            onPress={handleLogin}
            isLoading={loading}
            disabled={loading}
            style={styles.loginButton}
          />
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.testAccountContainer}>
            <Text style={styles.testAccountTitle}>Test Hesabı:</Text>
            <Text style={styles.testAccountText}>Email: test@example.com</Text>
            <Text style={styles.testAccountText}>Şifre: test123</Text>
            <TouchableOpacity 
              style={styles.testLoginButton}
              onPress={() => {
                setEmail('test@example.com');
                setPassword('test123');
                setEmailError('');
                setPasswordError('');
                setGeneralError('');
              }}
            >
              <Text style={styles.testLoginButtonText}>Test Hesabı ile Doldur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 10,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  testAccountContainer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    alignItems: 'center'
  },
  testAccountTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333'
  },
  testAccountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  testLoginButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5
  },
  testLoginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default LoginScreen; 