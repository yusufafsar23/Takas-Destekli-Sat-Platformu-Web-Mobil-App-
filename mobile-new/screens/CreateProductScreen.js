import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { Button } from '../components/Button';
import { productService } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';

const CreateProductScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('İyi');
  const [location, setLocation] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [acceptsTradeOffers, setAcceptsTradeOffers] = useState(true);
  
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
  
  const handleCreateProduct = async () => {
    if (!title || !description || !category || !condition || !location) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    
    if (!price && price !== '0') {
      Alert.alert('Eksik Fiyat', 'Lütfen bir fiyat girin veya takas için 0 yazın.');
      return;
    }
    
    if (imageUris.length === 0) {
      Alert.alert('Görsel Gerekli', 'Lütfen en az bir ürün görseli ekleyin.');
      return;
    }
    
    try {
      setSaving(true);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('location', location);
      formData.append('acceptsTradeOffers', acceptsTradeOffers.toString());
      
      // Resimleri ekle
      if (imageUris && imageUris.length > 0) {
        imageUris.forEach((uri, index) => {
          const filename = uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image';
          
          formData.append('images', {
            uri: uri,
            name: filename,
            type
          });
        });
      }
      
      // Ürünü oluştur
      await productService.createProduct(formData);
      
      Alert.alert(
        'Başarılı', 
        'Ürün başarıyla eklendi.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('UserProducts') }]
      );
    } catch (err) {
      console.error('Ürün eklenirken hata:', err);
      Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
        <Text style={styles.heading}>Yeni Ürün Ekle</Text>
        
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
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Kategori"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Durum*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={condition}
              onValueChange={(itemValue) => setCondition(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Yeni" value="Yeni" />
              <Picker.Item label="Yeni Gibi" value="Yeni Gibi" />
              <Picker.Item label="İyi" value="İyi" />
              <Picker.Item label="Makul" value="Makul" />
              <Picker.Item label="Kötü" value="Kötü" />
            </Picker>
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
          <View style={styles.checkboxContainer}>
            <Text style={styles.label}>Takas Kabul Edilir</Text>
            <Switch
              value={acceptsTradeOffers}
              onValueChange={setAcceptsTradeOffers}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={acceptsTradeOffers ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.helperText}>
            Diğer kullanıcılar bu ürün için takas teklifi gönderebilir.
          </Text>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ürün Görselleri*</Text>
          
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
            text={saving ? "Kaydediliyor..." : "Ürünü Ekle"} 
            onPress={handleCreateProduct}
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
  },
  picker: {
    height: 50,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    fontSize: 36,
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
    backgroundColor: '#FF6B6B',
  },
  backButton: {
    marginTop: 10,
  }
});

export default CreateProductScreen; 