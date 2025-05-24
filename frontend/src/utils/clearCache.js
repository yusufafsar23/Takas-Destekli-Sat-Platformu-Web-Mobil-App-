/**
 * Tarayıcı önbelleğini temizleme yardımcı fonksiyonları
 */

/**
 * Tarayıcı önbelleğini ve yerel depolama bilgilerini temizler
 * @returns {boolean} İşlem başarılı oldu mu
 */
export const clearBrowserCache = () => {
  try {
    // Yerel depolamadan önbellek bilgilerini temizle
    localStorage.removeItem('lastPageRefresh');
    
    // URL'ye önbellek parametresi ekle ve sayfayı yenile
    const url = new URL(window.location.href);
    url.searchParams.set('clear-cache', Date.now().toString());
    window.location.href = url.toString();
    return true;
  } catch (error) {
    console.error('Önbellek temizlenirken hata oluştu:', error);
    return false;
  }
};

/**
 * Ürün resimlerinin önbelleği için kullanılan timestamp almak için yardımcı fonksiyon
 * @returns {string} Timestamp
 */
export const getCacheBustingParam = () => {
  return `?t=${Date.now()}`;
};

/**
 * Bir URL'ye önbellek busting parametresi ekler
 * @param {string} url URL
 * @returns {string} Önbellek busting parametresi eklenmiş URL
 */
export const addCacheBustingToUrl = (url) => {
  if (!url) return url;
  
  // URL zaten önbellek busting parametresi içeriyorsa güncelle
  if (url.includes('?t=')) {
    return url.replace(/\?t=\d+/, getCacheBustingParam());
  }
  
  // URL başka parametreler içeriyorsa & ile ekle
  if (url.includes('?')) {
    return `${url}&t=${Date.now()}`;
  }
  
  // Diğer durumda ? ile ekle
  return `${url}${getCacheBustingParam()}`;
};

export default {
  clearBrowserCache,
  getCacheBustingParam,
  addCacheBustingToUrl
}; 