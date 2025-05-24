import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Image,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { productService } from '../services';
import { useAuth } from '../context/AuthContext';

const TradeOfferScreen = ({ route, navigation }) => {
  const { productId, sellerId, productTitle } = route.params || {};
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [targetProduct, setTargetProduct] = useState(null);
  const [message, setMessage] = useState('');

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

    // Fetch target product details and user's products
    fetchData();
  }, []);

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
      // Here you would normally call an API to send the trade offer
      // For now, we'll just show a success message
      setTimeout(() => {
        Alert.alert(
          'Başarılı',
          'Takas teklifiniz gönderildi. Satıcı yanıt verdiğinde bildirim alacaksınız.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error sending trade offer:', error);
      Alert.alert('Hata', 'Takas teklifi gönderilirken bir hata oluştu.');
      setLoading(false);
    }
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
                  uri: targetProduct.images && targetProduct.images.length > 0 
                    ? targetProduct.images[0] 
                    : 'https://via.placeholder.com/150' 
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
          <Text style={styles.sectionTitle}>
            Takas İçin Ürünleriniz {selectedProducts.length > 0 ? `(${selectedProducts.length} seçili)` : ''}
          </Text>
          {userProducts.length === 0 ? (
            <Text style={styles.noProductsText}>Takas için ürününüz bulunmuyor. Önce ürün eklemelisiniz.</Text>
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
                      uri: item.images && item.images.length > 0 
                        ? item.images[0] 
                        : 'https://via.placeholder.com/150' 
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
          text={userProducts.length === 0 ? "Ürün Ekle" : "Teklif Gönder"} 
          onPress={userProducts.length === 0 ? () => navigation.navigate('AddProduct') : handleSendOffer} 
          style={styles.submitButton}
          isLoading={loading}
        />
      </View>
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
  noProductsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
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
});

export default TradeOfferScreen; 