import { API_SERVER_URL } from './api';

/**
 * Resim URL'lerini doğru formata dönüştüren yardımcı fonksiyon
 * Farklı ekranlardan gelen istekleri tek bir yerden yönetir
 * 
 * @param {string|object} imageData - İşlenecek resim verisi (string URL veya nesne)
 * @returns {string} - İşlenmiş resim URL'si
 */
export const getImageUrl = (imageData) => {
  if (!imageData) {
    console.log('HATA: Resim verisi yok!');
    return 'https://placehold.co/600x400/e0e0e0/FFFFFF?text=No+Image';
  }
  
  // String URL
  if (typeof imageData === 'string') {
    console.log('Resim verisi (string):', imageData);
    
    // Eğer URL /uploads/ ile başlıyorsa, tam yol oluştur
    if (imageData.startsWith('/uploads/')) {
      const fullUrl = `${API_SERVER_URL}${imageData}`;
      console.log('Oluşturulan tam URL:', fullUrl);
      
      // Resim URL'sini test et
      fetch(fullUrl)
        .then(response => {
          console.log(`Resim erişim testi (${fullUrl}):`, 
            response.status, 
            response.ok ? 'BAŞARILI' : 'BAŞARISIZ'
          );
        })
        .catch(error => {
          console.log(`Resim erişim hatası (${fullUrl}):`, error.message);
        });
      
      return fullUrl;
    }
    return imageData;
  }
  
  // Resim objesi içindeki URL'yi al
  if (imageData.url) {
    console.log('Resim verisi (obje):', imageData.url);
    
    // Eğer URL /uploads/ ile başlıyorsa, tam yol oluştur
    if (imageData.url.startsWith('/uploads/')) {
      const fullUrl = `${API_SERVER_URL}${imageData.url}`;
      console.log('Oluşturulan tam URL:', fullUrl);
      
      // Resim URL'sini test et
      fetch(fullUrl)
        .then(response => {
          console.log(`Resim erişim testi (${fullUrl}):`, 
            response.status, 
            response.ok ? 'BAŞARILI' : 'BAŞARISIZ'
          );
        })
        .catch(error => {
          console.log(`Resim erişim hatası (${fullUrl}):`, error.message);
        });
      
      return fullUrl;
    }
    return imageData.url;
  }
  
  console.log('HATA: Resim verisi tanımlanamadı:', imageData);
  return 'https://placehold.co/600x400/e0e0e0/FFFFFF?text=No+Image';
};

/**
 * Ürün nesnesinden resim URL'sini çıkaran yardımcı fonksiyon
 * 
 * @param {object} product - Ürün nesnesi
 * @returns {string} - İşlenmiş resim URL'si
 */
export const getProductImageUrl = (product) => {
  // Resim dizisi varsa ilk resmi kullan
  if (product.images && product.images.length > 0) {
    return getImageUrl(product.images[0]);
  }
  
  // Tekil resim varsa onu kullan
  if (product.imageUrl) {
    return getImageUrl(product.imageUrl);
  }
  
  if (product.image) {
    return getImageUrl(product.image);
  }
  
  // Varsayılan resim
  return `https://placehold.co/600x400/E0E0E0/555555?text=${encodeURIComponent(product.title || 'Ürün')}`;
};

/**
 * Ürün nesnesinden tüm resimleri dizi olarak çıkaran yardımcı fonksiyon
 * 
 * @param {object} product - Ürün nesnesi
 * @returns {Array<string>} - İşlenmiş resim URL'lerinin dizisi
 */
export const getProductImages = (product) => {
  // Resim dizisi varsa, her bir resmi URL formatına dönüştür
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map(img => getImageUrl(img));
  }
  
  // Tek bir resim varsa
  if (product.imageUrl) {
    return [getImageUrl(product.imageUrl)];
  }
  
  if (product.image) {
    return [getImageUrl(product.image)];
  }
  
  // Hiç resim yoksa varsayılan resim
  return ['https://placehold.co/600x400/e0e0e0/FFFFFF?text=No+Image'];
};

export default {
  getImageUrl,
  getProductImageUrl,
  getProductImages
}; 