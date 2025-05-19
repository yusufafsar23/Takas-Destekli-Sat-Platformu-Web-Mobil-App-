/**
 * Tarayıcı ile ilgili yardımcı fonksiyonlar
 */

/**
 * Önbellek sorunlarını çözmek için sayfayı yeniler
 * Bu fonksiyon, sayfa yenileme ile tarayıcı önbelleğini temizler
 */
export const forceCacheRefresh = () => {
  // URL'ye zaman damgası parametresi ekle
  const timestamp = new Date().getTime();
  const url = new URL(window.location.href);
  url.searchParams.set('t', timestamp);
  
  // Sayfayı yeni URL ile yenile
  window.location.href = url.toString();
};

/**
 * Önbellek sorunlarını çözmek için gerekli olduğunda sayfayı yeniler
 * Bu işlev, sayfa yüklendiğinde çağrılarak son ziyaret zamanına göre 
 * sayfanın yenilenmesi gerekip gerekmediğine karar verir.
 */
export const refreshIfNeeded = () => {
  // Son sayfa yükleme zamanını al
  const lastRefresh = localStorage.getItem('lastPageRefresh');
  const now = new Date().getTime();
  
  // Belirli bir süre geçtiyse sayfayı yenile (örn: 30 dakika)
  const refreshInterval = 30 * 60 * 1000; // 30 dakika
  
  if (!lastRefresh || (now - lastRefresh) > refreshInterval) {
    localStorage.setItem('lastPageRefresh', now);
    forceCacheRefresh();
    return true;
  }
  
  // Yenileme gerekmiyorsa son ziyaret zamanını güncelle
  localStorage.setItem('lastPageRefresh', now);
  return false;
};

/**
 * URL'ye önbellek önleyici parametre ekler
 * @param {string} url - Orijinal URL
 * @returns {string} - Önbellek önleyici parametre eklenmiş URL
 */
export const addCacheBustingParam = (url) => {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url, window.location.origin);
    urlObj.searchParams.set('t', new Date().getTime());
    return urlObj.toString();
  } catch (e) {
    // URL işleme hatası durumunda orijinal URL'yi döndür
    console.error('URL işleme hatası:', e);
    return url;
  }
};

// Dışa aktarılan varsayılan modül
export default {
  forceCacheRefresh,
  refreshIfNeeded,
  addCacheBustingParam
}; 