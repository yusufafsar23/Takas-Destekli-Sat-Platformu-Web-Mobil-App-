import api from './api';
// import * as Notifications from 'expo-notifications'; // Kaldırıldı
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bildirim konfigürasyonu - şimdilik atlandı
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

// Geçici bildirim servisi - expo-notifications olmadan
const createNotificationService = () => {
  // Push token almak - Expo Go'da kısıtlı çalışır
  const registerForPushNotifications = async () => {
    console.log("Bildirimler geçici olarak devre dışı");
    return null;
  };

  // Token'ı sunucuya kaydetme
  const savePushToken = async (token) => {
    if (!token) return;
    
    try {
      await AsyncStorage.setItem('pushToken', token);
      console.log('Push token kaydedildi (test)');
    } catch (error) {
      console.error('Push token kaydedilirken hata oluştu:', error);
    }
  };

  // Uygulamayı açarken token kaydı
  const setupPushNotifications = async () => {
    console.log("Bildirimler geçici olarak devre dışı");
    return null;
  };

  // Bildirim dinleyicisi ayarlama
  const addNotificationListener = (callback) => {
    console.log("Bildirim dinleme geçici olarak devre dışı");
    return { remove: () => {} };
  };

  // Bildirim tıklama dinleyicisi ayarlama
  const addNotificationResponseListener = (callback) => {
    console.log("Bildirim tıklama dinleme geçici olarak devre dışı");
    return { remove: () => {} };
  };

  // Bildirimleri almak
  const getNotifications = async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/notifications', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Bildirimler alınırken hata:', error);
      return { notifications: [], totalCount: 0 };
    }
  };

  // Bildirimi okundu olarak işaretleme
  const markAsRead = async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Bildirim işaretlenirken hata:', error);
      return null;
    }
  };

  // Tüm bildirimleri okundu olarak işaretleme
  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Bildirimler işaretlenirken hata:', error);
      return null;
    }
  };

  // Bildirimi silme
  const deleteNotification = async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Bildirim silinirken hata:', error);
      return null;
    }
  };

  // Tüm bildirimleri silme
  const deleteAllNotifications = async () => {
    try {
      const response = await api.delete('/notifications/delete-all');
      return response.data;
    } catch (error) {
      console.error('Bildirimler silinirken hata:', error);
      return null;
    }
  };

  // Bildirim ayarlarını alma
  const getNotificationSettings = async () => {
    try {
      const response = await api.get('/users/notification-settings');
      return response.data;
    } catch (error) {
      console.error('Bildirim ayarları alınırken hata:', error);
      return null;
    }
  };

  // Bildirim ayarlarını güncelleme
  const updateNotificationSettings = async (settings) => {
    try {
      const response = await api.put('/users/notification-settings', settings);
      return response.data;
    } catch (error) {
      console.error('Bildirim ayarları güncellenirken hata:', error);
      return null;
    }
  };

  // Test bildirimi göndermek (sadece geliştirme için)
  const sendTestNotification = async (title, body, data = {}) => {
    console.log('Test bildirimi geçici olarak devre dışı');
    return false;
  };

  return {
    setupPushNotifications,
    registerForPushNotifications,
    savePushToken,
    addNotificationListener,
    addNotificationResponseListener,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationSettings,
    updateNotificationSettings,
    sendTestNotification,
  };
};

const notificationService = createNotificationService();

export default notificationService; 