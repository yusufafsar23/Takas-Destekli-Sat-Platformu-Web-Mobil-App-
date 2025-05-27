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

  // Hızlı giriş fonksiyonu
  const handleQuickLogin = async () => {
    const quickEmail = 'galipalpsoy1@gmail.com';
    const quickPassword = 'yusuf123';
    
    setEmail(quickEmail);
    setPassword(quickPassword);
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    
    setLoading(true);
    
    try {
      console.log('Quick login with:', { email: quickEmail });
      const response = await authService.login(quickEmail, quickPassword);
      console.log('Quick login successful');
      
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
      console.error('Hızlı giriş yaparken hata:', error);
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
          
          <TouchableOpacity 
            style={styles.quickLoginButton} 
            onPress={handleQuickLogin}
            disabled={loading}
          >
            <Text style={styles.quickLoginText}>
              <Ionicons name="flash-outline" size={16} color="#0066cc" /> Hızlı Giriş (Test)
            </Text>
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#0066cc',
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  quickLoginButton: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#0066cc',
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
  },
  quickLoginText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
    marginRight: 5,
  },
  registerLink: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 