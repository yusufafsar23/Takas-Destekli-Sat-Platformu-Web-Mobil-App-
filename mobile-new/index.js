import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';
import App from './App';

// Tüm logları bastır - Geliştirme sürecinde daha net görüntü için
LogBox.ignoreAllLogs(true);

// topInsetsChange hatasını yakalayıp önlemek için
if (global.ErrorUtils) {
  const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
  
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // topInsetsChange hatalarını engelle
    if (error && error.message && error.message.includes('topInsetsChange')) {
      console.log('Insets değişikliği hatası yakalandı ve yoksayıldı');
      return;
    }
    
    // Diğer hataları normal şekilde işle
    originalGlobalHandler(error, isFatal);
  });
}

// App bileşenini ana bileşen olarak kaydet
registerRootComponent(App); 