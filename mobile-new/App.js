import React from 'react';
import { StatusBar, SafeAreaView } from 'react-native';
import RootLayout from './app/_layout';

export default function App() {
  useEffect(() => {
    // Hata yakalama işleyicisini hazırla
      const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // topInsetsChange hatalarını engelle
        if (error && error.message && 
           (error.message.includes('topInsetsChange') || 
            error.message.includes('Unsupported top level event'))) {
          console.log('Insets değişikliği hatası yakalandı ve yoksayıldı');
          return;
        }
        
        // Diğer hataları normal şekilde işle
        originalGlobalHandler(error, isFatal);
      });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <RootLayout />
    </SafeAreaView>
  );
} 