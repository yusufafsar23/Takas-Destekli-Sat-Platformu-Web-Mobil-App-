/**
 * Resim işleme yardımcıları
 * Bu modül, resim URL'lerinin doğru şekilde oluşturulması ve önbellek sorunlarını çözmek için kullanılır
 */

/**
 * Resmin URL'sine önbellek-busting parametresi ekler
 * @param {string} url - İşlenecek URL
 * @returns {string} - Önbellek parametresi eklenmiş URL
 */
export const addCacheBuster = (url) => {
  if (!url) return url;
  
  // Zaten bir önbellek parametresi varsa, yenisiyle değiştir
  if (url.includes('?t=')) {
    return url.replace(/\?t=\d+/, `?t=${new Date().getTime()}`);
  }
  
  // Eğer başka sorgu parametreleri varsa & ile ekle, yoksa ? ile ekle
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${new Date().getTime()}`;
};

/**
 * Yüklenen dosyalar için otomatik önbellek-busting
 * @param {string} url - İşlenecek URL
 * @returns {string} - Gerekirse önbellek parametresi eklenmiş URL
 */
export const getImageUrlWithCacheBusting = (url) => {
  if (!url) return '/images/product-placeholder.jpg';
  
  // Yüklenen dosyaların URL'lerine otomatik önbellek-busting ekle
  if (typeof url === 'string' && (url.startsWith('/uploads/') || url.includes('/uploads/'))) {
    return addCacheBuster(url);
  }
  
  return url;
};

/**
 * Kategori ismine göre uygun yer tutucu resim döndürür
 * @param {object|string} category - Kategori nesnesi veya ismi
 * @returns {string} - Yer tutucu resim URL'si
 */
export const getCategoryPlaceholder = (category) => {
  if (!category) return '/images/product-placeholder.jpg';
  
  const categoryName = typeof category === 'object' && category.name 
    ? category.name.toLowerCase() 
    : (typeof category === 'string' ? category.toLowerCase() : '');
  
  // Kategori ismine göre uygun resmi seç
  if (categoryName.includes('elektronik')) return '/images/electronics.jpg';
  if (categoryName.includes('giyim') || categoryName.includes('kıyafet')) return '/images/clothing.jpg';
  if (categoryName.includes('ev') || categoryName.includes('mobilya')) return '/images/furniture.jpg';
  if (categoryName.includes('kitap')) return '/images/books.jpg';
  if (categoryName.includes('spor')) return '/images/sports.jpg';
  
  // Eşleşme yoksa genel placeholder
  return '/images/product-placeholder.jpg';
};

/**
 * Test fonksiyonu - Konsolda URL'nin önbellek-busting ile nasıl değiştiğini gösterir
 * @param {string} url - Test edilecek URL
 */
export const testCacheBusting = (url) => {
  console.log('Original URL:', url);
  console.log('With cache busting:', getImageUrlWithCacheBusting(url));
};

// Dışa aktarılan varsayılan modül
export default {
  addCacheBuster,
  getImageUrlWithCacheBusting,
  getCategoryPlaceholder,
  testCacheBusting
}; 