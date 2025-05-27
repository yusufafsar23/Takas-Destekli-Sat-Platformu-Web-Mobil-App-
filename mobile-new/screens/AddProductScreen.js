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
import { getCategoryAttributes, calculatePriceImpact } from '../utils/categoryAttributesConfig';

// Axios instance with timeout
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 saniye timeout (arttırıldı)
});

// Ön tanımlı kategoriler - API bağlantısı olmadığında kullanılır
const DUMMY_CATEGORIES = [
  { _id: '1', name: 'Telefonlar' },
  { _id: '2', name: 'Bilgisayarlar' },
  { _id: '3', name: 'Oyuncak' },
  { _id: '4', name: 'Kitap' },
  { _id: '5', name: 'Oyun' },
  { _id: '6', name: 'Oyun Konsolu' }
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
  const [attributes, setAttributes] = useState({}); // Ürün özellikleri için
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(DUMMY_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [apiError, setApiError] = useState(null);
  
  // Fiyat tahmini state
  const [pricePrediction, setPricePrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [showPredictionDetails, setShowPredictionDetails] = useState(false);

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

  // Reset form when screen comes into focus
  useEffect(() => {
    const resetForm = () => {
      console.log('AddProductScreen: Resetting form fields');
      setTitle('');
      setDescription('');
      setPrice('');
      setOnlyForTrade(false);
      setAcceptsTradeOffers(true);
      setCategory('');
      setCondition('İyi');
      setLocation('');
      setImages([]);
      setApiError(null);
    };

    // Add listener for when screen comes into focus
    const unsubscribe = navigation.addListener('focus', resetForm);
    
    // Reset form on initial mount
    resetForm();
    
    // Clean up the listener when component unmounts
    return unsubscribe;
  }, [navigation]);

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
      
      // Try to directly get the token if it wasn't passed from context
      let authToken = token;
      if (!authToken) {
        authToken = await AsyncStorage.getItem('token');
      }
      
      // Set headers with token if available
      const headers = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      // API'den kategorileri al
      const response = await axios.get(`${API_URL}/api/categories`, { headers });
      
      // Filtrelenecek kategori isimleri (küçük harfle)
      const excludedCategories = [
        'aydınlatma', 'bahçe', 'diğer', 'ev eşyaları', 'elektronik', 
        'fotoğraf ve kamera', 'giyim', 'hobi ve oyun', 'otomobil', 'otomobil ve parçaları'
      ];
      
      let filteredCategories = [];
      
      if (response.data && response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('AddProductScreen: Received', response.data.data.length, 'categories');
        // Kategorileri filtrele - büyük/küçük harf duyarsız
        filteredCategories = response.data.data.filter(cat => {
          const catNameLower = cat.name?.toLowerCase() || '';
          return !excludedCategories.some(excluded => catNameLower.includes(excluded.toLowerCase()));
        });
        console.log('AddProductScreen: Filtered to', filteredCategories.length, 'categories');
        setCategories(filteredCategories);
      } else if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Bazen API direkt olarak array döndürebilir
        console.log('AddProductScreen: Received', response.data.length, 'categories as direct array');
        // Kategorileri filtrele - büyük/küçük harf duyarsız
        filteredCategories = response.data.filter(cat => {
          const catNameLower = cat.name?.toLowerCase() || '';
          return !excludedCategories.some(excluded => catNameLower.includes(excluded.toLowerCase()));
        });
        console.log('AddProductScreen: Filtered to', filteredCategories.length, 'categories');
        setCategories(filteredCategories);
      } else {
        console.log('AddProductScreen: API returned empty categories, using dummy categories');
        setCategories(DUMMY_CATEGORIES);
      }
    } catch (error) {
      console.error('AddProductScreen: Error fetching categories:', error.message);
      
      let errorMessage = 'Kategoriler yüklenirken bir hata oluştu.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.';
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Ağ hatası: Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol edin.';
      } else if (error.response) {
        errorMessage = `Sunucu hatası: ${error.response.status}`;
      }
      
      setApiError(errorMessage);
      setCategories(DUMMY_CATEGORIES);
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
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', onlyForTrade ? '0' : price.toString().trim());
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location.trim());
      formData.append('acceptsTradeOffers', acceptsTradeOffers.toString());
      formData.append('onlyForTrade', onlyForTrade.toString());
      
      // Log the form data for debugging
      console.log('Form data being sent:', {
        title: title.trim(),
        description: description.trim().substring(0, 20) + '...',
        price: onlyForTrade ? '0' : price.toString().trim(),
        category,
        condition,
        location: location.trim(),
        acceptsTradeOffers: acceptsTradeOffers.toString(),
        onlyForTrade: onlyForTrade.toString(),
        imageCount: images.length
      });
      
      // Add images to form data
      images.forEach((image, index) => {
        const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
        
        // Ensure we have proper image type and name
        const imageType = image.type || 'image/jpeg';
        const imageName = image.fileName || `image_${index}.jpg`;
        
        console.log(`Adding image ${index}:`, {
          uri: imageUri.substring(0, 30) + '...',
          type: imageType,
          name: imageName
        });
        
        formData.append('images', {
          uri: imageUri,
          type: imageType,
          name: imageName,
        });
      });
      
      console.log('AddProductScreen: Submitting product to API');
      
      // Try using the productService first
      try {
        const response = await productService.createProduct(formData);
        console.log('Product created successfully via service');
        
        // Reset form fields after successful submission
        setTitle('');
        setDescription('');
        setPrice('');
        setOnlyForTrade(false);
        setAcceptsTradeOffers(true);
        setCategory('');
        setCondition('İyi');
        setLocation('');
        setImages([]);
        
        Alert.alert('Başarılı', 'Ürün başarıyla eklendi!', [
          { text: 'Tamam', onPress: () => navigation.navigate('AllProducts') }
        ]);
        return;
      } catch (serviceError) {
        console.error('Service error, trying direct API call:', serviceError);
        
        // If service fails, try direct API call
        const response = await axios.post(`${API_URL}/api/products`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
        });
        
        // Reset form fields after successful submission
        setTitle('');
        setDescription('');
        setPrice('');
        setOnlyForTrade(false);
        setAcceptsTradeOffers(true);
        setCategory('');
        setCondition('İyi');
        setLocation('');
        setImages([]);
        
        Alert.alert('Başarılı', 'Ürün başarıyla eklendi!', [
          { text: 'Tamam', onPress: () => navigation.navigate('AllProducts') }
        ]);
      }
    } catch (error) {
      console.error('AddProductScreen: Error creating product:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      
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
        } else if (error.response.status === 400) {
          errorMessage = 'Geçersiz veri formatı. Lütfen girdiğiniz bilgileri kontrol edin.';
          
          // Check for specific error messages from the server
          if (error.response.data && error.response.data.message) {
            errorMessage += `\n\nSunucu mesajı: ${error.response.data.message}`;
          }
          
          // Check for validation errors
          if (error.response.data && error.response.data.errors) {
            const errorFields = Object.keys(error.response.data.errors).join(', ');
            errorMessage += `\n\nHatalı alanlar: ${errorFields}`;
          }
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

  // Fiyat tahmini yap
  const getPricePrediction = async () => {
    if (!category) {
      Alert.alert('Hata', 'Fiyat tahmini için önce bir kategori seçmelisiniz.');
      return;
    }

    try {
      setLoadingPrediction(true);
      setPredictionError(null);
      
      // Kategori adını bul
      const selectedCategory = categories.find(cat => cat._id === category);
      const categoryName = selectedCategory?.name || '';
      
      // API'ye gönderilecek veri
      const predictionData = {
        title,
        description,
        category,
        categoryName,
        condition,
        attributes
      };
      
      console.log('Fiyat tahmini için veri gönderiliyor:', predictionData);
      
      // Offline mod kontrolü
      if (API_OFFLINE_MODE === true) {
        console.log('Offline mod aktif, yapay fiyat tahmini oluşturuluyor');
        // Offline mod için yapay veri oluştur
        setTimeout(() => {
          const mockPrediction = {
            estimatedPrice: Math.floor(Math.random() * 5000) + 1000,
            priceRange: {
              min: Math.floor(Math.random() * 1000) + 500,
              max: Math.floor(Math.random() * 10000) + 5000
            },
            confidence: Math.floor(Math.random() * 60) + 40,
            analysis: {
              averagePrice: Math.floor(Math.random() * 5000) + 1000,
              medianPrice: Math.floor(Math.random() * 5000) + 1000,
              minPrice: Math.floor(Math.random() * 1000) + 100,
              maxPrice: Math.floor(Math.random() * 15000) + 5000,
              sampleSize: Math.floor(Math.random() * 20) + 5
            },
            similarProducts: []
          };
          setPricePrediction(mockPrediction);
          // Fiyat tahmini hesaplandıktan sonra detayları otomatik açma
          setShowPredictionDetails(false);
          setLoadingPrediction(false);
        }, 1500);
        return;
      }
      
      // API'ye istek gönder
      const authToken = token || await AsyncStorage.getItem('token');
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
      
      const response = await axios.post(
        `${API_URL}/api/price-prediction`, 
        predictionData, 
        { headers }
      );
      
      if (response.data && response.data.data) {
        console.log('Fiyat tahmini alındı:', response.data.data);
        setPricePrediction(response.data.data);
        
        // Otomatik olarak tahmini fiyatı form alanına ekle
        if (response.data.data.estimatedPrice) {
          setPrice(response.data.data.estimatedPrice.toString());
        }
      } else {
        setPredictionError('Fiyat tahmini yapılamadı.');
      }
    } catch (error) {
      console.error('Fiyat tahmini hatası:', error);
      setPredictionError('Fiyat tahmini alınırken bir hata oluştu.');
    } finally {
      // Fiyat tahmini hesaplandıktan sonra detayları otomatik açma
      setShowPredictionDetails(false);
      setLoadingPrediction(false);
    }
  };

  // Kategori değiştiğinde özellikleri sıfırla
  useEffect(() => {
    setAttributes({});
    setPricePrediction(null);
    setPredictionError(null);
  }, [category]);

  // Telefon özelliklerini girmek için form
  const renderPhoneAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Telefon Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Apple, Samsung, Xiaomi vb."
            value={attributes.brand || ''}
            onChangeText={(text) => setAttributes({...attributes, brand: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            placeholder="iPhone 15, Galaxy S23 vb."
            value={attributes.model || ''}
            onChangeText={(text) => setAttributes({...attributes, model: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Hafıza (GB)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Hafıza Seçin",
                "Telefonun hafıza boyutunu seçin",
                [
                  { text: "16 GB", onPress: () => setAttributes({...attributes, storage: "16"}) },
                  { text: "32 GB", onPress: () => setAttributes({...attributes, storage: "32"}) },
                  { text: "64 GB", onPress: () => setAttributes({...attributes, storage: "64"}) },
                  { text: "128 GB", onPress: () => setAttributes({...attributes, storage: "128"}) },
                  { text: "256 GB", onPress: () => setAttributes({...attributes, storage: "256"}) },
                  { text: "512 GB", onPress: () => setAttributes({...attributes, storage: "512"}) },
                  { text: "1 TB", onPress: () => setAttributes({...attributes, storage: "1024"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.storage ? `${attributes.storage} GB` : "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>RAM (GB)</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "RAM Seçin",
                "Telefonun RAM boyutunu seçin",
                [
                  { text: "2 GB", onPress: () => setAttributes({...attributes, ram: "2"}) },
                  { text: "3 GB", onPress: () => setAttributes({...attributes, ram: "3"}) },
                  { text: "4 GB", onPress: () => setAttributes({...attributes, ram: "4"}) },
                  { text: "6 GB", onPress: () => setAttributes({...attributes, ram: "6"}) },
                  { text: "8 GB", onPress: () => setAttributes({...attributes, ram: "8"}) },
                  { text: "12 GB", onPress: () => setAttributes({...attributes, ram: "12"}) },
                  { text: "16 GB", onPress: () => setAttributes({...attributes, ram: "16"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.ram ? `${attributes.ram} GB` : "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Giyim özelliklerini girmek için form
  const renderClothingAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Giyim Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Nike, Adidas, Zara, H&M vb."
            value={attributes.brand || ''}
            onChangeText={(text) => setAttributes({...attributes, brand: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Beden</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Beden Seçin",
                "Ürünün bedenini seçin",
                [
                  { text: "XS", onPress: () => setAttributes({...attributes, size: "XS"}) },
                  { text: "S", onPress: () => setAttributes({...attributes, size: "S"}) },
                  { text: "M", onPress: () => setAttributes({...attributes, size: "M"}) },
                  { text: "L", onPress: () => setAttributes({...attributes, size: "L"}) },
                  { text: "XL", onPress: () => setAttributes({...attributes, size: "XL"}) },
                  { text: "XXL", onPress: () => setAttributes({...attributes, size: "XXL"}) },
                  { text: "34", onPress: () => setAttributes({...attributes, size: "34"}) },
                  { text: "36", onPress: () => setAttributes({...attributes, size: "36"}) },
                  { text: "38", onPress: () => setAttributes({...attributes, size: "38"}) },
                  { text: "40", onPress: () => setAttributes({...attributes, size: "40"}) },
                  { text: "42", onPress: () => setAttributes({...attributes, size: "42"}) },
                  { text: "44", onPress: () => setAttributes({...attributes, size: "44"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.size || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Malzeme</Text>
          <TextInput
            style={styles.input}
            placeholder="Pamuk, Deri, Yün, Polyester vb."
            value={attributes.material || ''}
            onChangeText={(text) => setAttributes({...attributes, material: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cinsiyet</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Cinsiyet Seçin",
                "Ürünün hedef kitlesini seçin",
                [
                  { text: "Erkek", onPress: () => setAttributes({...attributes, gender: "Erkek"}) },
                  { text: "Kadın", onPress: () => setAttributes({...attributes, gender: "Kadın"}) },
                  { text: "Çocuk", onPress: () => setAttributes({...attributes, gender: "Çocuk"}) },
                  { text: "Unisex", onPress: () => setAttributes({...attributes, gender: "Unisex"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.gender || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Sezon</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Sezon Seçin",
                "Ürünün uygun olduğu sezonu seçin",
                [
                  { text: "Yaz", onPress: () => setAttributes({...attributes, season: "Yaz"}) },
                  { text: "Kış", onPress: () => setAttributes({...attributes, season: "Kış"}) },
                  { text: "İlkbahar", onPress: () => setAttributes({...attributes, season: "İlkbahar"}) },
                  { text: "Sonbahar", onPress: () => setAttributes({...attributes, season: "Sonbahar"}) },
                  { text: "4 Mevsim", onPress: () => setAttributes({...attributes, season: "4 Mevsim"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.season || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Ev eşyaları özelliklerini girmek için form
  const renderHomeAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Ev Eşyası Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="IKEA, Bellona, İstikbal vb."
            value={attributes.brand || ''}
            onChangeText={(text) => setAttributes({...attributes, brand: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Malzeme</Text>
          <TextInput
            style={styles.input}
            placeholder="Masif, MDF, Deri, Kumaş vb."
            value={attributes.material || ''}
            onChangeText={(text) => setAttributes({...attributes, material: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Boyutlar</Text>
          <TextInput
            style={styles.input}
            placeholder="200x100x80 cm"
            value={attributes.dimensions || ''}
            onChangeText={(text) => setAttributes({...attributes, dimensions: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yaş (Yıl)</Text>
          <TextInput
            style={styles.input}
            placeholder="Kaç yıllık?"
            keyboardType="numeric"
            value={attributes.age || ''}
            onChangeText={(text) => setAttributes({...attributes, age: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Oda</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Oda Seçin",
                "Hangi oda için uygun?",
                [
                  { text: "Salon", onPress: () => setAttributes({...attributes, room: "Salon"}) },
                  { text: "Yatak Odası", onPress: () => setAttributes({...attributes, room: "Yatak Odası"}) },
                  { text: "Mutfak", onPress: () => setAttributes({...attributes, room: "Mutfak"}) },
                  { text: "Banyo", onPress: () => setAttributes({...attributes, room: "Banyo"}) },
                  { text: "Çocuk Odası", onPress: () => setAttributes({...attributes, room: "Çocuk Odası"}) },
                  { text: "Çalışma Odası", onPress: () => setAttributes({...attributes, room: "Çalışma Odası"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.room || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Spor malzemeleri özelliklerini girmek için form
  const renderSportsAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Spor Malzemesi Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Nike, Adidas, Wilson vb."
            value={attributes.brand || ''}
            onChangeText={(text) => setAttributes({...attributes, brand: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Spor Dalı</Text>
          <TextInput
            style={styles.input}
            placeholder="Futbol, Tenis, Koşu vb."
            value={attributes.sport || ''}
            onChangeText={(text) => setAttributes({...attributes, sport: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Seviye</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Seviye Seçin",
                "Hangi seviye için uygun?",
                [
                  { text: "Başlangıç", onPress: () => setAttributes({...attributes, level: "Başlangıç"}) },
                  { text: "Amatör", onPress: () => setAttributes({...attributes, level: "Amatör"}) },
                  { text: "Yarı Profesyonel", onPress: () => setAttributes({...attributes, level: "Yarı Profesyonel"}) },
                  { text: "Profesyonel", onPress: () => setAttributes({...attributes, level: "Profesyonel"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.level || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Beden/Boyut</Text>
          <TextInput
            style={styles.input}
            placeholder="M, L, 42, 44 vb."
            value={attributes.size || ''}
            onChangeText={(text) => setAttributes({...attributes, size: text})}
          />
        </View>
      </View>
    );
  };

  // Kitap & Hobi özelliklerini girmek için form
  const renderBookHobbyAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Kitap & Hobi Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tür</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Tür Seçin",
                "Ürün türünü seçin",
                [
                  { text: "Kitap", onPress: () => setAttributes({...attributes, type: "Kitap"}) },
                  { text: "Dergi", onPress: () => setAttributes({...attributes, type: "Dergi"}) },
                  { text: "Koleksiyon", onPress: () => setAttributes({...attributes, type: "Koleksiyon"}) },
                  { text: "Hobi Malzemesi", onPress: () => setAttributes({...attributes, type: "Hobi Malzemesi"}) },
                  { text: "Oyun", onPress: () => setAttributes({...attributes, type: "Oyun"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.type || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yazar/Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Yazar adı veya marka"
            value={attributes.author || ''}
            onChangeText={(text) => setAttributes({...attributes, author: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yayınevi</Text>
          <TextInput
            style={styles.input}
            placeholder="Yayınevi adı"
            value={attributes.publisher || ''}
            onChangeText={(text) => setAttributes({...attributes, publisher: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yıl</Text>
          <TextInput
            style={styles.input}
            placeholder="Yayın/Üretim yılı"
            keyboardType="numeric"
            value={attributes.year || ''}
            onChangeText={(text) => setAttributes({...attributes, year: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nadir Olma Durumu</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Nadir Olma Durumu",
                "Ürünün nadir olma durumunu seçin",
                [
                  { text: "Normal", onPress: () => setAttributes({...attributes, rarity: "Normal"}) },
                  { text: "Sınırlı Sayıda", onPress: () => setAttributes({...attributes, rarity: "Sınırlı"}) },
                  { text: "Nadir", onPress: () => setAttributes({...attributes, rarity: "Nadir"}) },
                  { text: "Çok Nadir", onPress: () => setAttributes({...attributes, rarity: "Çok Nadir"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.rarity || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Araç özelliklerini girmek için form
  const renderVehicleAttributes = () => {
    return (
      <View style={styles.attributesContainer}>
        <Text style={styles.attributesTitle}>Araç Özellikleri</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Toyota, BMW, Mercedes vb."
            value={attributes.brand || ''}
            onChangeText={(text) => setAttributes({...attributes, brand: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            placeholder="Corolla, 3 Serisi vb."
            value={attributes.model || ''}
            onChangeText={(text) => setAttributes({...attributes, model: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yıl</Text>
          <TextInput
            style={styles.input}
            placeholder="Model yılı"
            keyboardType="numeric"
            value={attributes.year || ''}
            onChangeText={(text) => setAttributes({...attributes, year: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Kilometre</Text>
          <TextInput
            style={styles.input}
            placeholder="150.000 km"
            keyboardType="numeric"
            value={attributes.mileage || ''}
            onChangeText={(text) => setAttributes({...attributes, mileage: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yakıt Türü</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Yakıt Türü Seçin",
                "Aracın yakıt türünü seçin",
                [
                  { text: "Benzin", onPress: () => setAttributes({...attributes, fuel: "Benzin"}) },
                  { text: "Dizel", onPress: () => setAttributes({...attributes, fuel: "Dizel"}) },
                  { text: "LPG", onPress: () => setAttributes({...attributes, fuel: "LPG"}) },
                  { text: "Hibrit", onPress: () => setAttributes({...attributes, fuel: "Hibrit"}) },
                  { text: "Elektrik", onPress: () => setAttributes({...attributes, fuel: "Elektrik"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.fuel || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Vites</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              Alert.alert(
                "Vites Türü Seçin",
                "Aracın vites türünü seçin",
                [
                  { text: "Manuel", onPress: () => setAttributes({...attributes, transmission: "Manuel"}) },
                  { text: "Otomatik", onPress: () => setAttributes({...attributes, transmission: "Otomatik"}) },
                  { text: "Yarı Otomatik", onPress: () => setAttributes({...attributes, transmission: "Yarı Otomatik"}) },
                  { text: "İptal", style: "cancel" }
                ]
              );
            }}
          >
            <Text>{attributes.transmission || "Seçiniz"}</Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Kategori seçimine göre özellik formlarını göster
  const renderAttributesByCategory = () => {
    if (!category) return null;
    
    // Kategori verisini al
    const selectedCategory = categories.find(cat => cat._id === category);
    if (!selectedCategory) return null;
    
    const categoryName = selectedCategory.name;
    
    // Kategori için yapılandırılmış özellikleri al
    const configuredAttributes = getCategoryAttributes(categoryName);
    
    // Eğer kategori için özel yapılandırma varsa onu kullan
    if (configuredAttributes && configuredAttributes.length > 0) {
      return (
        <View style={styles.attributesContainer}>
          <Text style={styles.attributesTitle}>{categoryName} Özellikleri</Text>
          
          {configuredAttributes.map((attr, index) => (
            <View key={index} style={styles.inputContainer}>
              <Text style={styles.label}>{attr.label}</Text>
              {renderConfiguredAttributeInput(attr)}
            </View>
          ))}
        </View>
      );
    }
    
    // Yapılandırma yoksa eski kategori eşleştirmelerini kullan
    const lowerCategoryName = categoryName.toLowerCase();
    
    if (lowerCategoryName.includes('telefon') || lowerCategoryName.includes('phone')) {
      return renderPhoneAttributes();
    } else if (lowerCategoryName.includes('giyim') || lowerCategoryName.includes('clothing') || 
               lowerCategoryName.includes('erkek') || lowerCategoryName.includes('kadın')) {
      return renderClothingAttributes();
    } else if (lowerCategoryName.includes('ev') || lowerCategoryName.includes('home') || 
               lowerCategoryName.includes('mobilya')) {
      return renderHomeAttributes();
    } else if (lowerCategoryName.includes('spor') || lowerCategoryName.includes('sports') || 
               lowerCategoryName.includes('fitness')) {
      return renderSportsAttributes();
    } else if (lowerCategoryName.includes('kitap') || lowerCategoryName.includes('hobi') || 
               lowerCategoryName.includes('book') || lowerCategoryName.includes('hobby')) {
      return renderBookHobbyAttributes();
    } else if (lowerCategoryName.includes('araç') || lowerCategoryName.includes('otomobil') || 
               lowerCategoryName.includes('vehicle') || lowerCategoryName.includes('car')) {
      return renderVehicleAttributes();
    }
    
    return null;
  };
  
  // Yapılandırılmış özellikler için input render etme
  const renderConfiguredAttributeInput = (attribute) => {
    const { name, type, options, placeholder, min, max } = attribute;
    
    // Select tipi için
    if (type === 'select' && options) {
      return (
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            Alert.alert(
              `${attribute.label} Seçin`,
              `Lütfen bir ${attribute.label.toLowerCase()} seçin`,
              [
                ...options.map(option => ({
                  text: option.label,
                  onPress: () => setAttributes({...attributes, [name]: option.value})
                })),
                { text: "İptal", style: "cancel" }
              ]
            );
          }}
        >
          <Text>
            {options.find(opt => opt.value === attributes[name])?.label || "Seçiniz"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      );
    }
    
    // Number tipi için
    if (type === 'number') {
      return (
        <TextInput
          style={styles.input}
          placeholder={placeholder || ''}
          keyboardType="numeric"
          value={attributes[name] || ''}
          onChangeText={(text) => setAttributes({...attributes, [name]: text})}
        />
      );
    }
    
    // Text tipi için (varsayılan)
    return (
      <TextInput
        style={styles.input}
        placeholder={placeholder || ''}
        value={attributes[name] || ''}
        onChangeText={(text) => setAttributes({...attributes, [name]: text})}
      />
    );
  };

  // Fiyat tahmini bileşeni
  const renderPricePrediction = () => {
    if (!category) return null;
    
    return (
      <View style={styles.predictionContainer}>
        <Text style={styles.predictionTitle}>🤖 Yapay Zeka Fiyat Tahmini</Text>
        
        {!pricePrediction && !loadingPrediction && (
          <View style={styles.predictionPrompt}>
            <Text style={styles.predictionText}>
              Daha doğru fiyat tahmini için yapay zeka desteği alabilirsiniz.
            </Text>
            <Text style={styles.predictionSubText}>
              Bu seçenek için ürün hakkında daha detaylı bilgi girmeniz gerekecek.
            </Text>
            <TouchableOpacity 
              style={styles.predictionButton}
              onPress={() => setShowPredictionDetails(true)}
            >
              <Text style={styles.predictionButtonText}>AI Fiyat Tahmini İste</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Detaylı özellik formu göster */}
        {showPredictionDetails && !pricePrediction && !loadingPrediction && (
          <View>
            <Text style={styles.attributesRequiredText}>
              🎯 AI için gerekli ek bilgiler:
            </Text>
            {renderAttributesByCategory()}
            
            <TouchableOpacity 
              style={styles.aiPredictionButton}
              onPress={getPricePrediction}
            >
              <Text style={styles.predictionButtonText}>Fiyat Tahminini Hesapla</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelAiButton}
              onPress={() => {
                setShowPredictionDetails(false);
                setAttributes({});
              }}
            >
              <Text style={styles.cancelAiButtonText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {predictionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{predictionError}</Text>
          </View>
        )}
        
        {loadingPrediction && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066cc" />
            <Text style={styles.loadingText}>Yapay zeka modeli analiz ediyor...</Text>
            <Text style={styles.loadingSubText}>Benzer ürünler inceleniyor...</Text>
          </View>
        )}
        
        {pricePrediction && (
          <View style={styles.predictionResult}>
            <View style={styles.aiIndicator}>
              <Text style={styles.aiIndicatorText}>🤖 AI ile Tahmin Edildi</Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.estimatedPrice}>
                {pricePrediction.estimatedPrice.toLocaleString()} ₺
              </Text>
              <Text style={styles.priceRange}>
                {pricePrediction.priceRange.min.toLocaleString()} ₺ - {pricePrediction.priceRange.max.toLocaleString()} ₺
              </Text>
            </View>
            
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Tahmin Güven Seviyesi: %{pricePrediction.confidence}</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${pricePrediction.confidence}%` },
                    pricePrediction.confidence >= 80 ? styles.confidenceHigh :
                    pricePrediction.confidence >= 60 ? styles.confidenceMedium :
                    styles.confidenceLow
                  ]} 
                />
              </View>
            </View>
            
            <Text style={styles.sampleText}>
              {pricePrediction.analysis.sampleSize} benzer ürün analiz edilerek hesaplandı.
            </Text>
            
            {/* Fiyatı forma uygula butonu */}
            <TouchableOpacity 
              style={styles.applyPriceButton}
              onPress={() => {
                setPrice(pricePrediction.estimatedPrice.toString());
                Alert.alert('Başarılı', 'Tahmin edilen fiyat form alanına uygulandı!');
              }}
            >
              <Text style={styles.applyPriceButtonText}>Bu Fiyatı Kullan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => setShowPredictionDetails(!showPredictionDetails)}
            >
              <Text style={styles.detailsButtonText}>
                {showPredictionDetails ? 'Detayları Gizle' : 'Detayları Göster'}
              </Text>
            </TouchableOpacity>
            
            {showPredictionDetails && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Detaylı AI Analizi</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ortalama Fiyat:</Text>
                  <Text style={styles.detailValue}>{pricePrediction.analysis.averagePrice?.toLocaleString() || '---'} ₺</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Medyan Fiyat:</Text>
                  <Text style={styles.detailValue}>{pricePrediction.analysis.medianPrice?.toLocaleString() || '---'} ₺</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Min Fiyat:</Text>
                  <Text style={styles.detailValue}>{pricePrediction.analysis.minPrice?.toLocaleString() || '---'} ₺</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Max Fiyat:</Text>
                  <Text style={styles.detailValue}>{pricePrediction.analysis.maxPrice?.toLocaleString() || '---'} ₺</Text>
                </View>
                
                {/* ML özellikleri detayları */}
                {pricePrediction.analysis?.features && pricePrediction.analysis.features.length > 0 && (
                  <View style={styles.featuresContainer}>
                    <Text style={styles.featuresTitle}>Özellik Etkileri:</Text>
                    {pricePrediction.analysis.features.map((feature, idx) => (
                      <View key={feature.name || idx} style={styles.featureItem}>
                        <Text style={styles.featureName}>
                          {feature.name === 'storage' ? 'Depolama' : 
                           feature.name === 'ram' ? 'RAM' :
                           feature.name === 'brand' ? 'Marka' : 
                           feature.name === 'processor' ? 'İşlemci' :
                           feature.name === 'type' ? 'Cihaz Tipi' :
                           feature.name === 'size' ? 'Beden/Boyut' :
                           feature.name === 'material' ? 'Malzeme' :
                           feature.name === 'season' ? 'Sezon' :
                           feature.name === 'sport' ? 'Spor Dalı' :
                           feature.name === 'level' ? 'Seviye' :
                           feature.name === 'year' ? 'Yıl' :
                           feature.name === 'mileage' ? 'Kilometre' :
                           feature.name === 'fuel' ? 'Yakıt' :
                           feature.name === 'has_warranty' ? 'Garanti' :
                           feature.name}: {feature.value}
                        </Text>
                        <Text style={[
                          styles.featureImpact,
                          feature.impact > 0 ? styles.positiveImpact : 
                          feature.impact < 0 ? styles.negativeImpact : styles.neutralImpact
                        ]}>
                          {feature.impact > 0 ? '+' : ''}{feature.impact?.toLocaleString()} ₺
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

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
        
        {/* Yapay Zeka Fiyat Tahmini */}
        {renderPricePrediction()}
        
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
  // Özellikler için stiller
  attributesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  attributesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  pickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Fiyat tahmini için stiller
  predictionContainer: {
    backgroundColor: '#f0f7ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#c5d9f1',
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0066cc',
  },
  predictionPrompt: {
    alignItems: 'center',
    padding: 10,
  },
  predictionText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#444',
  },
  predictionSubText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  predictionButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  predictionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  attributesRequiredText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  aiPredictionButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  cancelAiButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  cancelAiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  predictionResult: {
    padding: 5,
  },
  aiIndicator: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  aiIndicatorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  estimatedPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  priceRange: {
    fontSize: 12,
    color: '#666',
  },
  confidenceContainer: {
    marginBottom: 10,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  confidenceBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
  },
  confidenceHigh: {
    backgroundColor: '#4CAF50',
  },
  confidenceMedium: {
    backgroundColor: '#2196F3',
  },
  confidenceLow: {
    backgroundColor: '#FFC107',
  },
  sampleText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  detailsButton: {
    padding: 5,
  },
  detailsButtonText: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  featureName: {
    color: '#666',
  },
  featureImpact: {
    fontWeight: 'bold',
    color: '#333',
  },
  positiveImpact: {
    color: '#4CAF50',
  },
  negativeImpact: {
    color: '#D32F2F',
  },
  neutralImpact: {
    color: '#666',
  },
  applyPriceButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
  },
  applyPriceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingSubText: {
    marginTop: 5,
    color: '#999',
  },
});

export default AddProductScreen; 