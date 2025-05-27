import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal
} from 'react-native';
import { Button } from '../components/Button';
import { productService } from '../services';
import { getProductImageUrl } from '../services/imageHelper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { PRODUCT_STATUS, CATEGORIES } from '../constants';

const EditProductScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [originalProduct, setOriginalProduct] = useState(null);
  
  // Form alanları
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState(PRODUCT_STATUS.ACTIVE);
  const [productImages, setProductImages] = useState([]);
  const [imageUris, setImageUris] = useState([]);
  const [acceptsTradeOffers, setAcceptsTradeOffers] = useState(true);
  
  useEffect(() => {
    fetchProductDetails();
  }, [productId]);
  
  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getProduct(productId);
      
      let productData = null;
      if (response.data) {
        productData = response.data;
      } else if (typeof response === 'object') {
        productData = response;
      }
      
      if (!productData) {
        throw new Error('Ürün verileri alınamadı');
      }
      
      // Ürün sahibini kontrol et
      const ownerId = productData.owner?._id || productData.owner?.id || 
                     productData.seller?._id || productData.seller?.id || 
                     productData.userId || productData.createdBy?._id || 
                     (typeof productData.createdBy === 'string' ? productData.createdBy : null);
                     
      const currentUserId = user?.id || user?._id;
      
      // Eğer kullanıcı ürün sahibi değilse uyarı ver ve geri gönder
      const isUserOwner = currentUserId && 
        (ownerId === currentUserId || String(ownerId) === String(currentUserId));
      
      if (!isUserOwner) {
        Alert.alert(
          "Erişim Engellendi", 
          "Bu ürünü düzenleme izniniz yok.",
          [{ text: "Tamam", onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Orijinal ürünü sakla
      setOriginalProduct(productData);
      
      // Form alanlarını doldur
      setTitle(productData.title || '');
      setDescription(productData.description || '');
      setPrice(productData.price ? productData.price.toString() : '');
      
      // Kategori bilgisini ayarla
      if (productData.category) {
        if (typeof productData.category === 'object') {
          // Obje olarak gelen kategori bilgisi
          const categoryName = productData.category.name;
          if (categoryName) {
            // İsme göre CATEGORIES'den eşleşen kategoriyi bul
            const matchedCategory = CATEGORIES.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (matchedCategory) {
              setCategory(matchedCategory.id);
              console.log(`Kategori eşleşti: ${matchedCategory.name}, ID: ${matchedCategory.id}`);
            } else {
              // Eşleşme yoksa objenin ID'sini al
              setCategory(productData.category._id || productData.category.id || '');
              console.log('Kategori eşleşmedi, doğrudan ID kullanılıyor:', 
                productData.category._id || productData.category.id);
            }
          } else {
            // İsim yoksa ID değerini kullan
            setCategory(productData.category._id || productData.category.id || '');
          }
        } else if (typeof productData.category === 'string') {
          // String olarak gelen kategori - ID veya isim olabilir
          // Önce CATEGORIES'de isim olarak ara
          const matchedByName = CATEGORIES.find(c => c.name.toLowerCase() === productData.category.toLowerCase());
          if (matchedByName) {
            setCategory(matchedByName.id);
            console.log(`Kategori ismi eşleşti: ${matchedByName.name}, ID: ${matchedByName.id}`);
          } else {
            // Eşleşen isim yoksa, doğrudan değeri kullan
            setCategory(productData.category);
            console.log('Kategori string değeri kullanılıyor:', productData.category);
          }
        }
      }
      
      setCondition(productData.condition || 'İyi');
      setLocation(productData.location || '');
      
      // Status değerini ayarla
      if (productData.status) {
        setStatus(productData.status);
      }
      
      // Takas kabul edilir durumunu ayarla
      if (productData.acceptsTradeOffers !== undefined) {
        setAcceptsTradeOffers(productData.acceptsTradeOffers);
      }
      
      // Ürün resimleri
      if (productData.images && productData.images.length > 0) {
        const images = productData.images.map(image => {
          if (typeof image === 'string') {
            return image;
          } else if (image.url) {
            return image.url;
          } else if (image.path) {
            return image.path;
          }
          return null;
        }).filter(Boolean);
        
        setProductImages(images);
        setImageUris(images);
      }
    } catch (err) {
      console.error('Ürün detayları alınırken hata:', err);
      setError('Ürün bilgileri yüklenirken bir hata oluştu.');
      Alert.alert('Hata', 'Ürün bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Görsel seçmek için galeriye erişim izni vermeniz gerekiyor.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newImageUri = result.assets[0].uri;
      setImageUris(prev => [...prev, newImageUri]);
    }
  };
  
  const removeImage = (index) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleUpdateProduct = async () => {
    if (!title || !description || !category || !condition || !location) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    
    if (!price && price !== '0') {
      Alert.alert('Eksik Fiyat', 'Lütfen bir fiyat girin veya takas için 0 yazın.');
      return;
    }
    
    try {
      setSaving(true);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      
      // Kategori değeri düzeltmesi
      // Eğer kategori değişmediyse, orijinal kategori ID'sini kullan
      if (originalProduct && originalProduct.category) {
        // Kategori değişti mi kontrol et
        const originalCategoryId = typeof originalProduct.category === 'object' 
          ? originalProduct.category._id 
          : originalProduct.category;
          
        const originalCategoryName = typeof originalProduct.category === 'object'
          ? originalProduct.category.name
          : null;
          
        // Seçilen kategori ile orijinal kategori aynı mı?
        const selectedCategoryObj = CATEGORIES.find(cat => cat.id === category);
        const selectedCategoryName = selectedCategoryObj ? selectedCategoryObj.name : null;
        
        // Eğer kategori değiştiyse
        if (selectedCategoryName && originalCategoryName !== selectedCategoryName) {
          // Kategori adını gönder (backend bunu ID'ye dönüştürecek)
          formData.append('category', selectedCategoryName);
          console.log(`Yeni kategori adı gönderiliyor: ${selectedCategoryName}`);
        } 
        // Değişmediyse ve orijinal bir ObjectId varsa onu kullan
        else if (originalCategoryId && /^[0-9a-fA-F]{24}$/.test(originalCategoryId)) {
          formData.append('category', originalCategoryId);
          console.log(`Orijinal kategori ID kullanılıyor: ${originalCategoryId}`);
        }
        // Hiçbir koşul sağlanmazsa kategori gönderme
        else {
          console.log('Kategori değeri uygun formatta değil, gönderilmiyor');
        }
      } else {
        // Orijinal kategori yoksa ve yeni bir kategori seçildiyse
        const selectedCategoryObj = CATEGORIES.find(cat => cat.id === category);
        if (selectedCategoryObj) {
          formData.append('category', selectedCategoryObj.name);
          console.log(`Yeni kategori adı gönderiliyor: ${selectedCategoryObj.name}`);
        }
      }
      
      formData.append('condition', condition);
      formData.append('location', location);
      formData.append('acceptsTradeOffers', String(acceptsTradeOffers)); // Boolean değil string olmalı
      formData.append('status', status);
      
      // Yeni eklenen resimleri ekle
      if (imageUris && imageUris.length > 0) {
        imageUris.forEach((uri, index) => {
          // Sadece yeni resimler (yerel URI'lar) için append et
          if (uri.startsWith('file://') || uri.startsWith('content://')) {
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image';
            
            formData.append('images', {
              uri: uri,
              name: filename,
              type
            });
          }
        });
      }
      
      // Eğer mevcut resimler kaldırıldıysa, onları bildir
      if (originalProduct && originalProduct.images) {
        const originalUrls = originalProduct.images.map(img => 
          typeof img === 'string' ? img : (img.url || img.path || '')
        ).filter(Boolean);
        
        // Kaldırılan resimler
        const removedImages = originalUrls.filter(url => !imageUris.includes(url));
        
        if (removedImages.length > 0) {
          formData.append('removedImages', JSON.stringify(removedImages));
        }
      }
      
      // Ürünü güncelle
      await productService.updateProduct(productId, formData);
      
      Alert.alert(
        'Başarılı', 
        'Ürün başarıyla güncellendi.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Ürün güncellenirken hata:', err);
      Alert.alert('Hata', 'Ürün güncellenirken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Ürün bilgileri yükleniyor...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          text="Tekrar Dene" 
          onPress={fetchProductDetails}
        />
        <Button 
          text="Geri Dön" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.heading}>Ürün Düzenle</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Başlık*</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ürün başlığı"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Açıklama*</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ürün açıklaması"
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Fiyat (₺)*</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="Fiyat (takas için 0 girin)"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Kategori*</Text>
          <View style={styles.pickerContainer}>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    category === item.id && styles.selectedItem
                  ]}
                  onPress={() => setCategory(item.id)}
                >
                  <Text 
                    style={[
                      styles.listItemText,
                      category === item.id && styles.selectedItemText
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.listContainer}
              nestedScrollEnabled={true}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Durum*</Text>
          <View style={styles.pickerContainer}>
            <FlatList
              data={['Yeni', 'Yeni Gibi', 'İyi', 'Makul', 'Kötü']}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    condition === item && styles.selectedItem
                  ]}
                  onPress={() => setCondition(item)}
                >
                  <Text 
                    style={[
                      styles.listItemText,
                      condition === item && styles.selectedItemText
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.listContainer}
              nestedScrollEnabled={true}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Konum*</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Konum (şehir, ilçe)"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ürün Durumu*</Text>
          <View style={styles.pickerContainer}>
            <FlatList
              data={[
                { label: 'Aktif', value: PRODUCT_STATUS.ACTIVE },
                { label: 'Satıldı', value: PRODUCT_STATUS.SOLD },
                { label: 'Rezerve', value: 'reserved' },
                { label: 'Pasif', value: PRODUCT_STATUS.INACTIVE }
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    status === item.value && styles.selectedItem
                  ]}
                  onPress={() => setStatus(item.value)}
                >
                  <Text 
                    style={[
                      styles.listItemText,
                      status === item.value && styles.selectedItemText
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.listContainer}
              nestedScrollEnabled={true}
            />
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Takas Kabul Edilir</Text>
          <View style={styles.pickerContainer}>
            <FlatList
              data={[
                { label: 'Evet', value: true },
                { label: 'Hayır', value: false }
              ]}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    acceptsTradeOffers === item.value && styles.selectedItem
                  ]}
                  onPress={() => setAcceptsTradeOffers(item.value)}
                >
                  <Text 
                    style={[
                      styles.listItemText,
                      acceptsTradeOffers === item.value && styles.selectedItemText
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.listContainer}
              nestedScrollEnabled={true}
            />
          </View>
          <Text style={styles.helperText}>
            Diğer kullanıcılar bu ürün için takas teklifi gönderebilir.
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ürün Görselleri</Text>
          
          <View style={styles.imageList}>
            {imageUris.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.productImage} />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity 
              style={styles.addImageButton}
              onPress={handlePickImage}
            >
              <Text style={styles.addImageButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <Button 
            text="İptal" 
            onPress={() => navigation.goBack()}
            type="secondary"
            style={styles.cancelButton}
          />
          <Button 
            text={saving ? "Kaydediliyor..." : "Güncelle"} 
            onPress={handleUpdateProduct}
            disabled={saving}
            style={styles.saveButton}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedItem: {
    backgroundColor: '#FF6B6B',
  },
  listItemText: {
    fontSize: 16,
    color: '#555',
  },
  selectedItemText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  listContainer: {
    maxHeight: 150,
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    margin: 5,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    margin: 5,
  },
  addImageButtonText: {
    fontSize: 32,
    color: '#aaa',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  backButton: {
    marginTop: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default EditProductScreen; 