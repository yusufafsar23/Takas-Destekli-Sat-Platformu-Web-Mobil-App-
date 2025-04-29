import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Switch } from 'react-native-gesture-handler';
import tradeOfferService from '../services/tradeOfferService';
import productService from '../services/productService';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';

export default function CreateTradeOfferScreen() {
  const { productId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [requestedProduct, setRequestedProduct] = useState(null);
  const [userProducts, setUserProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [additionalCash, setAdditionalCash] = useState('0');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Özel takas koşulları
  const [meetupPreferred, setMeetupPreferred] = useState(false);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [shippingPreferred, setShippingPreferred] = useState(false);
  const [shippingDetails, setShippingDetails] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Talep edilen ürünü ve kullanıcının ürünlerini yükle
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Talep edilen ürünü yükle
      const productData = await productService.getProductById(productId);
      setRequestedProduct(productData);
      
      // Kullanıcının ürünlerini yükle (sadece aktif ve takasa açık olanlar)
      const userProductsData = await productService.getUserProducts(user.id, 'active');
      const tradeableProducts = userProductsData.filter(product => 
        product.acceptsTradeOffers && product._id !== productId
      );
      setUserProducts(tradeableProducts);
      
      // Eğer takasa uygun ürün yoksa uyarı göster
      if (tradeableProducts.length === 0) {
        Alert.alert(
          'Takas Edilebilir Ürün Yok',
          'Takasa uygun aktif ürününüz bulunmamaktadır. Lütfen önce takas için ürün ekleyin.',
          [
            { text: 'Tamam', onPress: () => router.back() }
          ]
        );
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  // Ürün seçimini değiştir
  const handleProductSelect = (id) => {
    setSelectedProductId(id === selectedProductId ? null : id);
  };

  // Teklifi gönder
  const handleSubmit = async () => {
    // Ürün seçilmemişse uyarı göster
    if (!selectedProductId) {
      Alert.alert('Uyarı', 'Lütfen takas için bir ürün seçin.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Özel takas koşullarını oluştur
      const specialConditions = {
        meetupPreferred,
        meetupLocation: meetupPreferred ? meetupLocation : '',
        shippingPreferred,
        shippingDetails: shippingPreferred ? shippingDetails : '',
        additionalNotes
      };
      
      // Teklifi oluştur
      await tradeOfferService.createTradeOffer({
        requestedProductId: productId,
        offeredProductId: selectedProductId,
        additionalCashOffer: additionalCash ? parseInt(additionalCash) : 0,
        message,
        specialConditions
      });
      
      Alert.alert(
        'Başarılı',
        'Takas teklifiniz gönderildi!',
        [
          { text: 'Tamam', onPress: () => router.replace('/app/(tabs)/trade-offers') }
        ]
      );
    } catch (error) {
      console.error('Teklif gönderilirken hata:', error);
      Alert.alert('Hata', 'Teklif gönderilirken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Ürün bulunamadı
  if (!requestedProduct) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Ürün bulunamadı.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Takas Teklifi Oluştur',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Talep Edilen Ürün */}
        <View style={styles.requestedProductCard}>
          <Text style={styles.sectionTitle}>Talep Ettiğiniz Ürün</Text>
          <View style={styles.productRow}>
            <Image
              source={{ uri: requestedProduct.images?.[0]?.url || 'https://via.placeholder.com/100' }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{requestedProduct.title}</Text>
              <Text style={styles.productPrice}>{requestedProduct.price} ₺</Text>
              <Text style={styles.productOwner}>
                Satıcı: {requestedProduct.owner?.username || 'Kullanıcı'}
              </Text>
            </View>
          </View>
        </View>

        {/* Kullanıcının Ürünleri */}
        <View style={styles.userProductsSection}>
          <Text style={styles.sectionTitle}>Takas Etmek İstediğiniz Ürününüzü Seçin</Text>
          
          {userProducts.length === 0 ? (
            <View style={styles.emptyProductsContainer}>
              <FontAwesome5 name="box-open" size={48} color={Colors.muted} />
              <Text style={styles.emptyProductsText}>Takasa uygun ürününüz bulunmamakta</Text>
              <CustomButton
                title="Ürün Ekle"
                onPress={() => router.push('/add-product')}
                containerStyle={styles.addProductButton}
              />
            </View>
          ) : (
            <FlatList
              data={userProducts}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userProductCard,
                    selectedProductId === item._id && styles.selectedProductCard
                  ]}
                  onPress={() => handleProductSelect(item._id)}
                >
                  <Image
                    source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/100' }}
                    style={styles.userProductImage}
                  />
                  <View style={styles.userProductInfo}>
                    <Text style={styles.userProductTitle}>{item.title}</Text>
                    <Text style={styles.userProductPrice}>{item.price} ₺</Text>
                  </View>
                  {selectedProductId === item._id && (
                    <View style={styles.selectedCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={false}
              numColumns={2}
              contentContainerStyle={styles.productGrid}
            />
          )}
        </View>

        {/* Ek Nakit Teklifi */}
        <View style={styles.additionalCashSection}>
          <Text style={styles.sectionTitle}>Ek Nakit Teklifi (Opsiyonel)</Text>
          <Text style={styles.sectionDescription}>
            Takas etmek istediğiniz ürünlerin değerleri arasında fark varsa, ek nakit teklif edebilirsiniz.
          </Text>
          <CustomInput
            label="Nakit Teklifi (₺)"
            value={additionalCash}
            onChangeText={(text) => setAdditionalCash(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            leftIcon={<FontAwesome5 name="money-bill-wave" size={18} color={Colors.primary} />}
          />
        </View>

        {/* Mesaj */}
        <View style={styles.messageSection}>
          <Text style={styles.sectionTitle}>Mesaj (Opsiyonel)</Text>
          <CustomInput
            placeholder="Satıcıya bir mesaj yazın..."
            multiline
            value={message}
            onChangeText={setMessage}
            containerStyle={styles.messageInput}
          />
        </View>

        {/* Özel Takas Koşulları */}
        <View style={styles.specialConditionsSection}>
          <Text style={styles.sectionTitle}>Özel Takas Koşulları</Text>
          
          {/* Yüz yüze Takas */}
          <View style={styles.conditionItem}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionTitle}>Yüz yüze takas tercih ediyorum</Text>
              <Switch
                value={meetupPreferred}
                onValueChange={setMeetupPreferred}
                trackColor={{ false: '#d0d0d0', true: Colors.primary + '80' }}
                thumbColor={meetupPreferred ? Colors.primary : '#f0f0f0'}
              />
            </View>
            
            {meetupPreferred && (
              <CustomInput
                placeholder="Tercih ettiğiniz buluşma konumu"
                value={meetupLocation}
                onChangeText={setMeetupLocation}
                leftIcon={<Ionicons name="location-outline" size={18} color={Colors.primary} />}
                containerStyle={styles.conditionInput}
              />
            )}
          </View>
          
          {/* Kargo ile Takas */}
          <View style={styles.conditionItem}>
            <View style={styles.conditionHeader}>
              <Text style={styles.conditionTitle}>Kargo ile takas tercih ediyorum</Text>
              <Switch
                value={shippingPreferred}
                onValueChange={setShippingPreferred}
                trackColor={{ false: '#d0d0d0', true: Colors.primary + '80' }}
                thumbColor={shippingPreferred ? Colors.primary : '#f0f0f0'}
              />
            </View>
            
            {shippingPreferred && (
              <CustomInput
                placeholder="Kargo detayları (örn. kargo ücreti kim tarafından karşılanacak)"
                value={shippingDetails}
                onChangeText={setShippingDetails}
                leftIcon={<Ionicons name="car-outline" size={18} color={Colors.primary} />}
                containerStyle={styles.conditionInput}
              />
            )}
          </View>
          
          {/* Ek Notlar */}
          <View style={styles.conditionItem}>
            <Text style={styles.conditionTitle}>Ek Notlar</Text>
            <CustomInput
              placeholder="Takas ile ilgili belirtmek istediğiniz diğer koşullar..."
              multiline
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              containerStyle={styles.conditionInput}
            />
          </View>
        </View>
        
        {/* Onay Butonu */}
        <CustomButton
          title="Teklifi Gönder"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !selectedProductId}
          containerStyle={styles.submitButton}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.muted,
    marginBottom: 12,
  },
  requestedProductCard: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  productOwner: {
    fontSize: 14,
    color: Colors.muted,
  },
  userProductsSection: {
    marginBottom: 24,
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyProductsText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  addProductButton: {
    minWidth: 150,
  },
  productGrid: {
    paddingBottom: 8,
  },
  userProductCard: {
    flex: 1,
    margin: 6,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eaeaea',
    overflow: 'hidden',
  },
  selectedProductCard: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f8ff',
  },
  userProductImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    marginBottom: 8,
  },
  userProductInfo: {
    marginTop: 4,
  },
  userProductTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  userProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  additionalCashSection: {
    marginBottom: 24,
  },
  messageSection: {
    marginBottom: 24,
  },
  messageInput: {
    minHeight: 100,
  },
  specialConditionsSection: {
    marginBottom: 24,
  },
  conditionItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  conditionInput: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 24,
  },
}); 