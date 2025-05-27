import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { messageService } from '../services/api';
import { showMessageNotification, requestNotificationPermission as requestNotificationPermissionService } from '../services/notificationService';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadTradeOfferCount, setUnreadTradeOfferCount] = useState(0);
  const { user } = useAuth();

  // Okunmamış mesaj sayısını alma fonksiyonu - useCallback ile sararak referans kararlılığı sağla
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!user || !user._id) return;
    
    try {
      console.log('Fetching unread message count from API');
      const response = await messageService.getUnreadCount();
      
      let count = 0;
      // API yanıt formatını daha detaylı kontrol edelim
      console.log('Raw unread count response:', response);
      
      if (response?.data?.count !== undefined) {
        count = response.data.count;
      } else if (response?.data?.data?.count !== undefined) {
        count = response.data.data.count;
      } else if (response?.count !== undefined) {
        count = response.count;
      } else if (typeof response === 'number') {
        count = response;
      }
      
      console.log('Server returned unread message count:', count);
      setUnreadMessageCount(count);
    } catch (error) {
      console.error('Okunmamış mesaj sayısı alınamadı:', error);
    }
  }, [user]);
  
  // Takas teklifleri bildirim sayısını güncelleme
  useEffect(() => {
    // Okunmamış takas teklifi bildirimlerini sayma
    const unreadTradeOffers = notifications.filter(n => !n.read && n.type === 'tradeOffer').length;
    console.log('Unread trade offer count updated:', unreadTradeOffers);
    setUnreadTradeOfferCount(unreadTradeOffers);
  }, [notifications]);
  
  // Okunmamış mesaj sayısını düzenli aralıklarla kontrol et
  useEffect(() => {
    if (user && user._id) {
      // İlk okunmamış mesaj sayısını al
      fetchUnreadMessageCount();
      
      // Her 10 saniyede bir okunmamış mesaj sayısını kontrol et
      const interval = setInterval(() => {
        fetchUnreadMessageCount();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadMessageCount]);

  // Sayfaya geri dönüldüğünde okunmamış mesaj sayısını güncelle
  useEffect(() => {
    // Sayfa tekrar aktif hale geldiğinde güncelleme yap
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && user._id) {
        console.log('Page became visible, refreshing unread count');
        fetchUnreadMessageCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Temizleme
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadMessageCount, user]);

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    
    if (user && user._id) {
      // Socket bağlantısı kurulması
      console.log('SocketContext: Attempting to connect to socket at:', SOCKET_URL);
      
      const socketOptions = {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        transports: ['websocket', 'polling'] // Explicitly define transports
      };
      
      // Create new socket instance with correct URL (no trailing path)
      const newSocket = io(SOCKET_URL, socketOptions);
      setSocket(newSocket);

      // Bağlantı olaylarının dinlenmesi
      newSocket.on('connect', () => {
        console.log('SocketContext: Socket bağlantısı kuruldu, socket ID:', newSocket.id);
        console.log('SocketContext: Socket transport:', newSocket.io.engine.transport.name);
        setIsConnected(true);
        
        // Kullanıcı kimliğini socket'e gönder
        console.log('SocketContext: Authenticating with user ID:', user._id);
        newSocket.emit('authenticate', user._id);
        
        // Bağlantı kurulduğunda hemen son unread count'u al
        fetchUnreadMessageCount();
      });

      newSocket.on('disconnect', (reason) => {
        console.log('SocketContext: Socket bağlantısı kesildi, reason:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('SocketContext: Socket connection error:', error.message);
        setIsConnected(false);
        
        // 5 saniye sonra tekrar bağlanmayı dene
        setTimeout(() => {
          console.log('SocketContext: Trying to reconnect socket...');
          if (newSocket) {
            newSocket.connect();
          }
        }, 5000);
      });
      
      // Debug transport type (polling or websocket)
      newSocket.io.engine.on('upgrade', () => {
        console.log('SocketContext: Transport upgraded to:', newSocket.io.engine.transport.name);
      });

      // Yeni mesaj bildirimi
      const handleNewMessage = (messageData) => {
        console.log('SocketContext: Yeni mesaj alındı:', messageData);
        
        // Mesaj hiç yoksa işleme
        if (!messageData) {
          console.error('Boş mesaj bildirimi alındı');
          return;
        }

        // Sorun giderme: Mesaj verisinin detaylı incelemesi
        console.log('Mesaj içeriği:', {
          id: messageData.id || messageData._id,
          conversationId: messageData.conversationId,
          text: messageData.text,
          sender: messageData.sender,
          time: messageData.createdAt || messageData.time || new Date().toISOString()
        });

        // Mesajlar sayfasında değilsek bildirimleri güncelle
        const isOnMessagesPage = window.location.pathname.includes('/messages');
        console.log('User is on messages page:', isOnMessagesPage);
        
        // Bildirim listesine ekle - her durumda
        const notificationId = Date.now().toString();
        setNotifications(prev => [...prev, {
          id: notificationId,
          type: 'message',
          data: messageData,
          read: false,
          time: new Date()
        }]);
        
        // Okunmamış mesaj sayacını her zaman güncelle
        fetchUnreadMessageCount();
        
        // Okunmamış mesaj sayacını artır ve bildirim göster - kullanıcı mesajlar sayfasında değilse
        if (!isOnMessagesPage) {
          // Bildirim sayacını artır - Kullanıcı mesajlar sayfasında değilse
          setUnreadMessageCount(prev => {
            const newCount = prev + 1;
            console.log('New unread message count after increment:', newCount);
            return newCount;
          });
          
          // Tarayıcı bildirimi göster
          try {
            if (Notification && Notification.permission === "granted") {
              const senderName = messageData.sender?.username || "Yeni mesaj";
              const messageContent = messageData.text || "Size yeni bir mesaj gönderildi.";
              
              showMessageNotification(senderName, messageContent, messageData.conversationId);
            }
          } catch (err) {
            console.error('Bildirim gösterilirken hata oluştu:', err);
          }
        }
        
        // 2 saniye sonra tekrar mesaj sayısını sunucudan al 
        // (mesaj sunucuda işlendikten sonra doğru sayıyı almak için)
        setTimeout(() => {
          fetchUnreadMessageCount();
        }, 2000);
      };
      
      // Özel mesaj sayısı güncelleme bildirimi
      const handleMessageCountUpdated = () => {
        console.log('Received message count update notification');
        fetchUnreadMessageCount();
      };
      
      // Bildirim sayacı yenileme isteği
      const handleRefreshUnreadCount = () => {
        console.log('Received request to refresh unread count');
        fetchUnreadMessageCount();
      };

      // Test için mesaj bildirimi - kullanıcı gönderdiğinde tetiklenir
      const handleSimulatedMessage = (data) => {
        console.log('Simulated message received:', data);
        
        // Bildirim sayısını artır
        setUnreadMessageCount(prev => {
          const newCount = prev + 1;
          console.log('Simulated message: unread count increased to', newCount);
          return newCount;
        });
        
        // Bildirim listesine de ekle
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          type: 'message',
          data: { content: 'Test mesajı', sender: data.userId },
          read: false,
          time: new Date()
        }]);
      };

      // Takas teklifi bildirimi
      const handleNewTradeOffer = (notification) => {
        console.log('Yeni takas teklifi bildirimi:', notification);
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          type: 'tradeOffer',
          data: notification,
          read: false,
          time: new Date()
        }]);
      };
      
      // Event listener'ları ekle
      newSocket.on('newMessage', handleNewMessage);
      newSocket.on('newTradeOffer', handleNewTradeOffer);
      newSocket.on('simulateNewMessage', handleSimulatedMessage);
      newSocket.on('messageCountUpdated', handleMessageCountUpdated);
      newSocket.on('refreshUnreadCount', handleRefreshUnreadCount);

      // Socket bağlantısını temizle
      return () => {
        console.log('Socket bağlantısı kapatılıyor');
        if (newSocket) {
          newSocket.off('newMessage', handleNewMessage);
          newSocket.off('newTradeOffer', handleNewTradeOffer);
          newSocket.off('simulateNewMessage', handleSimulatedMessage);
          newSocket.off('messageCountUpdated', handleMessageCountUpdated);
          newSocket.off('refreshUnreadCount', handleRefreshUnreadCount);
          newSocket.disconnect();
        }
      };
    }
  }, [user, fetchUnreadMessageCount]);

  // Bildirimleri okundu olarak işaretleme
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  }, []);

  // Tüm bildirimleri okundu olarak işaretleme
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Mesaj bildirimlerini okundu olarak işaretle ve sayacı güncelle
  const markMessageNotificationsAsRead = useCallback(async () => {
    // Mesaj bildirimlerini işaretle
    console.log('Marking message notifications as read');
    
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'message' ? { ...notification, read: true } : notification
      )
    );
    
    // API'ye mesajlar okundu bilgisi gönder ve sayacı sıfırla
    try {
      console.log('Resetting unread message count via API');
      await messageService.getUnreadCount();
      
      // Önce sayacı sıfırla
      setUnreadMessageCount(0);
      console.log('Messages marked as read, unread count reset to 0');
      
      // Kullanıcının tüm konuşmalarını çekip, her biri için okundu bilgisi gönderelim
      const conversations = await messageService.getConversations();
      let conversationList = [];
      
      if (conversations?.data?.data) {
        conversationList = conversations.data.data;
      } else if (conversations?.data) {
        conversationList = conversations.data;
      } else if (Array.isArray(conversations)) {
        conversationList = conversations;
      }
      
      console.log(`Found ${conversationList.length} conversations to mark as read`);
      
      for (const conversation of conversationList) {
        try {
          const conversationId = conversation._id || conversation.id;
          console.log(`Marking conversation ${conversationId} as read`);
          await messageService.markAsRead(conversationId);
        } catch (convError) {
          console.error('Failed to mark conversation as read:', convError);
        }
      }
    } catch (error) {
      console.error('Failed to update read status on server:', error);
    }
  }, []);

  // Takas teklifi bildirimlerini okundu olarak işaretle
  const markTradeOfferNotificationsAsRead = useCallback(() => {
    // Takas teklifi bildirimlerini işaretle
    setNotifications(prev => 
      prev.map(notification => 
        notification.type === 'tradeOffer' ? { ...notification, read: true } : notification
      )
    );
    
    // Sayacı sıfırla
    setUnreadTradeOfferCount(0);
    console.log('Trade offer notifications marked as read');
  }, []);
  
  // TEST: Bildirim sayısını manuel olarak artırma (Debug/Test için)
  const simulateNewMessage = useCallback(() => {
    console.log('Simulating new message locally');
    
    // Socket üzerinden sunucuya test mesajı gönder
    if (socket && socket.connected) {
      console.log('Sending test message via socket');
      socket.emit('test:newMessage', {
        text: 'Test mesaj içeriği ' + new Date().toLocaleTimeString()
      });
    } else {
      console.log('Socket not connected, using local simulation only');
    }
    
    // Bildirim sayısını artır
    setUnreadMessageCount(prev => {
      const newCount = prev + 1;
      console.log('New unread count:', newCount);
      return newCount;
    });
    
    // Bildirim listesine de ekle
    setNotifications(prev => [...prev, {
      id: Date.now().toString(),
      type: 'message',
      data: { 
        content: 'Test mesajı',
        text: 'Test mesajı içeriği',
        sender: {
          username: 'Test Kullanıcı'
        },
        createdAt: new Date().toISOString()
      },
      read: false,
      time: new Date()
    }]);
  }, [socket]);

  // Bildirim izni isteme
  const requestNotificationPermission = useCallback(async () => {
    try {
      const granted = await requestNotificationPermissionService();
      console.log('Bildirim izni:', granted ? 'verildi' : 'reddedildi');
      return granted;
    } catch (error) {
      console.error('Bildirim izni istenirken hata oluştu:', error);
      return false;
    }
  }, []);

  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        notifications,
        unreadMessageCount,
        unreadTradeOfferCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        markMessageNotificationsAsRead,
        markTradeOfferNotificationsAsRead,
        fetchUnreadMessageCount,
        simulateNewMessage,
        requestNotificationPermission
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}; 