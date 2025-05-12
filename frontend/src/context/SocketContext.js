import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    if (user && user._id) {
      // Socket bağlantısı kurulması
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      // Bağlantı olaylarının dinlenmesi
      newSocket.on('connect', () => {
        console.log('Socket bağlantısı kuruldu');
        setIsConnected(true);
        
        // Kullanıcı kimliğini socket'e gönder
        newSocket.emit('authenticate', user._id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket bağlantısı kesildi');
        setIsConnected(false);
      });

      // Yeni mesaj bildirimi
      newSocket.on('newMessage', (messageData) => {
        console.log('Yeni mesaj alındı:', messageData);
        // Bildirim ekleme
        setNotifications(prev => [...prev, {
          type: 'message',
          data: messageData,
          read: false,
          time: new Date()
        }]);
      });

      // Takas teklifi bildirimi
      newSocket.on('newTradeOffer', (notification) => {
        console.log('Yeni takas teklifi bildirimi:', notification);
        setNotifications(prev => [...prev, {
          type: 'tradeOffer',
          data: notification,
          read: false,
          time: new Date()
        }]);
      });

      // Socket bağlantısını temizle
      return () => {
        console.log('Socket bağlantısı kapatılıyor');
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Bildirimleri okundu olarak işaretleme
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  };

  // Tüm bildirimleri okundu olarak işaretleme
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 