/**
 * Web sitesi ile uyumlu görüntüleri yükleyen yardımcı dosya
 */

// Banner resimleri
export const getBannerImage = (key) => {
  // Burada web sitenizden alınan gerçek resim URL'lerini tanımlayabilirsiniz
  const bannerUrls = {
    modern: 'https://images.unsplash.com/photo-1605902711622-cfb43c4437b5?q=80&auto=format',
    shopping: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&auto=format',
    secure: 'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&auto=format',
  };
  
  return bannerUrls[key] || null;
};

// Kategori resimleri
export const getCategoryImage = (key) => {
  // Burada web sitenizden alınan gerçek kategori resimlerini tanımlayabilirsiniz
  const categoryUrls = {
    electronics: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&auto=format',
    home: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&auto=format',
    fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&auto=format',
    books: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&auto=format',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&auto=format',
    games: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&auto=format',
  };
  
  return categoryUrls[key] || null;
}; 