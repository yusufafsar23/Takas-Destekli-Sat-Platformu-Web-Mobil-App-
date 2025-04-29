import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import { useNavigation, Link } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import tradeOfferService from '../../services/tradeOfferService';
import { formatDate } from '../../utils/dateUtils';
import Colors from '../../constants/Colors';

export default function TradeOffersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'received', title: 'Gelen Teklifler' },
    { key: 'sent', title: 'Gönderilen Teklifler' },
    { key: 'history', title: 'Geçmiş' },
  ]);

  const [receivedOffers, setReceivedOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [historyOffers, setHistoryOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Takas tekliflerini yükle
  const loadTradeOffers = async () => {
    try {
      setLoading(true);
      
      // Gelen teklifler
      const receivedData = await tradeOfferService.getReceivedTradeOffers('pending');
      setReceivedOffers(receivedData);
      
      // Gönderilen teklifler
      const sentData = await tradeOfferService.getSentTradeOffers('pending');
      setSentOffers(sentData);
      
      // Geçmiş teklifler
      const historyData = await tradeOfferService.getUserTradeHistory();
      setHistoryOffers(historyData);
    } catch (error) {
      console.error('Takas teklifleri yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    loadTradeOffers();
  }, []);

  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    loadTradeOffers();
  };

  // Teklif kartı komponenti
  const TradeOfferCard = ({ offer, type }) => {
    const isReceived = type === 'received';
    const otherUser = isReceived ? offer.offeredBy : offer.requestedFrom;
    const product = isReceived ? offer.requestedProduct : offer.offeredProduct;
    const offeredProduct = isReceived ? offer.offeredProduct : offer.requestedProduct;
    
    // Teklif durumuna göre renk
    const getStatusColor = (status) => {
      switch (status) {
        case 'pending': return Colors.warning;
        case 'accepted': return Colors.success;
        case 'rejected': return Colors.error;
        case 'cancelled': return Colors.muted;
        case 'completed': return Colors.primary;
        default: return Colors.muted;
      }
    };

    // Teklif durumu metni
    const getStatusText = (status) => {
      switch (status) {
        case 'pending': return 'Beklemede';
        case 'accepted': return 'Kabul Edildi';
        case 'rejected': return 'Reddedildi';
        case 'cancelled': return 'İptal Edildi';
        case 'completed': return 'Tamamlandı';
        default: return 'Bilinmiyor';
      }
    };

    return (
      <Link href={{ pathname: '/trade-offer-details', params: { id: offer._id } }} asChild>
        <TouchableOpacity style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Image 
                source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/40' }} 
                style={styles.avatar} 
              />
              <Text style={styles.username}>{otherUser?.username || 'Kullanıcı'}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.date}>{formatDate(offer.createdAt)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) }]}>
                <Text style={styles.statusText}>{getStatusText(offer.status)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.productsContainer}>
            <View style={styles.productContainer}>
              <Image 
                source={{ uri: product?.images?.[0]?.url || 'https://via.placeholder.com/100' }} 
                style={styles.productImage} 
              />
              <Text style={styles.productTitle} numberOfLines={2}>{product?.title || 'Ürün'}</Text>
              <Text style={styles.productPrice}>{product?.price || 0} ₺</Text>
            </View>
            
            <MaterialCommunityIcons name="swap-horizontal" size={24} color={Colors.primary} />
            
            <View style={styles.productContainer}>
              <Image 
                source={{ uri: offeredProduct?.images?.[0]?.url || 'https://via.placeholder.com/100' }} 
                style={styles.productImage} 
              />
              <Text style={styles.productTitle} numberOfLines={2}>{offeredProduct?.title || 'Ürün'}</Text>
              <Text style={styles.productPrice}>{offeredProduct?.price || 0} ₺</Text>
            </View>
          </View>

          {offer.additionalCashOffer > 0 && (
            <View style={styles.cashOfferContainer}>
              <Text style={styles.cashOfferText}>
                + {offer.additionalCashOffer} ₺ Nakit Teklif
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Link>
    );
  };

  // Tab görünümleri
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'received':
        return (
          <FlatList
            data={receivedOffers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <TradeOfferCard offer={item} type="received" />}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="ios-alert-circle-outline" size={48} color={Colors.muted} />
                  <Text style={styles.emptyText}>Henüz gelen takas teklifi yok</Text>
                </View>
              )
            }
          />
        );
        
      case 'sent':
        return (
          <FlatList
            data={sentOffers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <TradeOfferCard offer={item} type="sent" />}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="ios-alert-circle-outline" size={48} color={Colors.muted} />
                  <Text style={styles.emptyText}>Henüz gönderilen takas teklifi yok</Text>
                </View>
              )
            }
          />
        );
        
      case 'history':
        return (
          <FlatList
            data={historyOffers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <TradeOfferCard offer={item} type={item.offeredBy._id === user?.id ? 'sent' : 'received'} />}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="ios-alert-circle-outline" size={48} color={Colors.muted} />
                  <Text style={styles.emptyText}>Henüz takas geçmişi yok</Text>
                </View>
              )
            }
          />
        );
        
      default:
        return null;
    }
  };

  // Tab bar rendering
  const renderTabBar = props => (
    <TabBar
      {...props}
      style={styles.tabBar}
      indicatorStyle={styles.tabIndicator}
      labelStyle={styles.tabLabel}
      activeColor={Colors.primary}
      inactiveColor={Colors.muted}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Takas Teklifleri</Text>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        style={styles.tabView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabView: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabIndicator: {
    backgroundColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'none',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 100,
  },
  loader: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  productsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  productContainer: {
    flex: 1,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: 120,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cashOfferContainer: {
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  cashOfferText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
}); 