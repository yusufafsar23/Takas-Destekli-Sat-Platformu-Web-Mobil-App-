import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import authService from '../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Hata durumları
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const validateName = (text) => {
    setName(text);
    
    if (!text) {
      setNameError('Ad Soyad gerekli');
      return false;
    }
    
    if (text.length < 3) {
      setNameError('Ad Soyad en az 3 karakter olmalıdır');
      return false;
    }
    
    setNameError('');
    return true;
  };

  const validateUsername = (text) => {
    setUsername(text);
    
    if (!text) {
      setUsernameError('Kullanıcı adı gerekli');
      return false;
    }
    
    if (text.length < 3) {
      setUsernameError('Kullanıcı adı en az 3 karakter olmalıdır');
      return false;
    }
    
    setUsernameError('');
    return true;
  };

  const validateEmail = (text) => {
    setEmail(text);
    
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
    
    if (!text) {
      setPasswordError('Şifre gerekli');
      return false;
    }
    
    if (text.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır');
      return false;
    }
    
    setPasswordError('');
    
    // Şifre değiştiğinde şifre onayını da kontrol et
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword);
    }
    
    return true;
  };

  const validateConfirmPassword = (text) => {
    setConfirmPassword(text);
    
    if (!text) {
      setConfirmPasswordError('Şifre onayı gerekli');
      return false;
    }
    
    if (text !== password) {
      setConfirmPasswordError('Şifreler eşleşmiyor');
      return false;
    }
    
    setConfirmPasswordError('');
    return true;
  };

  const validatePhone = (text) => {
    setPhone(text);
    
    if (!text) {
      setPhoneError('Telefon numarası gerekli');
      return false;
    }
    
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(text.replace(/\D/g, ''))) {
      setPhoneError('Geçerli bir telefon numarası girin');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleRegister = async () => {
    // Formun geçerliliğini kontrol et
    const isNameValid = validateName(name);
    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isPhoneValid = validatePhone(phone);
    
    if (!isNameValid || !isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isPhoneValid) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare user data
      const userData = {
        username,
        fullName: name,
        email,
        password,
        phone
      };
      
      // Register the user
      const response = await authService.register(userData);
      
      if (response && response.token) {
        // Başarılı kayıt mesajı göster
        Alert.alert(
          'Kayıt Başarılı',
          'E-posta adresinize doğrulama kodu gönderildi. Lütfen e-postanızı kontrol edin.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Doğrulama ekranına otomatik yönlendir
                navigation.navigate('VerifyEmail', { email });
              }
            }
          ]
        );
      } else {
        // Başarısız kayıt durumu
        Alert.alert(
          'Kayıt Hatası',
          'Kayıt işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
        );
      }
    } catch (error) {
      console.error('Kayıt olurken hata:', error);
      
      // Hata mesajını düzgün formatta hazırla
      let errorMessage = 'Kayıt işlemi sırasında bir hata oluştu';
      
      if (error.response) {
        if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 400) {
          errorMessage = 'Geçersiz bilgiler. Lütfen girdiğiniz bilgileri kontrol edin.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const toggleSecureConfirmTextEntry = () => {
    setSecureConfirmTextEntry(!secureConfirmTextEntry);
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.placeholderView} />
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>Hemen hesap oluşturun ve takas yapmaya başlayın</Text>
          
          <Input
            label="Ad Soyad"
            value={name}
            onChangeText={validateName}
            placeholder="Adınızı ve soyadınızı girin"
            error={nameError}
            leftIcon={<Ionicons name="person-outline" size={20} color="#666" />}
          />
          
          <Input
            label="Kullanıcı Adı"
            value={username}
            onChangeText={validateUsername}
            placeholder="Kullanıcı adınızı girin"
            error={usernameError}
            leftIcon={<Ionicons name="at-outline" size={20} color="#666" />}
            autoCapitalize="none"
          />
          
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
            label="Telefon"
            value={phone}
            onChangeText={validatePhone}
            placeholder="Telefon numaranızı girin"
            keyboardType="phone-pad"
            error={phoneError}
            leftIcon={<Ionicons name="call-outline" size={20} color="#666" />}
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
          
          <Input
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={validateConfirmPassword}
            placeholder="Şifrenizi tekrar girin"
            secureTextEntry={secureConfirmTextEntry}
            error={confirmPasswordError}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#666" />}
            rightIcon={
              <TouchableOpacity onPress={toggleSecureConfirmTextEntry}>
                <Ionicons
                  name={secureConfirmTextEntry ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            }
          />
          
          <Text style={styles.termsText}>
            Kayıt olarak, <Text style={styles.termsLink}>Kullanım Şartları</Text> ve <Text style={styles.termsLink}>Gizlilik Politikası</Text>'nı kabul etmiş olursunuz.
          </Text>
          
          <Button
            text="Kayıt Ol"
            onPress={handleRegister}
            isLoading={loading}
            style={styles.registerButton}
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Giriş Yap</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  placeholderView: {
    width: 40,
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
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  termsLink: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  registerButton: {
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  }
});

export default RegisterScreen; 