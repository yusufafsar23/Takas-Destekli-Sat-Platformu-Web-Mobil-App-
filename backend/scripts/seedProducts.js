const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');

// .env dosyasını yükle
dotenv.config();

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/takas-platform')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });

// Örnek ürünler
const sampleProducts = [
  {
    title: 'iPhone 13 Pro',
    description: 'Mükemmel durumda, tüm aksesuarlarıyla birlikte. Çizik yok, kutusunda.',
    price: 24000,
    condition: 'Yeni Gibi',
    location: 'İstanbul, Kadıköy',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/FF6B6B/FFFFFF?text=iPhone+13',
        publicId: 'iphone13',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: true,
    tradePreferences: {
      acceptsAnyTrade: false,
      minTradeValuePercentage: 90,
      description: 'Teknoloji ürünleri ile takas edilebilir'
    },
    isPromoted: true,
    promotionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 gün sonra
    tags: ['Apple', 'iPhone', 'Smartphone', 'iOS']
  },
  {
    title: 'Samsung Galaxy S22 Ultra',
    description: 'Kutusunda, tüm aksesuarlarıyla. 1 yıllık, garanti devam ediyor.',
    price: 20000,
    condition: 'İyi',
    location: 'Ankara, Çankaya',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/4169E1/FFFFFF?text=Samsung+S22',
        publicId: 'samsung-s22',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: true,
    tradePreferences: {
      acceptsAnyTrade: false,
      minTradeValuePercentage: 80,
      description: 'Diğer telefonlar veya bilgisayar ürünleri ile takas edilebilir'
    },
    isPromoted: true,
    promotionExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 gün sonra
    tags: ['Samsung', 'Galaxy', 'Android', 'Smartphone']
  },
  {
    title: 'MacBook Pro M2',
    description: '16 GB RAM, 512 GB SSD, Space Gray. Kutusunda, çok az kullanıldı.',
    price: 42000,
    condition: 'Yeni Gibi',
    location: 'İzmir, Karşıyaka',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/20B2AA/FFFFFF?text=MacBook+Pro',
        publicId: 'macbook-pro',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: true,
    tradePreferences: {
      acceptsAnyTrade: false,
      minTradeValuePercentage: 90,
      description: 'Sadece Apple ürünleri ile takas edilebilir'
    },
    isPromoted: true,
    promotionExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 gün sonra
    tags: ['Apple', 'MacBook', 'Laptop', 'M2']
  },
  {
    title: 'PlayStation 5',
    description: 'Kutusunda, 2 oyun kumandası ve 5 oyun ile birlikte.',
    price: 18000,
    condition: 'İyi',
    location: 'Bursa, Nilüfer',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/800080/FFFFFF?text=PlayStation+5',
        publicId: 'ps5',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: true,
    tradePreferences: {
      acceptsAnyTrade: false,
      minTradeValuePercentage: 85,
      description: 'Xbox Series X veya oyun bilgisayarı ile takas edilebilir'
    },
    isPromoted: true,
    promotionExpiry: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 gün sonra
    tags: ['PlayStation', 'PS5', 'Console', 'Gaming']
  },
  {
    title: 'Canon EOS R5 Fotoğraf Makinesi',
    description: 'Profesyonel fotoğraf makinesi, 2 lens ile birlikte. Sadece birkaç kez kullanıldı.',
    price: 65000,
    condition: 'Yeni Gibi',
    location: 'İstanbul, Beşiktaş',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/DAA520/FFFFFF?text=Canon+EOS+R5',
        publicId: 'canon-eos-r5',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: false,
    isPromoted: false,
    tags: ['Canon', 'Fotoğraf', 'Kamera', 'DSLR']
  },
  {
    title: 'Apple Watch Series 8',
    description: 'GPS + Cellular, 45mm, Kutusunda, çok az kullanıldı.',
    price: 12000,
    condition: 'Yeni Gibi',
    location: 'Ankara, Çankaya',
    status: 'active',
    images: [
      {
        url: 'https://placehold.co/600x400/1E90FF/FFFFFF?text=Apple+Watch',
        publicId: 'apple-watch',
        width: 600,
        height: 400,
        isCover: true
      }
    ],
    acceptsTradeOffers: true,
    tradePreferences: {
      acceptsAnyTrade: true,
      description: 'Benzer değerdeki herhangi bir ürün ile takas edilebilir'
    },
    isPromoted: false,
    tags: ['Apple', 'Watch', 'Wearable', 'Smartwatch']
  }
];

// Ana işlev
const seedProducts = async () => {
  try {
    // Önce bir kullanıcı bulalım
    const user = await User.findOne();
    
    if (!user) {
      console.log('Ürün eklemek için önce bir kullanıcı oluşturulmalı');
      process.exit(1);
    }
    
    // Kategorileri bulalım
    const categories = await Category.find();
    
    if (categories.length === 0) {
      console.log('Ürün eklemek için önce kategori oluşturulmalı');
      process.exit(1);
    }
    
    // Ürünleri ekleyelim
    for (const productData of sampleProducts) {
      // Rastgele bir kategori seçelim
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      
      // Ürün verisini oluşturalım
      const product = new Product({
        ...productData,
        category: randomCategory._id,
        owner: user._id,
        coordinates: {
          type: 'Point',
          coordinates: [32.85, 39.92] // Default koordinatlar, Ankara
        }
      });
      
      // Kaydedelim
      await product.save();
      console.log(`Ürün eklendi: ${product.title}`);
    }
    
    console.log('Tüm örnek ürünler başarıyla eklendi');
    process.exit(0);
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    process.exit(1);
  }
};

// Scripti çalıştır
seedProducts(); 