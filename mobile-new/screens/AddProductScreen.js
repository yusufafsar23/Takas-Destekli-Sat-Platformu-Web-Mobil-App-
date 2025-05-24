import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  Image, 
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_OFFLINE_MODE } from '../config';
import { AuthContext, useAuth } from '../context/AuthContext';

// Axios instance with timeout
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 saniye timeout (arttırıldı)
});

// Ön tanımlı kategoriler - API bağlantısı olmadığında kullanılır
const DUMMY_CATEGORIES = [
  { _id: '1', name: 'Elektronik' },
  { _id: '2', name: 'Giyim' },
  { _id: '3', name: 'Ev Eşyaları' },
  { _id: '4', name: 'Spor' },
  { _id: '5', name: 'Kitap & Hobi' },
  { _id: '6', name: 'Otomobil' },
  { _id: '7', name: 'Diğer' }
];

const AddProductScreen = ({ navigation }) => {
  const { user, token, authState } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [onlyForTrade, setOnlyForTrade] = useState(false);
  const [acceptsTradeOffers, setAcceptsTradeOffers] = useState(true);
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(DUMMY_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Condition options
  const conditionOptions = ['Yeni', 'Yeni Gibi', 'İyi', 'Makul', 'Kötü'];

  // Check authentication on component mount and fetch categories if authenticated
  useEffect(() => {
    if (authState === 'unauthenticated') {
      Alert.alert(
        'Giriş Yapın', 
        'Ürün eklemek için giriş yapmanız gerekmektedir.',
        [
          { text: 'İptal', onPress: () => navigation.goBack() },
          { text: 'Giriş Yap', onPress: () => navigation.navigate('Login', { returnTo: 'AddProduct' }) }
        ]
      );
    } else if (authState === 'authenticated') {
      console.log('AddProductScreen: User authenticated, fetching categories');
      fetchCategories();
    }
  }, [authState]);

  // Fetch categories from the database
  const fetchCategories = async () => {
    setLoadingCategories(true);
    setApiError(null);
    
    // Offline mod kontrolü
    if (API_OFFLINE_MODE === true) {
      console.log('AddProductScreen: Offline mod aktif, varsayılan kategoriler kullanılıyor');
      setTimeout(() => {
        setCategories(DUMMY_CATEGORIES);
        setLoadingCategories(false);
      }, 500); // Kısa bir yükleme efekti için 500ms bekletelim
      return;
    }
    
    try {
      console.log('AddProductScreen: Fetching categories from API');
      console.log('API URL:', API_URL);
      
      // Try to directly get the token if it wasn't passed from context
      let authToken = token;
      if (!authToken) {
        authToken = await AsyncStorage.getItem('token');
        console.log('AddProductScreen: Got token from AsyncStorage:', authToken ? 'Token retrieved' : 'No token in storage');
      }
      
      // Set headers with token if available
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      // Test doğrudan axios ile
      console.log('AddProductScreen: Doğrudan tam API URL ile deniyorum:', `${API_URL}/api/categories`);
      
      // Doğrudan axios ile tam URL kullanarak deneyelim
      const response = await axios.get(`${API_URL}/api/categories`);
      
      console.log('AddProductScreen: API Response Status:', response.status);
      console.log('AddProductScreen: API Response Data:', response.data);
      
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('AddProductScreen: Received', response.data.data.length, 'categories');
        setCategories(response.data.data);
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Bazen API direkt olarak array döndürebilir
        console.log('AddProductScreen: Received', response.data.length, 'categories as direct array');
        setCategories(response.data);
      } else {
        console.log('AddProductScreen: API returned empty categories, using dummy categories');
        setCategories(DUMMY_CATEGORIES);
      }
    } catch (error) {
      console.error('AddProductScreen: Error fetching categories:', error);
      console.error('AddProductScreen: Error details:', error.message);
      
      if (error.response) {
        // Sunucudan yanıt var, ama başarısız
        console.error('AddProductScreen: Server responded with error status:', error.response.status);
        console.error('AddProductScreen: Server error data:', error.response.data);
      } else if (error.request) {
        // İstek gönderildi ama yanıt alınamadı
        console.error('AddProductScreen: No response received from server');
      } else {
        // İstek oluşturulurken hata
        console.error('AddProductScreen: Error setting up request:', error.message);
      }
      
      let errorMessage = 'Kategoriler yüklenirken bir hata oluştu.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.';
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Ağ hatası: Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.response) {
        errorMessage = `Sunucu hatası: ${error.response.status} ${error.response.statusText}`;
      }
      
      setApiError(errorMessage);
      
      // Alternatif API URL'leri deneyelim
      Alert.alert(
        'Bağlantı Hatası', 
        `${errorMessage}\n\nAlternatif API URL'leri denemeyi veya ayarları kontrol etmeyi deneyin.`,
        [
          { 
            text: 'Ayarlar', 
            onPress: () => Alert.alert(
              'API Ayarları', 
              `Mevcut API URL: ${API_URL}\n\nConfig.js dosyasında URL ayarını kontrol edin.\n\nAndroid Emulator için: 10.0.2.2:5000\niOS Simulator için: localhost:5000\nGerçek cihaz için kendi IP adresinizi kullanın.`,
              [{ text: 'Tamam' }]
            ) 
          },
          { text: 'Varsayılan Kategorileri Kullan', onPress: () => setCategories(DUMMY_CATEGORIES) }
        ]
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const pickImage = async () => {
    try {
      console.log('Resim seçme işlemi başlatılıyor...');
      
      // İzin kontrolü
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('İzin durumu:', status);
      
      if (status !== 'granted') {
        Alert.alert('Hata', 'Fotoğraflara erişim izni verilmedi!');
        return;
      }
      
      // Image Picker'ı aç
      console.log('Image Picker açılıyor...');
      const result = await ImagePicker.launchImageLibraryAsync({
        // Default olarak 'images' mediaType kullanır, açıkça belirtmiyoruz
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });
      
      console.log('Image Picker sonucu:', result.canceled ? 'İptal edildi' : `${result.assets ? result.assets.length : 0} resim seçildi`);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAssets = result.assets;
        // Limit to 5 images total
        const newImages = [...images, ...selectedAssets];
        if (newImages.length > 5) {
          Alert.alert('Uyarı', 'En fazla 5 resim yükleyebilirsiniz.');
          setImages(newImages.slice(0, 5));
        } else {
          setImages(newImages);
        }
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu: ' + error.message);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    // Validate form
    if (!title || !description || (!price && !onlyForTrade) || !category || !condition || !location || images.length === 0) {
      Alert.alert('Hata', 'Lütfen tüm zorunlu alanları doldurun ve en az bir resim ekleyin.');
      return;
    }

    // Verify authentication again before submitting
    if (authState !== 'authenticated' || !token) {
      Alert.alert('Hata', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      navigation.navigate('Login', { returnTo: 'AddProduct' });
      return;
    }

    setLoading(true);
    
    // Offline mod kontrolü
    if (API_OFFLINE_MODE === true) {
      setTimeout(() => {
        setLoading(false);
        Alert.alert('Offline Mod', 'Offline modda çalışıyorsunuz. Ürün kaydedildi olarak kabul edildi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('AllProducts') }
        ]);
      }, 1500);
      return;
    }
    
    try {
      // Format data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', onlyForTrade ? '0' : price);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location);
      formData.append('acceptsTradeOffers', acceptsTradeOffers.toString());
      formData.append('onlyForTrade', onlyForTrade.toString());
      
      // Add images to form data
      images.forEach((image, index) => {
        const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
        const imageType = image.type || 'image/jpeg';
        const imageName = image.fileName || `image_${index}.jpg`;
        
        formData.append('images', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        });
      });
      
      console.log('AddProductScreen: Submitting product to API');
      
      // Send request to API with authentication token
      const response = await axios.post(`${API_URL}/api/products`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      
      Alert.alert('Başarılı', 'Ürün başarıyla eklendi!', [
        { text: 'Tamam', onPress: () => navigation.navigate('AllProducts') }
      ]);
    } catch (error) {
      console.error('AddProductScreen: Error creating product:', error);
      
      let errorMessage = 'Ürün eklenirken bir hata oluştu.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.';
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Ağ hatası: Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
          Alert.alert('Hata', errorMessage, [
            { text: 'Tamam', onPress: () => navigation.navigate('Login', { returnTo: 'AddProduct' }) }
          ]);
          return;
        } else {
          errorMessage = `Sunucu hatası: ${error.response.status} ${error.response.statusText}`;
          if (error.response.data && error.response.data.message) {
            errorMessage += ` - ${error.response.data.message}`;
          }
        }
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Retry categories load
  const retryFetchCategories = () => {
    fetchCategories();
  };

  // Condition selection modal
  const ConditionSelectionModal = () => (
    <Modal
      visible={showConditionModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowConditionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ürün Durumu Seçin</Text>
            <TouchableOpacity onPress={() => setShowConditionModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={conditionOptions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.conditionItem, 
                  condition === item && styles.selectedConditionItem
                ]}
                onPress={() => {
                  setCondition(item);
                  setShowConditionModal(false);
                }}
              >
                <Text style={[
                  styles.conditionText,
                  condition === item && styles.selectedConditionText
                ]}>
                  {item}
                </Text>
                {condition === item && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );

  // Category selection modal
  const CategorySelectionModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kategori Seçin</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {loadingCategories ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <Text style={styles.modalLoadingText}>Kategoriler yükleniyor...</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.conditionItem, 
                    category === item._id && styles.selectedConditionItem
                  ]}
                  onPress={() => {
                    setCategory(item._id);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[
                    styles.conditionText,
                    category === item._id && styles.selectedConditionText
                  ]}>
                    {item.name}
                  </Text>
                  {category === item._id && (
                    <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Show loading spinner while checking auth
  if (authState === 'initializing') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Ürün Ekle</Text>
      </View>
      
      <View style={styles.formContainer}>
        {/* API Error Message and Retry Button */}
        {apiError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{apiError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={retryFetchCategories}
            >
              <Text style={styles.retryButtonText}>Yeniden Dene</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Product Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün Resimleri *</Text>
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton} 
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.addImageButtonInner}>
                  <Ionicons name="camera" size={40} color="#ccc" />
                  <Text style={styles.addImageText}>Resim Ekle</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helperText}>En fazla 5 resim ekleyebilirsiniz</Text>
        </View>
        
        {/* Product Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün Adı *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ürünün adını girin"
            maxLength={100}
          />
        </View>
        
        {/* Product Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün Açıklaması *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ürünün açıklamasını girin"
            multiline={true}
            numberOfLines={5}
            maxLength={1000}
          />
        </View>
        
        {/* Price & Trade Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fiyat ve Takas</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Sadece takas için</Text>
            <Switch
              value={onlyForTrade}
              onValueChange={setOnlyForTrade}
              trackColor={{ false: '#d1d1d1', true: '#FF6B6B' }}
              thumbColor={'#fff'}
            />
          </View>
          
          {!onlyForTrade && (
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Fiyat (TL)"
              keyboardType="numeric"
            />
          )}
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Takas kabul edilir</Text>
            <Switch
              value={acceptsTradeOffers}
              onValueChange={setAcceptsTradeOffers}
              trackColor={{ false: '#d1d1d1', true: '#FF6B6B' }}
              thumbColor={'#fff'}
              disabled={onlyForTrade}
            />
          </View>
        </View>
        
        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori *</Text>
          <TouchableOpacity 
            style={styles.conditionButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.conditionButtonText}>
              {category 
                ? categories.find(c => c._id === category)?.name || 'Kategori seçin'
                : 'Kategori seçin'
              }
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          <CategorySelectionModal />
        </View>
        
        {/* Condition - Changed to button opening modal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün Durumu *</Text>
          <TouchableOpacity 
            style={styles.conditionButton}
            onPress={() => setShowConditionModal(true)}
          >
            <Text style={styles.conditionButtonText}>{condition || 'Ürün durumu seçin'}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
          <ConditionSelectionModal />
        </View>
        
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Konum *</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Şehir, ilçe (ör. İstanbul, Kadıköy)"
          />
        </View>
        
        {/* Current Auth State Debug Info (DEV only) */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Auth State: {authState}</Text>
            <Text style={styles.debugText}>User: {user ? user.email : 'none'}</Text>
            <Text style={styles.debugText}>Token: {token ? 'exists' : 'none'}</Text>
            <Text style={styles.debugText}>API URL: {API_URL}</Text>
            <Text style={styles.debugText}>Offline Mode: {API_OFFLINE_MODE ? 'ON' : 'OFF'}</Text>
            <Text style={styles.debugText}>Categories loaded: {categories.length}</Text>
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => {
                Alert.alert(
                  'API Test', 
                  `Mevcut API URL: ${API_URL}\n\nŞu anki kategori sayısı: ${categories.length}`,
                  [
                    { text: 'Yeniden Dene', onPress: () => fetchCategories() },
                    { text: 'Tamam' }
                  ]
                );
              }}
            >
              <Text style={styles.debugButtonText}>API Testi</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Ürünü Ekle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  imageContainer: {
    width: 100,
    height: 100,
    margin: 5,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  addImageButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  addImageText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conditionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionButtonText: {
    fontSize: 16,
    color: '#333',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  conditionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  selectedConditionItem: {
    backgroundColor: '#fff0f0',
  },
  conditionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedConditionText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  // Debug styles - only for development
  debugContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
  },
  // Error styles
  errorContainer: {
    backgroundColor: '#fff0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD0D0',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default AddProductScreen; 