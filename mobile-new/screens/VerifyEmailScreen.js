import React, { useState, useEffect } from 'react';
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
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext.jsx';

const VerifyEmailScreen = ({ navigation, route }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 dakika
  const { verifyEmail, logout } = useAuth();

  useEffect(() => {
    // E-posta adresini route params'dan veya AsyncStorage'dan al
    const getEmail = async () => {
      if (route.params?.email) {
        setEmail(route.params.email);
      } else {
        try {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            if (user.email) {
              setEmail(user.email);
            } else {
              // E-posta bulunamadı, giriş sayfasına yönlendir
              Alert.alert(
                'Hata',
                'E-posta adresi bulunamadı. Lütfen tekrar giriş yapın.',
                [
                  {
                    text: 'Tamam',
                    onPress: () => navigation.navigate('Login')
                  }
                ]
              );
            }
          }
        } catch (error) {
          console.error('E-posta bilgisi alınamadı:', error);
        }
      }
    };

    getEmail();
  }, [route.params]);

  useEffect(() => {
    // Geri sayım zamanlayıcısı
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu girin.');
      return;
    }

    setLoading(true);

    try {
      await verifyEmail(verificationCode, email);
      
      Alert.alert(
        'Başarılı',
        'E-posta adresiniz başarıyla doğrulandı.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Ana sayfaya yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'HomeTabs' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Doğrulama hatası:', error);
      Alert.alert(
        'Hata', 
        error.response?.data?.error || 'Doğrulama işlemi başarısız oldu. Lütfen tekrar deneyin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      // Yeni kod gönderme fonksiyonu - API'niz bu endpoint'i desteklemelidir
      await authService.resendVerificationCode(email);
      setCountdown(120); // Geri sayımı yeniden başlat
      Alert.alert('Bilgi', 'Yeni doğrulama kodu e-posta adresinize gönderildi.');
    } catch (error) {
      console.error('Kod gönderme hatası:', error);
      Alert.alert('Hata', 'Yeni kod gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleCancel = () => {
    // Çıkış yap ve giriş sayfasına yönlendir
    logout();
    navigation.navigate('Login');
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
          <Text style={styles.title}>E-posta Doğrulama</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.emailText}>{email}</Text> adresine bir doğrulama kodu gönderdik.
            {'\n'}Lütfen e-postanızı kontrol edin ve aşağıya kodu girin.
          </Text>
          
          <Input
            label="Doğrulama Kodu"
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="6 haneli kodu girin"
            keyboardType="number-pad"
            maxLength={6}
            leftIcon={<Ionicons name="key-outline" size={20} color="#666" />}
          />
          
          <Button
            text="Doğrula"
            onPress={handleVerify}
            isLoading={loading}
            style={styles.verifyButton}
          />
          
          <Button
            text="İptal"
            onPress={handleCancel}
            style={styles.cancelButton}
            textStyle={styles.cancelButtonText}
            type="outline"
          />
          
          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                Yeni kod için: {formatTime(countdown)}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendCode}>
                <Text style={styles.resendText}>Yeni kod gönder</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    fontWeight: 'bold',
  },
  verifyButton: {
    marginBottom: 16,
  },
  cancelButton: {
    marginBottom: 16,
    borderColor: '#FF6B6B',
  },
  cancelButtonText: {
    color: '#FF6B6B',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  countdownText: {
    fontSize: 14,
    color: '#666',
  },
  resendText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
});

export default VerifyEmailScreen; 