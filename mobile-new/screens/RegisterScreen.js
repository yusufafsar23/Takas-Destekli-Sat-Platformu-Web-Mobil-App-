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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Hata durumları
  const [nameError, setNameError] = useState('');
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

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galerinize erişim izni vermeniz gerekiyor.');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçerken bir sorun oluştu.');
    }
  };

  const handleRegister = async () => {
    // Formun geçerliliğini kontrol et
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isPhoneValid = validatePhone(phone);
    
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isPhoneValid) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare user data
      const userData = {
        name,
        email,
        password,
        phone,
        profileImage
      };
      
      // Register the user
      const response = await authService.register(userData);
      
      if (response && response.token) {
        // AsyncStorage'e token kaydet
        await AsyncStorage.setItem('userToken', response.token);
        
        // Ana ekrana yönlendir
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeTabs' }],
        });
      } else {
        // Başarısız kayıt durumu
        Alert.alert(
          'Kayıt Hatası',
          response?.message || 'Kayıt işlemi sırasında bir hata oluştu.'
        );
      }
    } catch (error) {
      console.error('Kayıt olurken hata:', error);
      Alert.alert('Hata', error.message || 'Kayıt işlemi sırasında bir hata oluştu');
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
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logo}
              defaultSource={require('../assets/icon.png')}
            />
            <Text style={styles.logoText}>Takas Platform</Text>
          </View>
          <View style={styles.placeholderView} />
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>Hemen hesap oluşturun ve takas yapmaya başlayın</Text>
          
          {/* Profile Image Picker */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.profileImageWrapper}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={50} color="#ccc" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Profil fotoğrafı eklemek için tıklayın</Text>
          </View>
          
          <Input
            label="Ad Soyad"
            value={name}
            onChangeText={validateName}
            placeholder="Adınızı ve soyadınızı girin"
            error={nameError}
            leftIcon={<Ionicons name="person-outline" size={20} color="#666" />}
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
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
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
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default RegisterScreen; 