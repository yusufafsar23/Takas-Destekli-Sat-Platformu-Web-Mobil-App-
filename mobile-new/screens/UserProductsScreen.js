import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import productService from '../services/productService';
import api, { API_SERVER_URL } from '../services/api';
import axios from 'axios';
import { getProductImageUrl } from '../services/imageHelper';

// Fetch products directly from API if needed
const fetchProductsDirectly = async (userId) => {
  try {
    console.log('Directly fetching products from API for user:', userId);
    const response = await axios.get(`${API_SERVER_URL}/api/products/user/${userId}`);
    console.log('Direct API response:', response.status);
    return response.data;
  } catch (error) {
    console.error('Direct API request failed:', error.message);
    try {
      // Try fallback to general products endpoint
      console.log('Trying fallback to general products endpoint');
      const fallbackResponse = await axios.get(`${API_SERVER_URL}/api/products?limit=20`);
      console.log('Fallback response received:', fallbackResponse.status);
      return fallbackResponse.data;
    } catch (fallbackError) {
      console.error('Fallback request also failed:', fallbackError.message);
      return { data: [] };
    }
  }
};

const UserProductsScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const { user } = useAuth();
  
  // Fetch products from server
  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products. UserId:', userId || 'current user');
      
      let productsData = [];
      
      // Try using the service first
      try {
        if (userId) {
          console.log(`Getting products for user ID: ${userId}`);
          const response = await productService.getUserProducts(userId);
          console.log('Service response for user products:', response);
          
          if (response && response.products) {
            productsData = response.products;
          } else if (response && response.data) {
            productsData = response.data;
          } else if (response && Array.isArray(response)) {
            productsData = response;
          } else {
            // Try direct API request if service response is not as expected
            const directResponse = await fetchProductsDirectly(userId);
            productsData = directResponse.data || directResponse.products || 
                          (Array.isArray(directResponse) ? directResponse : []);
          }
          
          // Check if this is the current user
          const currentUserId = user?.id || user?._id;
          setIsCurrentUser(currentUserId === userId);
        } else {
          // Current user's products
          console.log('Getting products for current user');
          const response = await productService.getCurrentUserProducts();
          console.log('Service response for current user products:', response);
          
          if (response && response.products) {
            productsData = response.products;
          } else if (response && response.data) {
            productsData = response.data;
          } else if (response && Array.isArray(response)) {
            productsData = response;
          } else {
            // Try direct API request if service response is not as expected
            const currentUserId = user?.id || user?._id;
            if (currentUserId) {
              const directResponse = await fetchProductsDirectly(currentUserId);
              productsData = directResponse.data || directResponse.products || 
                            (Array.isArray(directResponse) ? directResponse : []);
            }
          }
          
          setIsCurrentUser(true);
        }
      } catch (serviceError) {
        console.log('Service request failed, trying direct API:', serviceError.message);
        
        // Try direct API call as fallback
        const targetUserId = userId || user?.id || user?._id;
        if (targetUserId) {
          const directResponse = await fetchProductsDirectly(targetUserId);
          productsData = directResponse.data || directResponse.products || 
                        (Array.isArray(directResponse) ? directResponse : []);
        }
      }
      
      console.log(`Final products count: ${productsData.length}`);
      setProducts(productsData);
    } catch (error) {
      console.error('Ürünler alınırken hata:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Hata', 'Ürünler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProducts();
  }, [userId, user]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };
  
  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };
  
  const handleProductPress = (product) => {
    // Check user ownership more carefully - compare both ID formats and account for different data structures
    const currentUserId = user?.id || user?._id;
    const productOwnerId = product.owner?._id || product.owner?.id || 
                         product.seller?._id || product.seller?.id || 
                         product.userId || product.createdBy?._id || product.createdBy;
    
    const isProductOwner = currentUserId && 
      (isCurrentUser || // If we already determined this is the user's profile
       productOwnerId === currentUserId || 
       String(productOwnerId) === String(currentUserId));
    
    console.log('Product ownership check:', {
      isCurrentUser,
      currentUserId,
      productOwnerId,
      isProductOwner
    });
    
    // FORCE OWNERSHIP TRUE for users viewing their own products from their profile
    // Bu çok önemli bir değişiklik - Kullanıcı kendi profil sayfasından ürünlerine girerken
    // her zaman "Düzenle" butonu görmeli
    const ownership = isCurrentUser ? true : isProductOwner;
    
    // Ürün ID'si kontrolü
    const productId = product.id || product._id;
    if (!productId) {
      console.error('Ürün ID\'si bulunamadı!');
      return;
    }
    
    console.log(`Ürün detay sayfasına yönlendiriliyor: productId=${productId}, isOwner=${ownership}, fromUserProducts=${isCurrentUser}`);
    
    // Navigate to ProductDetail with correct parameters
    navigation.navigate('ProductDetail', { 
      productId: productId,
      fromUserProducts: isCurrentUser, // True if from user's own products
      isOwner: ownership,  // Force true when coming from user's own products list
      fromUserProfile: isCurrentUser // Extra parameter to indicate it's from user's profile
    });
  };
  
  const renderProduct = ({ item }) => {
    console.log('Rendering product:', item.title || 'Unknown product', 'ID:', item.id || item._id || 'Unknown ID');
    
    // Add fallback for empty products
    if (!item) {
      console.log('Received empty item in renderProduct');
      return null;
    }
    
    const imageUrl = getProductImageUrl(item);
    console.log(`Final image URL for ${item.title || 'Unknown product'}: ${imageUrl}`);
    
    // Ürün kimliğini al
    const productId = item.id || item._id;
    
    // Düzenleme fonksiyonu
    const handleEditProduct = (e) => {
      e.stopPropagation(); // Kart tıklamasını engelle
      if (!productId) {
        Alert.alert('Hata', 'Ürün kimliği bulunamadı.');
        return;
      }
      navigation.navigate('EditProduct', { productId });
    };
    
    // Silme fonksiyonu
    const handleDeleteProduct = (e) => {
      e.stopPropagation(); // Kart tıklamasını engelle
      if (!productId) {
        Alert.alert('Hata', 'Ürün kimliği bulunamadı.');
        return;
      }
      
      Alert.alert(
        'Ürünü Sil',
        'Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Sil', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Ürünü sil
                const response = await productService.deleteProduct(productId);
                
                if (response && (response.success || response.status === 200)) {
                  // Başarılı silme işlemi
                  Alert.alert('Başarılı', 'Ürün başarıyla silindi.');
                  // Listeyi yenile
                  fetchProducts();
                } else {
                  // Başarısız silme işlemi
                  Alert.alert('Hata', 'Ürün silinirken bir hata oluştu. Lütfen tekrar deneyin.');
                }
              } catch (error) {
                console.error('Ürün silme hatası:', error);
                Alert.alert('Hata', 'Ürün silinirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            }
          }
        ]
      );
    };
    
    return (
      <View style={styles.productCardContainer}>
        <Card
          title={item.title || 'İsimsiz Ürün'}
          description={(item.description?.substring(0, 50) || 'Açıklama bulunmuyor') + 
            (item.description?.length > 50 ? '...' : '')}
          price={item.price || 0}
          imageUrl={imageUrl}
          onPress={() => handleProductPress(item)}
          style={styles.productCard}
        />
        
        {isCurrentUser && (
          <View style={styles.productActions}>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEditProduct}
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDeleteProduct}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  // Loading indicator
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Ürünler Yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header with title and possibly add button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isCurrentUser ? 'Ürünlerim' : 'Kullanıcının Ürünleri'}
        </Text>
        
        {isCurrentUser && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add-circle" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Products list */}
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            {isCurrentUser 
              ? 'Henüz bir ürün eklemediniz. Yeni bir ürün eklemek için "+" butonuna tıklayın.'
              : 'Bu kullanıcının henüz bir ürünü bulunmamaktadır.'}
          </Text>
          
          {isCurrentUser && (
            <Button 
              text="Yeni Ürün Ekle" 
              onPress={handleAddProduct} 
              style={styles.emptyButton}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item, index) => (item.id || item._id || `product-${index}`).toString()}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B6B']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
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
  productList: {
    padding: 16,
    paddingBottom: 30,
  },
  productCardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  productCard: {
    width: '100%',
  },
  productActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    zIndex: 10,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    minWidth: 200,
  },
});

export default UserProductsScreen; 