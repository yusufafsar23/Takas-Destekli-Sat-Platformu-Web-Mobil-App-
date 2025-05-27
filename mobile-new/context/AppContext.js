import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '../constants';
import { Platform, AppState } from 'react-native';

// App context oluşturma
const AppContext = createContext();

// App Provider bileşeni
export const AppProvider = ({ children }) => {
  // Global state
  const [darkMode, setDarkMode] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false); // Varsayılan olarak online mod
  const [isNetworkChecking, setIsNetworkChecking] = useState(false);
  const [lastNetworkCheck, setLastNetworkCheck] = useState(null);

  // AsyncStorage'dan kullanıcı tercihlerini yükleme
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        // Dark mode ayarını yükle
        const storedDarkMode = await AsyncStorage.getItem('darkMode');
        if (storedDarkMode) {
          setDarkMode(JSON.parse(storedDarkMode));
        }

        // Favori ürünleri yükle
        const storedFavorites = await AsyncStorage.getItem('favoriteProducts');
        if (storedFavorites) {
          setFavoriteProducts(JSON.parse(storedFavorites));
        }

        // Son aramaları yükle
        const storedSearches = await AsyncStorage.getItem('recentSearches');
        if (storedSearches) {
          setRecentSearches(JSON.parse(storedSearches));
        }

        // Bildirimleri yükle
        const storedNotifications = await AsyncStorage.getItem('notifications');
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        }

        // Offline mod ayarını yükle - varsayılan olarak false (online)
        const storedOfflineMode = await AsyncStorage.getItem('offlineMode');
        if (storedOfflineMode !== null) {
          setIsOfflineMode(storedOfflineMode === 'true');
        } else {
          // İlk kullanımda varsayılan olarak offline modu kapalı yap
          await AsyncStorage.setItem('offlineMode', 'false');
        }
      } catch (error) {
        console.error('Kullanıcı tercihleri yüklenirken hata:', error);
      }
    };

    loadUserPreferences();
  }, []);

  // Dark mode değiştiğinde saklama
  useEffect(() => {
    AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Favori ürünler değiştiğinde saklama
  useEffect(() => {
    AsyncStorage.setItem('favoriteProducts', JSON.stringify(favoriteProducts));
  }, [favoriteProducts]);

  // Son aramalar değiştiğinde saklama
  useEffect(() => {
    AsyncStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Bildirimler değiştiğinde saklama
  useEffect(() => {
    AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Offline mod değiştiğinde saklama
  useEffect(() => {
    AsyncStorage.setItem('offlineMode', JSON.stringify(isOfflineMode));
  }, [isOfflineMode]);

  // Ağ durumunu kontrol et (basit ping ile)
  const checkNetworkConnectivity = async () => {
    if (isNetworkChecking) return;
    
    try {
      setIsNetworkChecking(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      
      // Eğer yanıt alındıysa, internet bağlantısı var
      const isConnected = response.ok;
      setIsOfflineMode(!isConnected);
      setLastNetworkCheck(new Date().toISOString());
      
      return isConnected;
    } catch (error) {
      console.log('Ağ bağlantısı kontrol edilirken hata:', error.message);
      setIsOfflineMode(true); // Hata durumunda offline moda geç
      setLastNetworkCheck(new Date().toISOString());
      return false;
    } finally {
      setIsNetworkChecking(false);
    }
  };

  // Zorla online moda geç
  const forceOnlineMode = async () => {
    try {
      console.log('Online moda geçiliyor...');
      await AsyncStorage.setItem('offlineMode', 'false');
      setIsOfflineMode(false);
      
      // Birden fazla sunucu ile bağlantı kontrolü yap
      const endpoints = [
        'https://www.google.com',
        'https://www.cloudflare.com',
        'https://www.microsoft.com'
      ];
      
      let connected = false;
      
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(endpoint, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            connected = true;
            console.log(`Bağlantı başarılı: ${endpoint}`);
            break;
          }
        } catch (err) {
          console.log(`${endpoint} bağlantı hatası:`, err.message);
        }
      }
      
      if (!connected) {
        console.log('Hiçbir sunucuya bağlanılamadı, yine de online modda kalınıyor');
      }
      
      return true;
    } catch (error) {
      console.error('Online moda geçilirken hata:', error);
      return false;
    }
  };

  // Uygulama ön plana geldiğinde ağ durumunu kontrol et
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // Uygulama ön plana geldiğinde ağ durumunu kontrol et
        checkNetworkConnectivity();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // İlk yüklemede ağ durumunu kontrol et
    checkNetworkConnectivity();
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Favori ürün ekleme/çıkarma
  const toggleFavorite = (productId) => {
    setFavoriteProducts((prevFavorites) => {
      if (prevFavorites.includes(productId)) {
        return prevFavorites.filter((id) => id !== productId);
      } else {
        return [...prevFavorites, productId];
      }
    });
  };

  // Son aramalara ekleme
  const addToRecentSearches = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches((prevSearches) => {
      // Önce mevcut aramayı kaldır (eğer varsa)
      const filteredSearches = prevSearches.filter(
        (query) => query.toLowerCase() !== searchQuery.toLowerCase()
      );
      
      // Başa ekle ve en fazla 10 arama sakla
      return [searchQuery, ...filteredSearches].slice(0, 10);
    });
  };

  // Son aramaları temizleme
  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  // Bildirim ekleme
  const addNotification = (notification) => {
    setNotifications((prev) => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification,
      },
      ...prev,
    ]);
  };

  // Bildirimi okundu olarak işaretleme
  const markNotificationAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // Tüm bildirimleri okundu olarak işaretleme
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  // Offline modu manuel olarak değiştirme
  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => !prev);
  };

  // Context değerleri
  const value = {
    // Theme state
    darkMode,
    setDarkMode,
    toggleDarkMode: () => setDarkMode((prev) => !prev),
    
    // Favorites state
    favoriteProducts,
    toggleFavorite,
    isFavorite: (productId) => favoriteProducts.includes(productId),
    
    // Search state
    recentSearches,
    addToRecentSearches,
    clearRecentSearches,
    
    // Category state
    selectedCategory,
    setSelectedCategory,
    
    // Loading state
    loading,
    setLoading,
    
    // Notifications state
    notifications,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationsCount: notifications.filter((n) => !n.read).length,
    
    // Network state
    isOfflineMode,
    setIsOfflineMode,
    toggleOfflineMode,
    checkNetworkConnectivity,
    isNetworkChecking,
    lastNetworkCheck,
    forceOnlineMode
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom App hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext; 