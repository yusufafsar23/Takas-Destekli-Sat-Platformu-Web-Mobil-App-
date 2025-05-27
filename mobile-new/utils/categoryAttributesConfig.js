/**
 * Kategori bazlı AI fiyat tahmini için özellik konfigürasyonu
 * Her kategori için gerekli olan özellikler ve etki faktörleri tanımlanmıştır
 */

// Tüm kategori özellik konfigürasyonları
const categoryAttributes = {
  // Aksesuarlar
  "Aksesuarlar": [
    {
      name: "is_original",
      label: "Orijinallik",
      type: "select",
      options: [
        { label: "Orijinal", value: "Orijinal", impact: 0.3 },
        { label: "Orijinal Değil", value: "Orijinal Değil", impact: -0.2 }
      ],
      required: true
    }
  ],
  
  // Ayakkabılar
  "Ayakkabılar": [
    {
      name: "is_original",
      label: "Orijinallik",
      type: "select",
      options: [
        { label: "Orijinal", value: "Orijinal", impact: 0.5 },
        { label: "Orijinal Değil", value: "Orijinal Değil", impact: -0.3 }
      ],
      required: true
    }
  ],
  
  // Bebek ve Çocuk
  "Bebek ve Çocuk": [
    {
      name: "hygiene_status",
      label: "Hijyen Durumu",
      type: "select",
      options: [
        { label: "Çok Temiz", value: "very_clean", impact: 0.3 },
        { label: "Temiz", value: "clean", impact: 0.1 },
        { label: "Makul", value: "acceptable", impact: -0.2 }
      ],
      required: true
    }
  ],
  
  // Dekorasyon
  "Dekorasyon": [
    {
      name: "is_handmade",
      label: "El Yapımı mı?",
      type: "select",
      options: [
        { label: "Evet", value: "Evet", impact: 0.4 },
        { label: "Hayır", value: "Hayır", impact: -0.1 }
      ],
      required: true
    },
    {
      name: "product_type",
      label: "Ürün Tipi",
      type: "select",
      options: [
        { label: "Tablo", value: "tablo", impact: 0.2 },
        { label: "Vazo", value: "vazo", impact: 0.1 },
        { label: "Heykel", value: "heykel", impact: 0.3 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    }
  ],
  
  // Kitap, Film, Müzik
  "Kitap, Film, Müzik": [
    {
      name: "release_year",
      label: "Baskı Yılı / Versiyon",
      type: "number",
      placeholder: "Örn: 2020",
      min: 1900,
      max: new Date().getFullYear(),
      required: true,
      impact: 0.05  // Daha yeni ise daha değerli
    },
    {
      name: "is_original",
      label: "Orijinallik",
      type: "select",
      options: [
        { label: "Orijinal", value: "Orijinal", impact: 0.3 },
        { label: "Orijinal Değil", value: "Orijinal Değil", impact: -0.4 }
      ],
      required: true
    },
    {
      name: "is_rare",
      label: "Nadirlik",
      type: "select",
      options: [
        { label: "İmzalı/Nadir", value: "nadir", impact: 0.8 },
        { label: "Standart", value: "standart", impact: 0 }
      ],
      required: true
    }
  ],
  
  // Mobilya
  "Mobilya": [
    {
      name: "usage_duration",
      label: "Kullanım Süresi (Yıl)",
      type: "number",
      placeholder: "Örn: 2",
      min: 0,
      max: 50,
      required: true,
      impact: -0.1  // Kullanım süresi arttıkça değer azalır
    },
    {
      name: "material_quality",
      label: "Malzeme Kalitesi",
      type: "select",
      options: [
        { label: "Masif Ahşap", value: "masif_ahşap", impact: 0.5 },
        { label: "MDF", value: "mdf", impact: 0 },
        { label: "Sunta", value: "sunta", impact: -0.2 },
        { label: "Metal", value: "metal", impact: 0.1 },
        { label: "Deri", value: "deri", impact: 0.3 },
        { label: "Plastik", value: "plastik", impact: -0.3 },
        { label: "Diğer", value: "diğer", impact: -0.1 }
      ],
      required: true
    }
  ],
  
  // Mutfak Eşyaları
  "Mutfak Eşyaları": [
    {
      name: "piece_count",
      label: "Parça Sayısı",
      type: "number",
      placeholder: "Örn: 6",
      min: 1,
      max: 100,
      required: true,
      impact: 0.05  // Parça sayısı arttıkça değer artar
    },
    {
      name: "usage_duration",
      label: "Kullanım Süresi (Yıl)",
      type: "number",
      placeholder: "Örn: 1",
      min: 0,
      max: 20,
      required: true,
      impact: -0.1  // Kullanım süresi arttıkça değer azalır
    }
  ],
  
  // Ses Sistemleri
  "Ses Sistemleri": [
    {
      name: "channel_count",
      label: "Kanal Sayısı",
      type: "select",
      options: [
        { label: "2.0", value: "2.0", impact: -0.1 },
        { label: "2.1", value: "2.1", impact: 0 },
        { label: "5.1", value: "5.1", impact: 0.3 },
        { label: "7.1", value: "7.1", impact: 0.5 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    },
    {
      name: "connection_type",
      label: "Bluetooth / Kablolu",
      type: "select",
      options: [
        { label: "Bluetooth", value: "bluetooth", impact: 0.2 },
        { label: "Kablolu", value: "kablolu", impact: 0 },
        { label: "Her İkisi", value: "her_ikisi", impact: 0.3 }
      ],
      required: true
    },
    {
      name: "has_warranty",
      label: "Garanti",
      type: "select",
      options: [
        { label: "Var", value: "Var", impact: 0.2 },
        { label: "Yok", value: "Yok", impact: -0.1 }
      ],
      required: true
    }
  ],
  
  // Spor ve Outdoor
  "Spor ve Outdoor": [
    {
      name: "product_type",
      label: "Ürün Tipi",
      type: "select",
      options: [
        { label: "Koşu Bandı", value: "koşu_bandı", impact: 0.5 },
        { label: "Kamp Çadırı", value: "kamp_çadırı", impact: 0.2 },
        { label: "Bisiklet", value: "bisiklet", impact: 0.3 },
        { label: "Kondisyon Aleti", value: "kondisyon_aleti", impact: 0.4 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    },
    {
      name: "usage_duration",
      label: "Kullanım Süresi (Yıl)",
      type: "number",
      placeholder: "Örn: 1",
      min: 0,
      max: 20,
      required: true,
      impact: -0.15  // Kullanım süresi arttıkça değer azalır
    }
  ],
  
  // Televizyonlar
  "Televizyonlar": [
    {
      name: "screen_size",
      label: "Ekran Boyutu (inch)",
      type: "select",
      options: [
        { label: "32 inch", value: "32", impact: -0.2 },
        { label: "40 inch", value: "40", impact: -0.1 },
        { label: "43 inch", value: "43", impact: 0 },
        { label: "50 inch", value: "50", impact: 0.1 },
        { label: "55 inch", value: "55", impact: 0.2 },
        { label: "65 inch", value: "65", impact: 0.4 },
        { label: "75 inch", value: "75", impact: 0.6 },
        { label: "85 inch", value: "85", impact: 0.8 }
      ],
      required: true
    },
    {
      name: "is_smart",
      label: "Smart TV Özelliği",
      type: "select",
      options: [
        { label: "Var", value: "Var", impact: 0.3 },
        { label: "Yok", value: "Yok", impact: -0.2 }
      ],
      required: true
    },
    {
      name: "has_remote",
      label: "Kumanda Var mı?",
      type: "select",
      options: [
        { label: "Var", value: "Var", impact: 0.1 },
        { label: "Yok", value: "Yok", impact: -0.2 }
      ],
      required: true
    }
  ],
  
  // Yatak ve Banyo
  "Yatak ve Banyo": [
    {
      name: "cleanliness",
      label: "Temizlik Durumu",
      type: "select",
      options: [
        { label: "Çok Temiz", value: "çok_temiz", impact: 0.3 },
        { label: "Temiz", value: "temiz", impact: 0.1 },
        { label: "Normal", value: "normal", impact: 0 },
        { label: "Orta", value: "orta", impact: -0.2 },
        { label: "Kötü", value: "kötü", impact: -0.4 }
      ],
      required: true
    }
  ],
  
  // Çocuk Giyim
  "Çocuk Giyim": [
    {
      name: "hygiene_status",
      label: "Hijyen Durumu",
      type: "select",
      options: [
        { label: "Çok Temiz", value: "çok_temiz", impact: 0.3 },
        { label: "Temiz", value: "temiz", impact: 0.1 },
        { label: "Normal", value: "normal", impact: 0 },
        { label: "Orta", value: "orta", impact: -0.2 }
      ],
      required: true
    },
    {
      name: "fabric_type",
      label: "Kumaş Türü",
      type: "select",
      options: [
        { label: "Pamuk", value: "pamuk", impact: 0.2 },
        { label: "Polyester", value: "polyester", impact: -0.1 },
        { label: "Yün", value: "yün", impact: 0.3 },
        { label: "Keten", value: "keten", impact: 0.25 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    }
  ],
  
  // Telefonlar
  "Telefonlar": [
    {
      name: "storage",
      label: "Hafıza (GB)",
      type: "select",
      options: [
        { label: "32 GB", value: "32", impact: -0.3 },
        { label: "64 GB", value: "64", impact: -0.1 },
        { label: "128 GB", value: "128", impact: 0.1 },
        { label: "256 GB", value: "256", impact: 0.3 },
        { label: "512 GB", value: "512", impact: 0.5 },
        { label: "1 TB", value: "1024", impact: 0.7 }
      ],
      required: true
    },
    {
      name: "battery_health",
      label: "Batarya Sağlığı (%)",
      type: "number",
      placeholder: "Örn: 90",
      min: 0,
      max: 100,
      required: true,
      impact: 0.01  // Her % için 0.01 etki
    },
    {
      name: "ram",
      label: "RAM (GB)",
      type: "select",
      options: [
        { label: "2 GB", value: "2", impact: -0.4 },
        { label: "3 GB", value: "3", impact: -0.3 },
        { label: "4 GB", value: "4", impact: -0.1 },
        { label: "6 GB", value: "6", impact: 0.1 },
        { label: "8 GB", value: "8", impact: 0.3 },
        { label: "12 GB", value: "12", impact: 0.5 },
        { label: "16 GB", value: "16", impact: 0.7 }
      ],
      required: true
    },
    {
      name: "has_warranty",
      label: "Garanti",
      type: "select",
      options: [
        { label: "Var", value: "Var", impact: 0.2 },
        { label: "Yok", value: "Yok", impact: -0.1 }
      ],
      required: true
    }
  ],
  
  // Bilgisayarlar
  "Bilgisayarlar": [
    {
      name: "ram",
      label: "RAM (GB)",
      type: "select",
      options: [
        { label: "4 GB", value: "4", impact: -0.2 },
        { label: "8 GB", value: "8", impact: 0 },
        { label: "16 GB", value: "16", impact: 0.2 },
        { label: "32 GB", value: "32", impact: 0.4 },
        { label: "64 GB", value: "64", impact: 0.6 }
      ],
      required: true
    },
    {
      name: "storage",
      label: "Depolama (GB)",
      type: "select",
      options: [
        { label: "128 GB", value: "128", impact: -0.2 },
        { label: "256 GB", value: "256", impact: 0 },
        { label: "512 GB", value: "512", impact: 0.2 },
        { label: "1 TB", value: "1024", impact: 0.4 },
        { label: "2 TB", value: "2048", impact: 0.6 }
      ],
      required: true
    },
    {
      name: "has_warranty",
      label: "Garanti",
      type: "select",
      options: [
        { label: "Var", value: "Var", impact: 0.25 },
        { label: "Yok", value: "Yok", impact: -0.1 }
      ],
      required: true
    }
  ],
  
  // Erkek Giyim
  "Erkek Giyim": [
    {
      name: "fabric_type",
      label: "Kumaş Türü",
      type: "select",
      options: [
        { label: "Pamuk", value: "pamuk", impact: 0.2 },
        { label: "Polyester", value: "polyester", impact: -0.1 },
        { label: "Yün", value: "yün", impact: 0.3 },
        { label: "Denim", value: "denim", impact: 0.15 },
        { label: "Keten", value: "keten", impact: 0.25 },
        { label: "Deri", value: "deri", impact: 0.4 },
        { label: "Karışım", value: "karışım", impact: 0.05 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    }
  ],
  
  // Kadın Giyim
  "Kadın Giyim": [
    {
      name: "fabric_type",
      label: "Kumaş Türü",
      type: "select",
      options: [
        { label: "Pamuk", value: "pamuk", impact: 0.2 },
        { label: "Polyester", value: "polyester", impact: -0.1 },
        { label: "Yün", value: "yün", impact: 0.3 },
        { label: "İpek", value: "ipek", impact: 0.5 },
        { label: "Keten", value: "keten", impact: 0.25 },
        { label: "Deri", value: "deri", impact: 0.4 },
        { label: "Dantel", value: "dantel", impact: 0.35 },
        { label: "Saten", value: "saten", impact: 0.3 },
        { label: "Karışım", value: "karışım", impact: 0.05 },
        { label: "Diğer", value: "diğer", impact: 0 }
      ],
      required: true
    }
  ]
};

/**
 * Kategori adına göre özellik yapılandırmasını getir
 * @param {string} categoryName - Kategori adı
 * @returns {Array} - Özellik listesi
 */
export const getCategoryAttributes = (categoryName) => {
  if (!categoryName) return [];
  
  // Doğrudan eşleşme ara
  if (categoryAttributes[categoryName]) {
    return categoryAttributes[categoryName];
  }
  
  // Kısmi eşleşme ara
  const lowerCategoryName = categoryName.toLowerCase();
  
  for (const [key, attributes] of Object.entries(categoryAttributes)) {
    if (lowerCategoryName.includes(key.toLowerCase()) || 
        key.toLowerCase().includes(lowerCategoryName)) {
      return attributes;
    }
  }
  
  // Özel durumlar için kontrol
  if (lowerCategoryName.includes('aksesuar')) {
    return categoryAttributes["Aksesuarlar"];
  }
  if (lowerCategoryName.includes('ayakkabı')) {
    return categoryAttributes["Ayakkabılar"];
  }
  if (lowerCategoryName.includes('bebek') || lowerCategoryName.includes('çocuk')) {
    return categoryAttributes["Bebek ve Çocuk"];
  }
  if (lowerCategoryName.includes('dekorasyon')) {
    return categoryAttributes["Dekorasyon"];
  }
  if (lowerCategoryName.includes('kitap') || lowerCategoryName.includes('film') || lowerCategoryName.includes('müzik')) {
    return categoryAttributes["Kitap, Film, Müzik"];
  }
  if (lowerCategoryName.includes('mobilya')) {
    return categoryAttributes["Mobilya"];
  }
  if (lowerCategoryName.includes('mutfak')) {
    return categoryAttributes["Mutfak Eşyaları"];
  }
  if (lowerCategoryName.includes('ses') || lowerCategoryName.includes('audio')) {
    return categoryAttributes["Ses Sistemleri"];
  }
  if (lowerCategoryName.includes('spor') || lowerCategoryName.includes('outdoor')) {
    return categoryAttributes["Spor ve Outdoor"];
  }
  if (lowerCategoryName.includes('televizyon') || lowerCategoryName.includes('tv')) {
    return categoryAttributes["Televizyonlar"];
  }
  if (lowerCategoryName.includes('yatak') || lowerCategoryName.includes('banyo')) {
    return categoryAttributes["Yatak ve Banyo"];
  }
  if (lowerCategoryName.includes('çocuk') && lowerCategoryName.includes('giyim')) {
    return categoryAttributes["Çocuk Giyim"];
  }
  if (lowerCategoryName.includes('erkek') && lowerCategoryName.includes('giyim')) {
    return categoryAttributes["Erkek Giyim"];
  }
  if (lowerCategoryName.includes('kadın') && lowerCategoryName.includes('giyim')) {
    return categoryAttributes["Kadın Giyim"];
  }
  if (lowerCategoryName.includes('telefon') || lowerCategoryName.includes('phone')) {
    return categoryAttributes["Telefonlar"];
  }
  if (lowerCategoryName.includes('bilgisayar') || lowerCategoryName.includes('computer') || lowerCategoryName.includes('laptop')) {
    return categoryAttributes["Bilgisayarlar"];
  }
  
  return [];
};

/**
 * Özellik değerine göre fiyat etkisini hesapla
 * @param {Object} attribute - Özellik objesi
 * @param {string|number} value - Seçilen değer
 * @returns {number} - Etki değeri
 */
export const calculatePriceImpact = (attribute, value) => {
  if (!attribute || !value) return 0;
  
  if (attribute.type === 'select' && attribute.options) {
    const option = attribute.options.find(opt => opt.value === value);
    return option ? option.impact : 0;
  }
  
  if (attribute.type === 'number' && attribute.impact) {
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      return numValue * attribute.impact;
    }
  }
  
  return 0;
};

export default categoryAttributes; 