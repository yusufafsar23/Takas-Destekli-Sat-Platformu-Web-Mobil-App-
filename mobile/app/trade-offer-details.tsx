import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image as RNImage } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import tradeOfferService from '../services/tradeOfferService';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import Colors from '../constants/Colors';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';

export default function TradeOfferDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [tradeOffer, setTradeOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Teklif detaylarını yükle
  const loadTradeOffer = async () => {
    try {
      setLoading(true);
      const data = await tradeOfferService.getTradeOfferById(id);
      setTradeOffer(data);
    } catch (error) {
      console.error('Teklif detayları yüklenirken hata:', error);
      Alert.alert('Hata', 'Teklif detayları yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTradeOffer();
  }, [id]);

  // Teklifi kabul et
  const handleAccept = async () => {
    try {
      setSubmitting(true);
      await tradeOfferService.acceptTradeOffer(id, responseMessage);
      Alert.alert('Başarılı', 'Takas teklifi kabul edildi!');
      loadTradeOffer(); // Yeniden yükle
    } catch (error) {
      console.error('Teklif kabul edilirken hata:', error);
      Alert.alert('Hata', 'Teklif kabul edilirken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Teklifi reddet
  const handleReject = async () => {
    try {
      setSubmitting(true);
      await tradeOfferService.rejectTradeOffer(id, responseMessage);
      Alert.alert('Bilgi', 'Takas teklifi reddedildi.');
      loadTradeOffer(); // Yeniden yükle
    } catch (error) {
      console.error('Teklif reddedilirken hata:', error);
      Alert.alert('Hata', 'Teklif reddedilirken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Teklifi iptal et
  const handleCancel = async () => {
    Alert.alert(
      'Emin misiniz?',
      'Bu takas teklifini iptal etmek istediğinizden emin misiniz?',
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await tradeOfferService.cancelTradeOffer(id);
              Alert.alert('Bilgi', 'Takas teklifi iptal edildi.');
              loadTradeOffer(); // Yeniden yükle
            } catch (error) {
              console.error('Teklif iptal edilirken hata:', error);
              Alert.alert('Hata', 'Teklif iptal edilirken bir sorun oluştu.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Takas işlemini tamamla
  const handleComplete = async () => {
    try {
      setSubmitting(true);
      await tradeOfferService.completeTradeOffer(id);
      Alert.alert('Başarılı', 'Takas işlemi tamamlandı!');
      loadTradeOffer(); // Yeniden yükle
    } catch (error) {
      console.error('İşlem tamamlanırken hata:', error);
      Alert.alert('Hata', 'İşlem tamamlanırken bir sorun oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Duruma göre aksiyon butonlarını göster
  const renderActionButtons = () => {
    if (!tradeOffer) return null;

    const isOfferOwner = tradeOffer.offeredBy._id === user?.id;
    const isProductOwner = tradeOffer.requestedFrom._id === user?.id;

    if (tradeOffer.status === 'pending') {
      if (isProductOwner) {
        // Ürün sahibi - kabul/ret seçenekleri
        return (
          <View style={styles.actionContainer}>
            <CustomInput
              placeholder="Yanıt mesajınız (opsiyonel)"
              multiline
              value={responseMessage}
              onChangeText={setResponseMessage}
              containerStyle={styles.responseInput}
            />
            <View style={styles.buttonRow}>
              <CustomButton
                title="Reddet"
                onPress={handleReject}
                loading={submitting}
                disabled={submitting}
                containerStyle={[styles.actionButton, styles.rejectButton]}
              />
              <CustomButton
                title="Kabul Et"
                onPress={handleAccept}
                loading={submitting}
                disabled={submitting}
                containerStyle={[styles.actionButton, styles.acceptButton]}
              />
            </View>
          </View>
        );
      } else if (isOfferOwner) {
        // Teklif sahibi - iptal seçeneği
        return (
          <View style={styles.actionContainer}>
            <CustomButton
              title="Teklifi İptal Et"
              onPress={handleCancel}
              loading={submitting}
              disabled={submitting}
              containerStyle={styles.cancelButton}
            />
          </View>
        );
      }
    } else if (tradeOffer.status === 'accepted') {
      // Hem teklif veren hem de alan kişi tamamlayabilir
      return (
        <View style={styles.actionContainer}>
          <CustomButton
            title="Takas İşlemini Tamamla"
            onPress={handleComplete}
            loading={submitting}
            disabled={submitting}
            containerStyle={styles.completeButton}
          />
        </View>
      );
    }

    return null;
  };

  // Teklif durumuna göre renk ve metin
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { color: Colors.warning, text: 'Beklemede' };
      case 'accepted':
        return { color: Colors.success, text: 'Kabul Edildi' };
      case 'rejected':
        return { color: Colors.error, text: 'Reddedildi' };
      case 'cancelled':
        return { color: Colors.muted, text: 'İptal Edildi' };
      case 'completed':
        return { color: Colors.primary, text: 'Tamamlandı' };
      default:
        return { color: Colors.muted, text: 'Bilinmiyor' };
    }
  };

  // Yükleme durumu
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Teklif detayları yükleniyor...</Text>
      </View>
    );
  }

  // Teklif bulunamadı
  if (!tradeOffer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Takas teklifi bulunamadı.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOfferOwner = tradeOffer.offeredBy._id === user?.id;
  const statusInfo = getStatusInfo(tradeOffer.status);
  const myProduct = isOfferOwner ? tradeOffer.offeredProduct : tradeOffer.requestedProduct;
  const otherProduct = isOfferOwner ? tradeOffer.requestedProduct : tradeOffer.offeredProduct;
  const otherUser = isOfferOwner ? tradeOffer.requestedFrom : tradeOffer.offeredBy;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Takas Teklifi Detayı',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Durum Bilgisi */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
          <Text style={styles.dateText}>
            {tradeOffer.createdAt ? `Oluşturulma: ${formatDate(tradeOffer.createdAt)}` : ''}
          </Text>
        </View>

        {/* Kullanıcı Bilgileri */}
        <View style={styles.userInfoContainer}>
          <View style={styles.userCard}>
            <Image
              source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }}
              style={styles.userAvatar}
            />
            <Text style={styles.userName}>Siz</Text>
          </View>

          <View style={styles.exchangeIcon}>
            <MaterialCommunityIcons name="swap-horizontal" size={24} color={Colors.primary} />
          </View>

          <View style={styles.userCard}>
            <Image
              source={{ uri: otherUser?.avatar || 'https://via.placeholder.com/100' }}
              style={styles.userAvatar}
            />
            <Text style={styles.userName}>{otherUser?.username || 'Kullanıcı'}</Text>
          </View>
        </View>

        {/* Ürün Detayları */}
        <View style={styles.productsContainer}>
          <View style={styles.productCard}>
            <Text style={styles.productLabel}>Sizin Ürününüz</Text>
            <Image
              source={{ uri: myProduct?.images?.[0]?.url || 'https://via.placeholder.com/300' }}
              style={styles.productImage}
            />
            <View style={styles.productDetails}>
              <Text style={styles.productTitle}>{myProduct?.title || 'Ürün'}</Text>
              <Text style={styles.productPrice}>{myProduct?.price || 0} ₺</Text>
              <Text style={styles.productCondition}>
                Durum: {myProduct?.condition || 'Belirtilmemiş'}
              </Text>
            </View>
          </View>

          <View style={styles.productCard}>
            <Text style={styles.productLabel}>Takas Ürünü</Text>
            <Image
              source={{ uri: otherProduct?.images?.[0]?.url || 'https://via.placeholder.com/300' }}
              style={styles.productImage}
            />
            <View style={styles.productDetails}>
              <Text style={styles.productTitle}>{otherProduct?.title || 'Ürün'}</Text>
              <Text style={styles.productPrice}>{otherProduct?.price || 0} ₺</Text>
              <Text style={styles.productCondition}>
                Durum: {otherProduct?.condition || 'Belirtilmemiş'}
              </Text>
            </View>
          </View>
        </View>

        {/* Nakit Teklif */}
        {tradeOffer.additionalCashOffer > 0 && (
          <View style={styles.cashOfferContainer}>
            <FontAwesome name="money" size={20} color={Colors.success} style={styles.cashIcon} />
            <Text style={styles.cashOfferText}>
              + {tradeOffer.additionalCashOffer} ₺ Nakit Teklif
            </Text>
            <Text style={styles.cashOfferNote}>
              {isOfferOwner
                ? 'Bu teklifi siz yaptınız'
                : `${tradeOffer.offeredBy.username} size nakit teklif yapıyor`}
            </Text>
          </View>
        )}

        {/* Özel Koşullar */}
        {tradeOffer.specialConditions && (
          <View style={styles.specialConditionsContainer}>
            <Text style={styles.sectionTitle}>Özel Takas Koşulları</Text>
            
            {tradeOffer.specialConditions.meetupPreferred && (
              <View style={styles.conditionItem}>
                <Ionicons name="location" size={20} color={Colors.primary} style={styles.conditionIcon} />
                <View>
                  <Text style={styles.conditionTitle}>Yüz yüze takas tercih ediliyor</Text>
                  {tradeOffer.specialConditions.meetupLocation && (
                    <Text style={styles.conditionDetail}>
                      Konum: {tradeOffer.specialConditions.meetupLocation}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {tradeOffer.specialConditions.shippingPreferred && (
              <View style={styles.conditionItem}>
                <Ionicons name="car" size={20} color={Colors.primary} style={styles.conditionIcon} />
                <View>
                  <Text style={styles.conditionTitle}>Kargo ile takas tercih ediliyor</Text>
                  {tradeOffer.specialConditions.shippingDetails && (
                    <Text style={styles.conditionDetail}>
                      Detaylar: {tradeOffer.specialConditions.shippingDetails}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            {tradeOffer.specialConditions.additionalNotes && (
              <View style={styles.conditionItem}>
                <Ionicons name="document-text" size={20} color={Colors.primary} style={styles.conditionIcon} />
                <View>
                  <Text style={styles.conditionTitle}>Ek Notlar</Text>
                  <Text style={styles.conditionDetail}>
                    {tradeOffer.specialConditions.additionalNotes}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Mesajlar */}
        <View style={styles.messagesContainer}>
          <Text style={styles.sectionTitle}>Mesajlar</Text>
          
          {tradeOffer.message && (
            <View style={styles.messageItem}>
              <View style={styles.messageHeader}>
                <Image
                  source={{ uri: tradeOffer.offeredBy?.avatar || 'https://via.placeholder.com/40' }}
                  style={styles.messageAvatar}
                />
                <Text style={styles.messageSender}>{tradeOffer.offeredBy?.username || 'Kullanıcı'}</Text>
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.messageText}>{tradeOffer.message}</Text>
              </View>
            </View>
          )}
          
          {tradeOffer.responseMessage && (
            <View style={styles.messageItem}>
              <View style={styles.messageHeader}>
                <Image
                  source={{ uri: tradeOffer.requestedFrom?.avatar || 'https://via.placeholder.com/40' }}
                  style={styles.messageAvatar}
                />
                <Text style={styles.messageSender}>{tradeOffer.requestedFrom?.username || 'Kullanıcı'}</Text>
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.messageText}>{tradeOffer.responseMessage}</Text>
              </View>
            </View>
          )}
          
          {!tradeOffer.message && !tradeOffer.responseMessage && (
            <Text style={styles.noMessagesText}>Henüz mesaj yok</Text>
          )}
        </View>

        {/* Aksiyon Butonları */}
        {renderActionButtons()}
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.warning,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dateText: {
    fontSize: 14,
    color: Colors.muted,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userCard: {
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exchangeIcon: {
    marginHorizontal: 10,
  },
  productsContainer: {
    marginBottom: 24,
  },
  productCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productLabel: {
    backgroundColor: Colors.primary,
    color: '#fff',
    padding: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productImage: {
    width: '100%',
    height: 200,
  },
  productDetails: {
    padding: 12,
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
  productCondition: {
    fontSize: 14,
    color: Colors.muted,
  },
  cashOfferContainer: {
    backgroundColor: '#f8fff8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  cashIcon: {
    marginBottom: 6,
  },
  cashOfferText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  cashOfferNote: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
  },
  specialConditionsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  conditionIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  conditionDetail: {
    fontSize: 14,
    color: Colors.muted,
  },
  messagesContainer: {
    marginBottom: 24,
  },
  messageItem: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageContent: {
    padding: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noMessagesText: {
    textAlign: 'center',
    color: Colors.muted,
    fontStyle: 'italic',
    padding: 20,
  },
  actionContainer: {
    marginTop: 8,
  },
  responseInput: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  cancelButton: {
    backgroundColor: Colors.error,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
}); 