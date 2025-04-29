import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image as RNImage } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import tradeOfferService from '../services/tradeOfferService';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

export default function SmartMatchesScreen() {
  const { productId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [matchedProducts, setMatchedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMatches();
  }, [productId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tradeOfferService.getSmartMatchesForProduct(productId);
      setMatchedProducts(data);
    } catch (err) {
      console.error('Eşleşmeler yüklenirken hata:', err);
      setError('Ürün eşleşmeleri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    router.push({
      pathname: '/create-trade-offer',
      params: { productId: product._id }
    });
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => handleSelectProduct(item)}
    >
      <Image
        source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/300' }}
        style={styles.productImage}
      />
      <View style={styles.productDetails}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productPrice}>{item.price} ₺</Text>
        <Text style={styles.productOwner}>
          Satıcı: {item.owner?.username || 'Kullanıcı'}
        </Text>
        <View style={styles.matchDetails}>
          <MaterialCommunityIcons name="swap-horizontal" size={16} color={Colors.success} />
          <Text style={styles.matchText}>Takas Teklifine Uygun</Text>
        </View>
        <TouchableOpacity 
          style={styles.tradeButton}
          onPress={() => handleSelectProduct(item)}
        >
          <Text style={styles.tradeButtonText}>Takas Teklifi Gönder</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Akıllı Eşleştirmeler',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sizin Ürününüz İçin Eşleşmeler</Text>
          <Text style={styles.headerSubtitle}>
            Takas tercihlerinize ve ürün değerine göre uygun eşleşmeler
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Eşleşmeler yükleniyor...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadMatches}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : matchedProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={Colors.muted} />
            <Text style={styles.emptyText}>
              Ürününüz için uygun bir eşleşme bulunamadı.
            </Text>
            <Text style={styles.emptySubtext}>
              Takas tercihlerinizi güncelleyerek daha fazla eşleşme bulabilirsiniz.
            </Text>
          </View>
        ) : (
          <FlatList
            data={matchedProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.muted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    maxWidth: 300,
  },
  listContainer: {
    padding: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 16,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
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
    marginBottom: 8,
  },
  matchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  tradeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 