import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Switch,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { productService, categoryService, tradeOfferService } from '../services';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, getImageUrl } from '../services/imageHelper';
import * as ImagePicker from 'expo-image-picker';
import { PRODUCT_STATUS, CATEGORIES } from '../constants';

const TradeOfferScreen = ({ route, navigation }) => {
  const { productId, sellerId, productTitle } = route.params || {};
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [targetProduct, setTargetProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  
  // Yeni ürün ekleme için state değişkenleri
  const [newProductTitle, setNewProductTitle] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductCondition, setNewProductCondition] = useState('İyi');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState(''); // Kategori ID'si için yeni state
  const [newProductPrice, setNewProductPrice] = useState('0');
  const [newProductImages, setNewProductImages] = useState([]);
  const [makeProductActive, setMakeProductActive] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  
  // Kategori listesi ve yükleme durumu için state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Kategori dropdown için state ve modal
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  
  // TextInput referansları
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const conditionInputRef = useRef(null);
  const priceInputRef = useRef(null);
  
  // İlk yükleme
  useEffect(() => {
    if (!user) {
      Alert.alert(
        "Hata",
        "Takas teklifi göndermek için giriş yapmanız gerekiyor.",
        [{ text: "Tamam", onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Ürün ID'si kontrolü
    if (!productId) {
      setLoading(false);
      Alert.alert(
        "Hata",
        "Geçersiz ürün bilgisi. Lütfen tekrar deneyin.",
        [{ text: "Tamam", onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Kategorileri ve ürün verilerini yükle
    Promise.all([fetchData(), fetchCategories()]);
  }, []);

  // Kategorileri yükleme fonksiyonu
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoryService.getCategories();
      console.log('API kategori yanıtı (ham):', JSON.stringify(response));
      
      let categoryData = [];
      
      if (response && response.success && Array.isArray(response.data)) {
        // API'den gelen verileri kullan
        console.log('API kategorileri kullanılıyor, sayı:', response.data.length);
        categoryData = response.data;
      } else if (response && Array.isArray(response)) {
        // Doğrudan dizi yanıtı (eski format)
        console.log('Dizi yanıtı kategorileri kullanılıyor, sayı:', response.length);
        categoryData = response;
      } else if (response && response.data && Array.isArray(response.data.data)) {
        // İç içe data yapısı (yeni API formatı)
        console.log('İç içe data yapısı kategorileri kullanılıyor, sayı:', response.data.data.length);
        categoryData = response.data.data;
      } else {
        // API'den veri gelmezse constants'daki kategorileri kullan
        console.log('Varsayılan kategoriler kullanılıyor');
        categoryData = CATEGORIES || [];
      }
      
      // Kategorilerin ID yapısını kontrol et ve logla
      categoryData.forEach((cat, index) => {
        console.log(`Kategori ${index+1}: ${cat.name}, ID: ${cat._id || cat.id}, Tip: ${typeof (cat._id || cat.id)}`);
      });
      
      setCategories(categoryData);
    } catch (error) {
      console.error('Kategorileri yüklerken hata:', error);
      // Hata durumunda varsayılan kategorileri göster
      setCategories(CATEGORIES || []);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Ürün ID'si kontrolü (ek güvenlik)
      if (!productId) {
        throw new Error('Geçersiz ürün ID\'si');
      }

      // Fetch product details
      const productResponse = await productService.getProduct(productId);
      let targetProductData;
      if (productResponse && productResponse.success && productResponse.data) {
        targetProductData = productResponse.data;
        setTargetProduct(targetProductData);
      } else if (productResponse) {
        targetProductData = productResponse;
        setTargetProduct(targetProductData);
      }

      // Check if the product accepts trade offers
      if (targetProductData && targetProductData.acceptsTradeOffers === false) {
        Alert.alert(
          "Hata",
          "Bu ürün takas tekliflerine kapalıdır.",
          [{ text: "Tamam", onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Fetch user's products
      const userProductsResponse = await productService.getUserProducts(user._id);
      if (userProductsResponse && userProductsResponse.success && userProductsResponse.data) {
        // Filter out the current product if it belongs to the user
        const filteredProducts = userProductsResponse.data.filter(
          product => product._id !== productId
        );
        setUserProducts(filteredProducts);
      } else if (Array.isArray(userProductsResponse)) {
        const filteredProducts = userProductsResponse.filter(
          product => product._id !== productId
        );
        setUserProducts(filteredProducts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Hata', 'Ürün bilgileri yüklenirken bir hata oluştu.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (product) => {
    const isSelected = selectedProducts.some(item => item._id === product._id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(item => item._id !== product._id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleSendOffer = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Uyarı', 'Lütfen takas için en az bir ürün seçin.');
      return;
    }

    setLoading(true);
    try {
      // Backend yalnızca tek ürün - tek ürün takasına izin veriyor
      // Birden fazla ürün seçilmişse, her biri için ayrı teklif gönderiyoruz
      const sendOffers = async () => {
        const results = [];
        let success = 0;
        let failure = 0;
        
        // Her seçili ürün için teklif gönder
        for (const product of selectedProducts) {
          try {
            // Takas teklifi oluşturmak için verileri hazırla
            const tradeOfferData = {
              requestedProductId: productId, // Talep edilen ürün ID'si
              offeredProductId: product._id, // Teklif edilen ürün ID'si
              message: message.trim(), // Mesaj (opsiyonel)
            };
            
            console.log(`${product.title} için takas teklifi gönderiliyor:`, JSON.stringify(tradeOfferData));
            
            // tradeOfferService ile API çağrısı yap
            const response = await tradeOfferService.createTradeOffer(tradeOfferData);
            console.log(`${product.title} için takas teklifi başarıyla gönderildi:`, JSON.stringify(response));
            
            results.push({
              product: product.title,
              success: true,
              response
            });
            
            success++;
          } catch (error) {
            console.error(`${product.title} için takas teklifi gönderilirken hata:`, error);
            results.push({
              product: product.title,
              success: false,
              error
            });
            
            failure++;
          }
        }
        
        return { results, success, failure };
      };
      
      // Teklifleri gönder
      const { success, failure } = await sendOffers();
      
      // Sonuca göre kullanıcıyı bilgilendir
      if (success > 0 && failure === 0) {
        // Tüm teklifler başarılı
        Alert.alert(
          'Başarılı',
          `${success} ürün için takas teklifiniz gönderildi. Satıcı yanıt verdiğinde bildirim alacaksınız.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else if (success > 0 && failure > 0) {
        // Bazı teklifler başarılı, bazıları başarısız
        Alert.alert(
          'Kısmen Başarılı',
          `${success} ürün için takas teklifi gönderildi, ancak ${failure} ürün için teklif gönderilemedi.`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        // Tüm teklifler başarısız
        Alert.alert(
          'Hata',
          'Takas teklifleri gönderilemedi. Lütfen daha sonra tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Takas teklifi gönderme hatası:', error);
      console.error('Hata detayları:', error.response?.data || error.message);
      
      Alert.alert('Hata', 'Takas teklifi gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Yeni ürün için resim seçme fonksiyonu
  const pickImage = async () => {
    try {
      // Galeri iznini kontrol et
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', 'Resim seçmek için galeri erişimine izin vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        const imageType = result.assets[0].type || 'image/jpeg';
        const imageName = result.assets[0].fileName || `image_${Date.now()}.jpg`;
        
        setNewProductImages([...newProductImages, {
          uri: imageUri,
          type: imageType,
          name: imageName
        }]);
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Resmi kaldırma fonksiyonu
  const removeImage = (index) => {
    setNewProductImages(newProductImages.filter((_, i) => i !== index));
  };

  // Yeni ürün ekleme fonksiyonu
  const handleAddNewProduct = async () => {
    // Form kontrolü
    if (!newProductTitle || !newProductDescription || !newProductCategoryId || !newProductCondition || newProductImages.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun ve en az bir resim ekleyin.');
      return;
    }
    
    if (!newProductCategoryId) {
      Alert.alert('Kategori Hatası', 'Lütfen geçerli bir kategori seçin.');
      return;
    }
    
    setAddingProduct(true);
    
    try {
      // FormData oluştur
      const formData = new FormData();
      formData.append('title', newProductTitle.trim());
      formData.append('description', newProductDescription.trim());
      formData.append('price', newProductPrice || '0');
      
      // Kategori ID kontrolü - MongoDB ObjectId formatı kontrolü
      if (typeof newProductCategoryId === 'string' && /^[0-9a-fA-F]{24}$/.test(newProductCategoryId)) {
        console.log('Geçerli MongoDB ObjectID kategori gönderiliyor:', newProductCategoryId);
        formData.append('category', newProductCategoryId);
      } else {
        console.log('Geçersiz kategori ID:', newProductCategoryId, 'kategori gönderilmiyor');
        // Sunucu tarafında varsayılan kategori atanmasına izin ver
      }
      
      formData.append('condition', newProductCondition);
      formData.append('location', user.location || 'Belirtilmedi');
      formData.append('acceptsTradeOffers', 'true');
      
      // Ürün durumunu ayarla (aktif veya pasif)
      const status = makeProductActive ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.INACTIVE;
      formData.append('status', status);
      
      // Resimleri ekle
      newProductImages.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.name || `image_${index}.jpg`
        });
      });
      
      console.log('Gönderilen kategori ID:', newProductCategoryId);
      
      // Ürünü oluştur
      const response = await productService.createProduct(formData);
      console.log('Ürün ekleme yanıtı:', JSON.stringify(response));
      
      // Eklenen ürünü seçili ürünlere ekle
      if (response && (response._id || response.id || (response.data && (response.data._id || response.data.id)))) {
        // Yanıt verisi yapısına göre product ID'yi al
        const productId = response._id || response.id || (response.data && (response.data._id || response.data.id));
        
        const newProduct = {
          _id: productId,
          id: productId,
          title: newProductTitle,
          description: newProductDescription,
          price: newProductPrice || '0',
          category: newProductCategoryId,
          condition: newProductCondition,
          images: newProductImages.map(img => img.uri),
          status: status
        };
        
        // Ürün listesini güncelle ve yeni ürünü seç
        setUserProducts([newProduct, ...userProducts]);
        setSelectedProducts([newProduct, ...selectedProducts]);
        
        // Modalı kapat ve form alanlarını temizle
        setShowNewProductModal(false);
        setNewProductTitle('');
        setNewProductDescription('');
        setNewProductCategory('');
        setNewProductCategoryId('');
        setNewProductCondition('İyi');
        setNewProductPrice('0');
        setNewProductImages([]);
        setMakeProductActive(false);
        
        Alert.alert(
          'Başarılı', 
          makeProductActive 
            ? 'Ürün başarıyla eklendi ve pazarda yayınlandı!' 
            : 'Ürün başarıyla eklendi! Ürün sadece takas teklifleri için kullanılacak ve pazarda görünmeyecek.'
        );
      } else {
        throw new Error('Sunucudan geçerli ürün ID\'si alınamadı');
      }
    } catch (error) {
      console.error('Ürün ekleme hatası:', error);
      console.error('Hata detayları:', error.response?.data || error.message);
      
      let errorMessage = 'Ürün eklenirken bir sorun oluştu.';
      
      // Kategori hatası kontrolü
      if (error.message?.includes('ObjectId') || error.response?.data?.error?.message?.includes('ObjectId')) {
        errorMessage = 'Kategori seçimi ile ilgili bir sorun oluştu. Lütfen farklı bir kategori seçin.';
      }
      
      Alert.alert('Hata', errorMessage + ' Lütfen tekrar deneyin.');
    } finally {
      setAddingProduct(false);
    }
  };

  // Modal açılıp kapanma kontrol fonksiyonu
  const toggleModal = (value) => {
    // Modal kapanacaksa ve ekleme işlemi devam etmiyorsa kapat
    if (value === false && !addingProduct) {
      setShowNewProductModal(false);
    } 
    // Modal açılacaksa aç
    else if (value === true) {
      setShowNewProductModal(true);
    }
  };

  // Bu basit dropdown fonksiyonu ile kategori seçimini direkt view içine ekleyeceğim
  const renderCategoryDropdown = () => {
    if (!categoryDropdownVisible) return null;
    
    return (
      <View style={styles.dropdownContainer}>
        <ScrollView 
          style={{maxHeight: 200}} 
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {categories.length > 0 ? (
            categories.map((category) => (
              <TouchableOpacity 
                key={category._id || category.id || Math.random().toString()}
                style={styles.dropdownItem}
                onPress={() => {
                  const categoryId = category._id || category.id;
                  console.log(`Kategori seçildi: ${category.name}, ID: ${categoryId}`);
                  setNewProductCategory(category.name);
                  setNewProductCategoryId(categoryId);
                  setCategoryDropdownVisible(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{category.name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.dropdownItem}>
              <Text style={styles.dropdownItemText}>Kategori bulunamadı</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Yeni Ürün Ekleme Modalı
  const renderNewProductModal = () => {
    if (!showNewProductModal) return null;
    
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!addingProduct) {
            setShowNewProductModal(false);
          }
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yeni Ürün Ekle</Text>
                <TouchableOpacity 
                  onPress={() => {
                    Keyboard.dismiss();
                    if (!addingProduct) {
                      setShowNewProductModal(false);
                    }
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollViewContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View>
                    {/* Ürün Adı */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Ürün Adı*</Text>
                      <TextInput
                        ref={titleInputRef}
                        style={styles.formInput}
                        value={newProductTitle}
                        onChangeText={(text) => setNewProductTitle(text)}
                        placeholder="Ürün adını girin"
                        returnKeyType="next"
                        onSubmitEditing={() => descriptionInputRef.current?.focus()}
                      />
                    </View>
                    
                    {/* Ürün Açıklaması */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Ürün Açıklaması*</Text>
                      <TextInput
                        ref={descriptionInputRef}
                        style={[styles.formInput, styles.textArea]}
                        value={newProductDescription}
                        onChangeText={(text) => setNewProductDescription(text)}
                        placeholder="Ürün açıklamasını girin"
                        multiline={true}
                        numberOfLines={4}
                        textAlignVertical="top"
                        returnKeyType="next"
                        onSubmitEditing={() => categoryInputRef.current?.focus()}
                      />
                    </View>
                    
                    {/* Kategori - Dropdown menü yaklaşımı */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Kategori*</Text>
                      <View style={styles.dropdownWrapper}>
                        <TouchableOpacity 
                          style={styles.selectInput}
                          onPress={() => {
                            Keyboard.dismiss();
                            setCategoryDropdownVisible(!categoryDropdownVisible);
                          }}
                        >
                          <Text style={[
                            styles.selectInputText,
                            !newProductCategory && styles.placeholderText
                          ]}>
                            {newProductCategory || "Kategori seçin"}
                          </Text>
                          <Ionicons name="chevron-down" size={20} color="#999" />
                        </TouchableOpacity>
                        
                        {renderCategoryDropdown()}
                      </View>
                    </View>
                    
                    {/* Durum */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Ürün Durumu*</Text>
                      <TextInput
                        ref={conditionInputRef}
                        style={styles.formInput}
                        value={newProductCondition}
                        onChangeText={(text) => setNewProductCondition(text)}
                        placeholder="Ürün durumu (örn. İyi, Yeni Gibi)"
                        returnKeyType="next"
                        onSubmitEditing={() => priceInputRef.current?.focus()}
                      />
                    </View>
                    
                    {/* Fiyat */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Tahmini Değer (₺)</Text>
                      <TextInput
                        ref={priceInputRef}
                        style={styles.formInput}
                        value={newProductPrice}
                        onChangeText={(text) => setNewProductPrice(text)}
                        placeholder="Ürünün tahmini değeri"
                        keyboardType="numeric"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                    
                    {/* Aktif/Pasif Durumu */}
                    <View style={styles.switchContainer}>
                      <Text style={styles.switchLabel}>Ürünü pazarda yayınla</Text>
                      <Switch
                        value={makeProductActive}
                        onValueChange={(value) => setMakeProductActive(value)}
                        trackColor={{ false: "#ccc", true: "#FF6B6B" }}
                        thumbColor={makeProductActive ? "#fff" : "#f4f3f4"}
                      />
                    </View>
                    <Text style={styles.switchDescription}>
                      {makeProductActive 
                        ? 'Ürün pazarda aktif olarak listelenecek ve diğer kullanıcılar tarafından görülebilecek.' 
                        : 'Ürün sadece takas teklifinizde kullanılacak ve pazarda görünmeyecek.'}
                    </Text>
                    
                    {/* Resimler */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Ürün Resimleri*</Text>
                      <View style={styles.imagesContainer}>
                        {newProductImages.map((image, index) => (
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
                        
                        {newProductImages.length < 5 && (
                          <TouchableOpacity 
                            style={styles.addImageButton} 
                            onPress={() => {
                              Keyboard.dismiss();
                              pickImage();
                            }}
                          >
                            <View style={styles.addImageButtonContent}>
                              <Ionicons name="camera" size={40} color="#ccc" />
                              <Text style={styles.addImageText}>Resim Ekle</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.helperText}>En fazla 5 resim ekleyebilirsiniz</Text>
                    </View>
                    
                    {/* Butonlar */}
                    <View style={styles.modalButtonContainer}>
                      <Button 
                        text="Vazgeç" 
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowNewProductModal(false);
                        }} 
                        type="outline"
                        style={styles.cancelButton}
                        disabled={addingProduct}
                      />
                      <Button 
                        text={addingProduct ? "Ekleniyor..." : "Ürünü Ekle"} 
                        onPress={() => {
                          Keyboard.dismiss();
                          handleAddNewProduct();
                        }} 
                        isLoading={addingProduct}
                        style={styles.addButton}
                        disabled={addingProduct}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Target Product */}
        <View style={styles.targetProductContainer}>
          <Text style={styles.sectionTitle}>Talep Ettiğiniz Ürün</Text>
          {targetProduct && (
            <View style={styles.targetProductCard}>
              <Image 
                source={{ 
                  uri: getProductImageUrl(targetProduct)
                }} 
                style={styles.targetProductImage}
              />
              <View style={styles.targetProductInfo}>
                <Text style={styles.targetProductTitle}>{targetProduct.title}</Text>
                <Text style={styles.targetProductPrice}>{targetProduct.price} ₺</Text>
              </View>
            </View>
          )}
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.sectionTitle}>Mesajınız (İsteğe Bağlı)</Text>
          <Input
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
            placeholder="Satıcıya takas teklifi ile ilgili bir mesaj yazabilirsiniz..."
            style={styles.messageInput}
          />
        </View>

        {/* User's Products */}
        <View style={styles.userProductsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Takas İçin Ürünleriniz {selectedProducts.length > 0 ? `(${selectedProducts.length} seçili)` : ''}
            </Text>
            <TouchableOpacity 
              style={styles.addNewButton}
              onPress={() => toggleModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FF6B6B" />
              <Text style={styles.addNewButtonText}>Yeni Ürün</Text>
            </TouchableOpacity>
          </View>
          
          {userProducts.length === 0 ? (
            <View style={styles.noProductsContainer}>
              <Text style={styles.noProductsText}>Takas için ürününüz bulunmuyor.</Text>
              <Button 
                text="Yeni Ürün Ekle" 
                onPress={() => toggleModal(true)} 
                style={styles.noProductsButton}
              />
            </View>
          ) : (
            <FlatList
              data={userProducts}
              keyExtractor={(item) => item._id || item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.productCard,
                    selectedProducts.some(product => product._id === item._id) && styles.selectedProductCard
                  ]}
                  onPress={() => toggleProductSelection(item)}
                >
                  <Image 
                    source={{ 
                      uri: getProductImageUrl(item)
                    }} 
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{item.title}</Text>
                    <Text style={styles.productPrice}>{item.price} ₺</Text>
                  </View>
                  <View style={styles.checkboxContainer}>
                    {selectedProducts.some(product => product._id === item._id) ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color="#999" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              style={styles.productsList}
            />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button 
          text="Vazgeç" 
          onPress={() => navigation.goBack()} 
          type="outline"
          style={styles.cancelButton}
        />
        <Button 
          text="Teklif Gönder" 
          onPress={handleSendOffer} 
          style={styles.submitButton}
          isLoading={loading}
          disabled={selectedProducts.length === 0}
        />
      </View>

      {/* Render Modal */}
      {renderNewProductModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  addNewButtonText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  targetProductContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  targetProductCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  targetProductImage: {
    width: 100,
    height: 100,
    backgroundColor: '#e1e4e8',
  },
  targetProductInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  targetProductTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  targetProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  messageContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  messageInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  userProductsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 100, // Space for action buttons
  },
  noProductsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noProductsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 15,
  },
  noProductsButton: {
    marginTop: 10,
  },
  productsList: {
    width: '100%',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedProductCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f0fff0',
  },
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: '#e1e4e8',
  },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  checkboxContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalContent: {
    width: '95%',
    height: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  modalScrollViewContent: {
    paddingBottom: 30,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  imageContainer: {
    width: 80,
    height: 80,
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
    width: 80,
    height: 80,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
  },
  addImageButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  addButton: {
    flex: 2,
    marginLeft: 8,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectInputText: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 9999,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 5,
    zIndex: 9999,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
});

export default TradeOfferScreen; 