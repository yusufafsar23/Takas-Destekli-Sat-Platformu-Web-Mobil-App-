import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const connectSocket = async () => {
      if (!user || !user._id) return;

      try {
        const SOCKET_URL = 'http://localhost:5000'; // Değiştirilecek

        // Socket bağlantısı oluştur
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Bağlantı olaylarını dinle
        newSocket.on('connect', () => {
          console.log('Socket bağlantısı kuruldu');
          setIsConnected(true);

          // Kullanıcı kimliğini gönder
          newSocket.emit('authenticate', user._id);
        });

        newSocket.on('disconnect', () => {
          console.log('Socket bağlantısı kesildi');
          setIsConnected(false);
        });

        // Yeni mesajları dinle
        newSocket.on('newMessage', async (messageData) => {
          console.log('Yeni mesaj alındı:', messageData);
          
          // Bildirimleri güncelle
          const newNotification = {
            id: Date.now().toString(),
            type: 'message',
            data: messageData,
            read: false,
            time: new Date()
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          
          // AsyncStorage'da bildirimleri sakla
          try {
            const existingNotifications = await AsyncStorage.getItem('notifications');
            const parsedNotifications = existingNotifications ? JSON.parse(existingNotifications) : [];
            const updatedNotifications = [newNotification, ...parsedNotifications];
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
          } catch (error) {
            console.error('Notifications could not be saved to AsyncStorage', error);
          }
        });

        // Takas teklifi bildirimlerini dinle
        newSocket.on('newTradeOffer', (notification) => {
          console.log('Yeni takas teklifi bildirimi:', notification);
          
          const newNotification = {
            id: Date.now().toString(),
            type: 'tradeOffer',
            data: notification,
            read: false,
            time: new Date()
          };
          
          setNotifications(prev => [newNotification, ...prev]);
        });

        return () => {
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Socket bağlantısı oluşturulurken hata:', error);
      }
    };

    // Mevcut bildirimleri yükle
    const loadNotifications = async () => {
      try {
        const storedNotifications = await AsyncStorage.getItem('notifications');
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        }
      } catch (error) {
        console.error('Bildirimler yüklenirken hata oluştu:', error);
      }
    };

    loadNotifications();
    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Bildirimi okundu olarak işaretle
  const markNotificationAsRead = async (notificationId) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId ? { ...notification, read: true } : notification
    );
    
    setNotifications(updatedNotifications);
    
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Bildirimler güncellenirken hata oluştu:', error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const markAllNotificationsAsRead = async () => {
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    
    setNotifications(updatedNotifications);
    
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Bildirimler güncellenirken hata oluştu:', error);
    }
  };

  // Belirli bir tipteki okunmamış bildirimlerin sayısını al
  const getUnreadCount = (type) => {
    if (!type) {
      return notifications.filter(n => !n.read).length;
    }
    
    return notifications.filter(n => n.type === type && !n.read).length;
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        getUnreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 