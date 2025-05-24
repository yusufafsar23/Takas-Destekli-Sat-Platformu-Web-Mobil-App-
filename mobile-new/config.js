// API environment configuration
// Change the API_URL according to your environment

// API URL - Seçeneklerden SADECE BİRİNİ aktif edin, diğerlerini yorum satırı yapın
// --------------------------------------

// OFFLINE MOD - API sunucusuna bağlanmadan çalışır (varsayılan kategoriler kullanılır)
export const API_OFFLINE_MODE = false;

// NOT: Aşağıdaki seçeneklerden SADECE BİR TANESİNİ aktif edin!

// 1. Android Emülatör için 
// export const API_URL = 'http://10.0.2.2:5000';

// 2. iOS Simulator veya Expo Go için (bazı durumlarda çalışmayabilir)
// export const API_URL = 'http://localhost:5000';

// 3. Gerçek cihazlar için local IP (Wi-Fi IP adresinizi kullanın)
// NOT: ipconfig (Windows) veya ifconfig (Mac/Linux) komutuyla IP adresinizi öğrenebilirsiniz
export const API_URL = 'http://192.168.1.61:5000'; // Bilgisayarınızın gerçek IP adresi

// 4. Production
// export const API_URL = 'https://takas-platform-api.domain.com';

// Image base URL
export const IMAGE_BASE_URL = `${API_URL}/images`;

// App configuration
export const APP_CONFIG = {
  appName: 'Takas Platform',
  version: '1.0.0',
  pageSize: 20, // Number of items to display per page
}; 