const Product = require('../models/Product');
const Category = require('../models/Category');
const { RandomForestRegression } = require('ml-random-forest');

/**
 * Makine Öğrenmesi temelli fiyat tahmini servisi
 * Bu servis gerçek bir ML modeli (Random Forest) eğitir ve kullanır
 */
class MLPricePredictionService {
  constructor() {
    this.models = {}; // Kategori bazlı eğitilmiş modeller
    this.featureEncoders = {}; // Özellik dönüştürücüler
    this.featureNames = {}; // Kategori bazlı özellik isimleri
    this.featureImportance = {}; // Özellik önem değerleri
    this.modelTrainingInProgress = false;
    this.lastTrainingTime = null;
    
    // Model yenileme aralığı - günde bir kez (ms cinsinden)
    this.MODEL_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
    
    // Servis başladığında ilk modelleri eğit
    this.initializeModels();
  }
  
  /**
   * Servisi başlat ve modelleri eğit
   */
  async initializeModels() {
    try {
      console.log('MLPricePredictionService: Model eğitimi başlatılıyor...');
      await this.trainAllModels();
      
      // Periyodik model yenileme planlayıcısı
      setInterval(() => this.refreshModelsIfNeeded(), this.MODEL_REFRESH_INTERVAL);
    } catch (error) {
      console.error('Model eğitimi başlatılamadı:', error);
    }
  }
  
  /**
   * Gerekliyse modelleri yeniden eğit
   */
  async refreshModelsIfNeeded() {
    // Son eğitimden bu yana yeterli zaman geçtiyse yeniden eğit
    if (!this.lastTrainingTime || 
        (Date.now() - this.lastTrainingTime > this.MODEL_REFRESH_INTERVAL)) {
      console.log('MLPricePredictionService: Modeller yenileniyor...');
      await this.trainAllModels();
    }
  }
  
  /**
   * Tüm kategori modelleri için eğitim gerçekleştir
   */
  async trainAllModels() {
    if (this.modelTrainingInProgress) {
      console.log('Model eğitimi zaten devam ediyor, bekleyiniz...');
      return;
    }
    
    this.modelTrainingInProgress = true;
    
    try {
      // Tüm kategorileri al
      const categories = await Category.find().lean();
      
      // Her kategori için ayrı model eğit
      for (const category of categories) {
        await this.trainModelForCategory(category._id.toString(), category.name);
      }
      
      this.lastTrainingTime = Date.now();
      console.log('Tüm kategori modelleri başarıyla eğitildi.');
    } catch (error) {
      console.error('Model eğitimi sırasında hata:', error);
    } finally {
      this.modelTrainingInProgress = false;
    }
  }
  
  /**
   * Belirli bir kategori için model eğitimi
   * @param {string} categoryId - Kategori ID
   * @param {string} categoryName - Kategori adı
   */
  async trainModelForCategory(categoryId, categoryName) {
    try {
      console.log(`"${categoryName}" kategorisi için model eğitimi başlatılıyor...`);
      
      // Kategori için verileri topla
      const products = await Product.find({ 
        category: categoryId,
        status: 'active', 
        price: { $gt: 0 } // Fiyatı olan ürünler
      })
      .select('title description price condition attributes images category')
      .lean();
      
      let trainingData = [...products];
      
      // Yeterli veri yoksa sentetik veri oluştur
      if (products.length < 3) {
        console.log(`"${categoryName}" kategorisi için yeterli veri yok (${products.length} ürün). Sentetik veri üretiliyor...`);
        
        const syntheticData = await this.generateSyntheticData(categoryId, categoryName, products);
        trainingData = [...products, ...syntheticData];
        
        console.log(`${syntheticData.length} adet sentetik veri üretildi. Toplam eğitim verisi: ${trainingData.length}`);
      }
      
      // En az 3 ürün olmalı
      if (trainingData.length < 3) {
        console.log(`"${categoryName}" kategorisi için yeterli veri üretilemedi. Model eğitilmedi.`);
        return;
      }
      
      // Verileri hazırla
      const { features, labels, featureEncoder, featureNames } = this.prepareTrainingData(trainingData, categoryName);
      
      if (features.length === 0 || labels.length === 0) {
        console.log(`"${categoryName}" kategorisi için hazırlanan verilerde sorun var. Model eğitilmedi.`);
        return;
      }
      
      // Random Forest modeli eğit - veri az ise daha basit bir model kullan
      const rfOptions = {
        nEstimators: trainingData.length < 10 ? 20 : 100,  // Veri azsa daha az ağaç
        maxFeatures: 0.8,    // Her ağaç için kullanılacak özellik yüzdesi
        replacement: true,   // Bootstrap
        seed: 42,            // Sabit başlangıç için
        treeOptions: {
          minNumSamples: 2,  // Bir düğümü bölmek için minimum örnek sayısı (düşürüldü)
          maxDepth: trainingData.length < 10 ? 5 : 15  // Veri azsa daha sığ ağaçlar
        }
      };
      
      const model = new RandomForestRegression(rfOptions);
      model.train(features, labels);
      
      // Modelin performansını ölç (eğitim seti üzerinde)
      const predictions = model.predict(features);
      const metrics = this.evaluateModel(labels, predictions);
      
      // Özellik önem analizi
      const featureImportance = this.calculateFeatureImportance(model, featureNames);
      
      console.log(`"${categoryName}" kategorisi için model eğitimi tamamlandı.`);
      console.log(`Performans Metrikleri: R² = ${metrics.r2.toFixed(3)}, MSE = ${metrics.mse.toFixed(2)}, MAE = ${metrics.mae.toFixed(2)}`);
      console.log('Önemli Özellikler:', featureImportance.slice(0, 3).map(f => `${f.name}: ${f.importance.toFixed(3)}`));
      
      // Modeli, özellik kodlayıcıyı ve özellik isimlerini kaydet
      this.models[categoryId] = model;
      this.featureEncoders[categoryId] = featureEncoder;
      this.featureNames[categoryId] = featureNames;
      this.featureImportance[categoryId] = featureImportance;
      
    } catch (error) {
      console.error(`"${categoryName}" kategorisi için model eğitimi sırasında hata:`, error);
    }
  }
  
  /**
   * Sentetik veri oluştur
   * @param {string} categoryId - Kategori ID
   * @param {string} categoryName - Kategori adı
   * @param {Array} existingProducts - Mevcut ürünler
   * @returns {Array} Sentetik ürün verileri
   */
  async generateSyntheticData(categoryId, categoryName, existingProducts = []) {
    try {
      const syntheticProducts = [];
      const syntheticCount = Math.max(10, 20 - existingProducts.length); // En az 10, en fazla 20 ürün olacak şekilde
      
      // 1. Önce aynı kategoriden daha önce silinmiş/satılmış ürünleri kontrol et
      const historicalProducts = await Product.find({
        category: categoryId,
        status: { $ne: 'active' },
        price: { $gt: 0 }
      })
      .select('title description price condition attributes images category')
      .limit(syntheticCount)
      .lean();
      
      if (historicalProducts.length > 0) {
        console.log(`${historicalProducts.length} adet geçmiş ürün verisi bulundu.`);
        // Bu ürünleri sentetik veri olarak kullan
        syntheticProducts.push(...historicalProducts);
      }
      
      // 2. Eğer hala yeterli veri yoksa, benzer kategorilerden ürünleri kullan
      if (syntheticProducts.length < syntheticCount) {
        // Kategori adına göre benzer kategorileri bul
        const relatedCategories = await Category.find({
          name: { $regex: new RegExp(categoryName.split(' ')[0], 'i') },
          _id: { $ne: categoryId }
        }).select('_id').lean();
        
        const relatedCategoryIds = relatedCategories.map(c => c._id);
        
        if (relatedCategoryIds.length > 0) {
          const relatedProducts = await Product.find({
            category: { $in: relatedCategoryIds },
            status: 'active',
            price: { $gt: 0 }
          })
          .select('title description price condition attributes images')
          .limit(syntheticCount - syntheticProducts.length)
          .lean();
          
          // Bu ürünleri kategorimiz için uyarla
          const adaptedProducts = relatedProducts.map(p => ({
            ...p,
            category: categoryId,
            _id: `synthetic_${p._id}`, // ID çakışmasını önle
            price: this.adjustPriceForCategory(p.price, categoryName)
          }));
          
          syntheticProducts.push(...adaptedProducts);
          console.log(`${adaptedProducts.length} adet benzer kategorilerden veri uyarlandı.`);
        }
      }
      
      // 3. Hala yeterli veri yoksa tamamen yapay ürünler oluştur
      if (syntheticProducts.length < syntheticCount) {
        const neededCount = syntheticCount - syntheticProducts.length;
        const artificialProducts = this.createArtificialProducts(
          categoryId, categoryName, neededCount, existingProducts
        );
        
        syntheticProducts.push(...artificialProducts);
        console.log(`${artificialProducts.length} adet tamamen sentetik veri oluşturuldu.`);
      }
      
      return syntheticProducts;
    } catch (error) {
      console.error('Sentetik veri üretimi sırasında hata:', error);
      return [];
    }
  }
  
  /**
   * Tamamen yapay ürünler oluştur
   */
  createArtificialProducts(categoryId, categoryName, count, existingProducts = []) {
    const products = [];
    
    // Mevcut ürünlerden örnek özellikler çıkar
    const conditions = ['new', 'like_new', 'very_good', 'good', 'acceptable'];
    const titles = [
      `${categoryName} Ürünü`, 
      `Satılık ${categoryName}`, 
      `İkinci El ${categoryName}`,
      `Kaliteli ${categoryName}`,
      `${categoryName} Fırsatı`
    ];
    
    // Varsa mevcut ürünlerden marka/özellik çıkar
    const brands = new Set();
    const attributeTypes = new Map();
    
    existingProducts.forEach(p => {
      if (p.attributes) {
        if (p.attributes.brand) brands.add(p.attributes.brand);
        
        // Diğer özellikleri topla
        Object.entries(p.attributes).forEach(([key, value]) => {
          if (!attributeTypes.has(key)) attributeTypes.set(key, new Set());
          attributeTypes.get(key).add(value);
        });
      }
    });
    
    // Fiyat aralığını belirle (kategoriye göre)
    let minPrice = 100;
    let maxPrice = 5000;
    const lowerCategoryName = categoryName.toLowerCase();
    
    if (lowerCategoryName.includes('telefon') || lowerCategoryName.includes('bilgisayar')) {
      minPrice = 1000;
      maxPrice = 20000;
    } else if (lowerCategoryName.includes('araba') || lowerCategoryName.includes('otomobil')) {
      minPrice = 50000;
      maxPrice = 500000;
    } else if (lowerCategoryName.includes('giyim') || lowerCategoryName.includes('ayakkabı')) {
      minPrice = 50;
      maxPrice = 1000;
    } else if (lowerCategoryName.includes('kitap') || lowerCategoryName.includes('dergi')) {
      minPrice = 10;
      maxPrice = 50;
    }
    
    // Yapay ürünleri oluştur
    for (let i = 0; i < count; i++) {
      // Temel ürün özellikleri
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const title = titles[Math.floor(Math.random() * titles.length)] + ` ${i+1}`;
      const price = Math.floor(minPrice + Math.random() * (maxPrice - minPrice));
      
      // Ürün özellikleri
      const attributes = {};
      
      // Marka
      if (brands.size > 0) {
        const brandArray = [...brands];
        attributes.brand = brandArray[Math.floor(Math.random() * brandArray.length)];
      } else {
        // Örnek markalar
        const defaultBrands = ['Marka A', 'Marka B', 'Marka C', 'Marka X', 'Marka Y'];
        attributes.brand = defaultBrands[Math.floor(Math.random() * defaultBrands.length)];
      }
      
      // Diğer özellikleri ekle
      attributeTypes.forEach((values, key) => {
        if (key !== 'brand' && values.size > 0) {
          const valueArray = [...values];
          attributes[key] = valueArray[Math.floor(Math.random() * valueArray.length)];
        }
      });
      
      // Kategori özel özellikler
      if (lowerCategoryName.includes('telefon')) {
        if (!attributes.storage) attributes.storage = [64, 128, 256, 512][Math.floor(Math.random() * 4)].toString();
        if (!attributes.ram) attributes.ram = [4, 6, 8, 12][Math.floor(Math.random() * 4)].toString();
      } else if (lowerCategoryName.includes('bilgisayar')) {
        if (!attributes.processor) attributes.processor = ['i5', 'i7', 'Ryzen 5', 'Ryzen 7'][Math.floor(Math.random() * 4)];
        if (!attributes.ram) attributes.ram = [8, 16, 32][Math.floor(Math.random() * 3)].toString();
      } else if (lowerCategoryName.includes('araba')) {
        if (!attributes.year) {
          const currentYear = new Date().getFullYear();
          attributes.year = (currentYear - Math.floor(Math.random() * 10)).toString();
        }
        if (!attributes.mileage) attributes.mileage = Math.floor(Math.random() * 150000).toString();
      }
      
      // Yapay ürünü oluştur
      products.push({
        _id: `synthetic_${categoryId}_${i}`,
        title,
        description: `${title} - Sentetik olarak oluşturulmuş örnek ürün açıklaması.`,
        price,
        condition,
        attributes,
        category: categoryId,
        images: [],
        isSynthetic: true
      });
    }
    
    return products;
  }
  
  /**
   * Fiyatı kategoriye göre ayarla
   */
  adjustPriceForCategory(price, categoryName) {
    const lowerCategoryName = categoryName.toLowerCase();
    
    // Kategoriye göre fiyat çarpanı
    let multiplier = 1.0;
    
    if (lowerCategoryName.includes('telefon') || lowerCategoryName.includes('bilgisayar')) {
      multiplier = 1.2;
    } else if (lowerCategoryName.includes('araba') || lowerCategoryName.includes('otomobil')) {
      multiplier = 5.0;
    } else if (lowerCategoryName.includes('giyim') || lowerCategoryName.includes('ayakkabı')) {
      multiplier = 0.5;
    } else if (lowerCategoryName.includes('kitap') || lowerCategoryName.includes('dergi')) {
      multiplier = 0.3;
    }
    
    // Rassal değişim ekle
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2 arası
    
    return Math.round(price * multiplier * randomFactor);
  }
  
  /**
   * Özellik önem değerlerini hesapla
   * @param {Object} model - Eğitilmiş Random Forest modeli
   * @param {Array} featureNames - Özellik isimleri
   * @returns {Array} Önem değerleri
   */
  calculateFeatureImportance(model, featureNames) {
    // RandomForest içindeki tüm ağaçlardan ortalama özellik önemini hesapla
    try {
      // Model özelliklerini kontrol et
      if (!model || !model.trees || model.trees.length === 0) {
        return featureNames.map(name => ({ name, importance: 0 }));
      }
      
      // Her özellik için önem değerlerini topla
      const featureCount = featureNames.length;
      const importanceScores = new Array(featureCount).fill(0);
      
      // Her ağaçtaki düğüm sayılarını ve kullanılan özellikleri analiz et
      model.trees.forEach(tree => {
        // Ağaç üzerinde dolaşma fonksiyonu
        const traverseTree = (node, depth = 0) => {
          // Eğer yaprak düğümü değilse
          if (node.splitValue !== undefined) {
            // Karar düğümünde kullanılan özelliğin önemi, derinliğin tersi ile orantılı
            const importance = 1.0 / (depth + 1);
            importanceScores[node.splitFeature] += importance;
            
            // Alt düğümlere devam et
            if (node.left) traverseTree(node.left, depth + 1);
            if (node.right) traverseTree(node.right, depth + 1);
          }
        };
        
        // Ağacın kök düğümünden başla
        if (tree && tree.root) {
          traverseTree(tree.root);
        }
      });
      
      // Önem skorlarını normalize et (toplam 1 olacak şekilde)
      const totalImportance = importanceScores.reduce((sum, score) => sum + score, 0);
      const normalizedScores = totalImportance > 0 ? 
        importanceScores.map(score => score / totalImportance) : 
        importanceScores;
      
      // Skorları isimlerle eşleştir ve önem sırasına göre sırala
      const featureImportance = featureNames
        .map((name, index) => ({ name, importance: normalizedScores[index] }))
        .sort((a, b) => b.importance - a.importance);
      
      return featureImportance;
    } catch (error) {
      console.error('Özellik önem hesaplama hatası:', error);
      return featureNames.map(name => ({ name, importance: 0 }));
    }
  }
  
  /**
   * Eğitim için veri hazırlama
   * @param {Array} products - Ürünler
   * @param {string} categoryName - Kategori adı
   * @returns {Object} Hazırlanmış özellikler ve etiketler
   */
  prepareTrainingData(products, categoryName) {
    const featuresArray = [];
    const labels = [];
    const featureNames = []; // Özellik adları
    
    // Özellik kodlayıcı
    const featureEncoder = {
      conditions: {}, // Durum değerlerini kodlamak için
      brands: {},     // Marka değerlerini kodlamak için
      materials: {},  // Malzeme değerlerini kodlamak için
      attributeKeys: [],  // Özellik anahtarları
      categorySpecific: {} // Kategori özel kodlayıcılar
    };
    
    // Önce tüm verileri analiz et ve kodlayıcıları oluştur
    this.analyzeAndPrepareEncoders(products, featureEncoder, categoryName);
    
    // Şimdi her ürün için özellik vektörleri oluştur
    for (const product of products) {
      try {
        const { features, featureNames: names } = this.extractFeatures(product, featureEncoder, categoryName);
        
        if (features && features.length > 0 && product.price > 0) {
          featuresArray.push(features);
          labels.push(product.price);
          
          // İlk ürünün özellik adlarını kullan
          if (featureNames.length === 0 && names && names.length > 0) {
            featureNames.push(...names);
          }
        }
      } catch (error) {
        console.error('Ürün için özellik çıkarma hatası:', error);
      }
    }
    
    return { features: featuresArray, labels, featureEncoder, featureNames };
  }
  
  /**
   * Tüm verileri analiz et ve özellik kodlayıcıları oluştur
   */
  analyzeAndPrepareEncoders(products, featureEncoder, categoryName) {
    // Durum değerlerini topla
    const conditions = new Set();
    products.forEach(p => {
      if (p.condition) conditions.add(p.condition);
    });
    
    // Durum değerlerini kodla
    [...conditions].forEach((condition, index) => {
      featureEncoder.conditions[condition] = index + 1; // 1'den başla
    });
    
    // Özellik anahtarlarını ve değerlerini topla
    const brands = new Set();
    const materials = new Set();
    const attributeKeys = new Set();
    
    products.forEach(p => {
      if (p.attributes) {
        // Marka
        if (p.attributes.brand) brands.add(p.attributes.brand.toLowerCase());
        
        // Malzeme
        if (p.attributes.material) materials.add(p.attributes.material.toLowerCase());
        
        // Tüm özellik anahtarlarını topla
        Object.keys(p.attributes).forEach(key => attributeKeys.add(key));
      }
    });
    
    // Markaları kodla
    [...brands].sort().forEach((brand, index) => {
      featureEncoder.brands[brand] = index + 1; // 1'den başla
    });
    
    // Malzemeleri kodla
    [...materials].sort().forEach((material, index) => {
      featureEncoder.materials[material] = index + 1; // 1'den başla
    });
    
    // Özellik anahtarlarını kaydet
    featureEncoder.attributeKeys = [...attributeKeys];
    
    // Kategori bazlı özel kodlayıcılar
    const lowCategoryName = categoryName.toLowerCase();
    
    // Telefon/Elektronik kategorisi için
    if (lowCategoryName.includes('telefon') || lowCategoryName.includes('phone') || 
        lowCategoryName.includes('elektronik') || lowCategoryName.includes('electronic')) {
      // Depolama ve RAM değerlerini topla
      const storageValues = new Set();
      const ramValues = new Set();
      
      products.forEach(p => {
        if (p.attributes) {
          if (p.attributes.storage) {
            const storage = parseInt(p.attributes.storage);
            if (!isNaN(storage)) storageValues.add(storage);
          }
          if (p.attributes.ram) {
            const ram = parseInt(p.attributes.ram);
            if (!isNaN(ram)) ramValues.add(ram);
          }
        }
      });
      
      featureEncoder.categorySpecific.storageValues = [...storageValues].sort((a, b) => a - b);
      featureEncoder.categorySpecific.ramValues = [...ramValues].sort((a, b) => a - b);
    }
    
    // Giyim kategorileri için özel kodlayıcılar
    if (lowCategoryName.includes('giyim') || lowCategoryName.includes('clothing') || 
        lowCategoryName.includes('ayakkabı') || lowCategoryName.includes('shoe')) {
      // Beden ve sezon değerlerini topla
      const sizeValues = new Set();
      const seasonValues = new Set();
      const fabricValues = new Set();
      
      products.forEach(p => {
        if (p.attributes) {
          if (p.attributes.size) sizeValues.add(p.attributes.size.toLowerCase());
          if (p.attributes.season) seasonValues.add(p.attributes.season.toLowerCase());
          if (p.attributes.fabric || p.attributes.fabric_type) {
            const fabric = p.attributes.fabric || p.attributes.fabric_type;
            fabricValues.add(fabric.toLowerCase());
          }
        }
      });
      
      featureEncoder.categorySpecific.sizeValues = [...sizeValues];
      featureEncoder.categorySpecific.seasonValues = [...seasonValues];
      featureEncoder.categorySpecific.fabricValues = [...fabricValues];
    }
    
    // Araç kategorileri için özel kodlayıcılar
    if (lowCategoryName.includes('araç') || lowCategoryName.includes('otomobil') || 
        lowCategoryName.includes('car') || lowCategoryName.includes('vehicle')) {
      // Yıl ve yakıt tipi değerlerini topla
      const yearValues = new Set();
      const fuelTypes = new Set();
      const transmissionTypes = new Set();
      
      products.forEach(p => {
        if (p.attributes) {
          if (p.attributes.year) {
            const year = parseInt(p.attributes.year);
            if (!isNaN(year)) yearValues.add(year);
          }
          if (p.attributes.fuelType || p.attributes.fuel_type || p.attributes.fuel) {
            const fuel = p.attributes.fuelType || p.attributes.fuel_type || p.attributes.fuel;
            fuelTypes.add(fuel.toLowerCase());
          }
          if (p.attributes.transmission) {
            transmissionTypes.add(p.attributes.transmission.toLowerCase());
          }
        }
      });
      
      featureEncoder.categorySpecific.yearValues = [...yearValues].sort((a, b) => a - b);
      featureEncoder.categorySpecific.mileageRanges = [0, 10000, 50000, 100000, 200000];
      featureEncoder.categorySpecific.fuelTypes = [...fuelTypes];
      featureEncoder.categorySpecific.transmissionTypes = [...transmissionTypes];
    }
  }
  
  /**
   * Bir ürün için özellik vektörü çıkarma
   */
  extractFeatures(product, featureEncoder, categoryName) {
    const features = [];
    const featureNames = []; // Özellik isimleri - önem analizi için
    
    // 1. Durum (condition) özelliği - durum özelliğinin etkisini artır
    let conditionValue = 0;
    if (product.condition) {
      switch(product.condition) {
        case 'new': 
          conditionValue = 1.0; // Yeni ürün en yüksek değer
          break;
        case 'like_new':
          conditionValue = 0.9; // Yeni gibi
          break;
        case 'very_good':
          conditionValue = 0.75; // Çok iyi
          break;
        case 'good':
          conditionValue = 0.6; // İyi
          break;
        case 'acceptable':
          conditionValue = 0.4; // Kabul edilebilir
          break;
        default:
          conditionValue = product.condition ? 
            featureEncoder.conditions[product.condition] || 0 : 0;
      }
    }
    features.push(conditionValue);
    featureNames.push('condition');
    
    // 2. Marka (brand) özelliği
    const brandValue = product.attributes && product.attributes.brand ? 
      featureEncoder.brands[product.attributes.brand.toLowerCase()] || 0 : 0;
    features.push(brandValue);
    featureNames.push('brand');
    
    // 3. Malzeme (material) özelliği
    const materialValue = product.attributes && product.attributes.material ? 
      featureEncoder.materials[product.attributes.material.toLowerCase()] || 0 : 0;
    features.push(materialValue);
    featureNames.push('material');
    
    // 4. Başlık uzunluğu (title length) - iyi açıklanan ürünler genelde daha değerli
    const titleLength = product.title ? product.title.length / 100 : 0; // 0-1 arası normalize
    features.push(titleLength);
    featureNames.push('title_length');
    
    // 5. Açıklama uzunluğu (description length)
    const descLength = product.description ? product.description.length / 1000 : 0; // 0-1 arası normalize
    features.push(descLength);
    featureNames.push('description_length');
    
    // 6. Resim sayısı (image count) - daha fazla resim daha fazla bilgi
    const imageCount = product.images ? Math.min(product.images.length / 5, 1) : 0; // 0-1 arası normalize (max 5 resim)
    features.push(imageCount);
    featureNames.push('image_count');
    
    // Kategori özel özellikler
    const lowCategoryName = categoryName.toLowerCase();
    
    // Yeni kategori özel özellikler
    if (product.attributes) {
      // Orijinallik
      if (product.attributes.is_original !== undefined) {
        const isOriginalValue = this.normalizeFeatureValue('is_original', product.attributes.is_original, categoryName);
        features.push(isOriginalValue);
        featureNames.push('is_original');
      }
      
      // Garanti
      if (product.attributes.has_warranty !== undefined) {
        const hasWarrantyValue = this.normalizeFeatureValue('has_warranty', product.attributes.has_warranty, categoryName);
        features.push(hasWarrantyValue);
        featureNames.push('has_warranty');
      }
      
      // Hijyen/Temizlik durumu
      if (product.attributes.hygiene_status !== undefined) {
        const hygieneValue = this.normalizeFeatureValue('hygiene_status', product.attributes.hygiene_status, categoryName);
        features.push(hygieneValue);
        featureNames.push('hygiene_status');
      }
      
      // Temizlik durumu
      if (product.attributes.cleanliness !== undefined) {
        const cleanlinessValue = this.normalizeFeatureValue('cleanliness', product.attributes.cleanliness, categoryName);
        features.push(cleanlinessValue);
        featureNames.push('cleanliness');
      }
      
      // El yapımı
      if (product.attributes.is_handmade !== undefined) {
        const isHandmadeValue = this.normalizeFeatureValue('is_handmade', product.attributes.is_handmade, categoryName);
        features.push(isHandmadeValue);
        featureNames.push('is_handmade');
      }
      
      // Kumaş türü
      if (product.attributes.fabric_type !== undefined) {
        const fabricTypeValue = this.normalizeFeatureValue('fabric_type', product.attributes.fabric_type, categoryName);
        features.push(fabricTypeValue);
        featureNames.push('fabric_type');
      }
      
      // İmza/Nadirlik
      if (product.attributes.has_signature !== undefined) {
        const hasSignatureValue = this.normalizeFeatureValue('has_signature', product.attributes.has_signature, categoryName);
        features.push(hasSignatureValue);
        featureNames.push('has_signature');
      }
      
      // Kullanım süresi
      if (product.attributes.usage_duration !== undefined) {
        const usageDurationValue = this.normalizeFeatureValue('usage_duration', product.attributes.usage_duration, categoryName);
        features.push(usageDurationValue);
        featureNames.push('usage_duration');
      }
      
      // Parça sayısı
      if (product.attributes.piece_count !== undefined) {
        const pieceCountValue = this.normalizeFeatureValue('piece_count', product.attributes.piece_count, categoryName);
        features.push(pieceCountValue);
        featureNames.push('piece_count');
      }
      
      // Kanal sayısı
      if (product.attributes.channel_count !== undefined) {
        const channelCountValue = this.normalizeFeatureValue('channel_count', product.attributes.channel_count, categoryName);
        features.push(channelCountValue);
        featureNames.push('channel_count');
      }
      
      // Batarya sağlığı
      if (product.attributes.battery_health !== undefined) {
        const batteryHealthValue = this.normalizeFeatureValue('battery_health', product.attributes.battery_health, categoryName);
        features.push(batteryHealthValue);
        featureNames.push('battery_health');
      }
      
      // Smart TV özelliği
      if (product.attributes.is_smart !== undefined) {
        const isSmartValue = this.normalizeFeatureValue('is_smart', product.attributes.is_smart, categoryName);
        features.push(isSmartValue);
        featureNames.push('is_smart');
      }
      
      // Kumanda
      if (product.attributes.has_remote !== undefined) {
        const hasRemoteValue = this.normalizeFeatureValue('has_remote', product.attributes.has_remote, categoryName);
        features.push(hasRemoteValue);
        featureNames.push('has_remote');
      }
      
      // Basım/Model yılı
      if (product.attributes.year !== undefined) {
        const yearValue = this.normalizeFeatureValue('year', product.attributes.year, categoryName);
        features.push(yearValue);
        featureNames.push('year');
      }
    }
    
    // Telefon/Elektronik kategorisi için
    if (lowCategoryName.includes('telefon') || lowCategoryName.includes('phone') || 
        lowCategoryName.includes('elektronik') || lowCategoryName.includes('electronic')) {
      
      // Depolama - Depolama arttıkça fiyat artar
      let storageValue = 0;
      if (product.attributes && product.attributes.storage) {
        storageValue = this.normalizeFeatureValue('storage', product.attributes.storage, categoryName);
      }
      features.push(storageValue);
      featureNames.push('storage');
      
      // RAM - RAM arttıkça fiyat artar
      let ramValue = 0;
      if (product.attributes && product.attributes.ram) {
        ramValue = this.normalizeFeatureValue('ram', product.attributes.ram, categoryName);
      }
      features.push(ramValue);
      featureNames.push('ram');
      
      // İşlemci nesli (processor_gen)
      let processorGenValue = 0;
      if (product.attributes && product.attributes.processor) {
        const proc = product.attributes.processor.toLowerCase();
        // Nesil numarasını bul (i7-9700K -> 9, Ryzen 5 3600 -> 3)
        const genMatch = proc.match(/(?:i\d-|ryzen\s+\d\s+)(\d+)/) || proc.match(/(\d+)(?:th|nd|rd|st)/);
        if (genMatch && genMatch[1]) {
          const gen = parseInt(genMatch[1]);
          if (!isNaN(gen)) {
            processorGenValue = Math.min(Math.pow(gen / 10, 1.5), 1); // Üstel artış (daha yeni işlemciler daha değerli)
          }
        }
      }
      features.push(processorGenValue);
      featureNames.push('processor_gen');
      
      // Ekran boyutu (screen_size)
      let screenSizeValue = 0;
      if (product.attributes && product.attributes.screenSize) {
        screenSizeValue = this.normalizeFeatureValue('screen_size', product.attributes.screenSize, categoryName);
      }
      features.push(screenSizeValue);
      featureNames.push('screen_size');
    }
    
    // Giyim kategorisi için
    if (lowCategoryName.includes('giyim') || lowCategoryName.includes('clothing') || 
        lowCategoryName.includes('ayakkabı') || lowCategoryName.includes('shoe')) {
      
      // Beden (size) - Orta bedenler daha değerli
      let sizeValue = 0;
      if (product.attributes && product.attributes.size) {
        sizeValue = this.normalizeFeatureValue('size', product.attributes.size, categoryName);
      }
      features.push(sizeValue);
      featureNames.push('size');
      
      // Sezon (season)
      let seasonValue = 0;
      if (product.attributes && product.attributes.season) {
        const season = product.attributes.season.toLowerCase();
        if (season.includes('yaz')) seasonValue = 0.25;
        else if (season.includes('bahar') || season.includes('sonbahar')) seasonValue = 0.5;
        else if (season.includes('kış')) seasonValue = 0.75;
        else if (season.includes('mevsim')) seasonValue = 1.0;
      }
      features.push(seasonValue);
      featureNames.push('season');
      
      // Cinsiyet (gender)
      let genderValue = 0;
      if (lowCategoryName.includes('erkek')) genderValue = 0.33;
      else if (lowCategoryName.includes('kadın')) genderValue = 0.66;
      else if (lowCategoryName.includes('çocuk') || lowCategoryName.includes('bebek')) genderValue = 1.0;
      features.push(genderValue);
      featureNames.push('gender');
    }
    
    // Araç kategorisi için
    if (lowCategoryName.includes('araç') || lowCategoryName.includes('otomobil') || 
        lowCategoryName.includes('car') || lowCategoryName.includes('vehicle')) {
      
      // Yıl (year) - Daha yeni araçlar daha değerli
      let yearValue = 0;
      if (product.attributes && product.attributes.year) {
        yearValue = this.normalizeFeatureValue('year', product.attributes.year, categoryName);
      }
      features.push(yearValue);
      featureNames.push('year');
      
      // Kilometre - Daha az km daha değerli
      let mileageValue = 0;
      if (product.attributes && product.attributes.mileage) {
        const mileage = parseInt(product.attributes.mileage);
        if (!isNaN(mileage)) {
          // Kilometreyi normalize et - Ters logaritmik skala kullan
          // 0 km: 1.0, 50k km: ~0.7, 100k km: ~0.5, 200k km: ~0.3
          mileageValue = Math.max(0, 1 - Math.log10(1 + mileage / 10000) / 3);
        }
      }
      features.push(mileageValue);
      featureNames.push('mileage');
      
      // Yakıt tipi (fuel_type)
      let fuelTypeValue = 0;
      if (product.attributes && product.attributes.fuelType) {
        const fuel = product.attributes.fuelType.toLowerCase();
        if (fuel.includes('elektrik')) fuelTypeValue = 1.0; // Elektrikli en değerli
        else if (fuel.includes('hibrit')) fuelTypeValue = 0.85; // Hibrit ikinci
        else if (fuel.includes('benzin')) fuelTypeValue = 0.6; // Benzinli üçüncü
        else if (fuel.includes('dizel')) fuelTypeValue = 0.5; // Dizel dördüncü
        else if (fuel.includes('lpg')) fuelTypeValue = 0.4; // LPG beşinci
      }
      features.push(fuelTypeValue);
      featureNames.push('fuel_type');
      
      // Vites tipi (transmission)
      let transmissionValue = 0;
      if (product.attributes && product.attributes.transmission) {
        const transmission = product.attributes.transmission.toLowerCase();
        if (transmission.includes('otomatik')) transmissionValue = 0.9; // Otomatik daha değerli
        else if (transmission.includes('yarı')) transmissionValue = 0.7; // Yarı otomatik orta
        else if (transmission.includes('manuel')) transmissionValue = 0.5; // Manuel en düşük
      }
      features.push(transmissionValue);
      featureNames.push('transmission');
    }
    
    // Bilgisayar/Dizüstü kategorisi için
    if (lowCategoryName.includes('bilgisayar') || lowCategoryName.includes('computer') || 
        lowCategoryName.includes('laptop') || lowCategoryName.includes('notebook')) {
      
      // Ekran kartı (GPU)
      let gpuValue = 0;
      if (product.attributes && product.attributes.gpu) {
        const gpu = product.attributes.gpu.toString().toLowerCase();
        
        // Ekran kartı serisini tanımla
        if (gpu.includes('rtx 30') || gpu.includes('rtx 40')) {
          gpuValue = 1.0; // En yeni nesil
        } else if (gpu.includes('rtx 20') || gpu.includes('radeon rx 6')) {
          gpuValue = 0.8; // Yeni nesil
        } else if (gpu.includes('gtx 16') || gpu.includes('gtx 1070') || gpu.includes('gtx 1080')) {
          gpuValue = 0.6; // Orta-üst
        } else if (gpu.includes('gtx 10') || gpu.includes('radeon rx 5')) {
          gpuValue = 0.4; // Orta
        } else if (gpu.includes('mx') || gpu.includes('intel') || gpu.includes('amd')) {
          gpuValue = 0.2; // Düşük
        }
      }
      features.push(gpuValue);
      featureNames.push('gpu');
      
      // SSD var mı?
      let ssdValue = 0;
      if (product.attributes) {
        if (product.attributes.storage_type && 
            product.attributes.storage_type.toString().toLowerCase().includes('ssd')) {
          ssdValue = 1.0;
        } else if (product.attributes.storage && 
                  product.attributes.storage.toString().toLowerCase().includes('ssd')) {
          ssdValue = 1.0;
        } else if (product.title && product.title.toLowerCase().includes('ssd')) {
          ssdValue = 0.8;
        }
      }
      features.push(ssdValue);
      featureNames.push('has_ssd');
      
      // İşletim sistemi
      let osValue = 0;
      if (product.attributes && product.attributes.os) {
        const os = product.attributes.os.toString().toLowerCase();
        if (os.includes('mac') || os.includes('macos')) {
          osValue = 1.0; // MacOS en değerli
        } else if (os.includes('windows 11')) {
          osValue = 0.9; // Windows 11
        } else if (os.includes('windows 10')) {
          osValue = 0.7; // Windows 10
        } else if (os.includes('windows')) {
          osValue = 0.5; // Diğer Windows
        } else if (os.includes('linux') || os.includes('ubuntu')) {
          osValue = 0.4; // Linux
        } else if (os.includes('chrome')) {
          osValue = 0.3; // ChromeOS
        }
      }
      features.push(osValue);
      featureNames.push('os');
    }
    
    // Mobilya kategorisi için
    if (lowCategoryName.includes('mobilya') || lowCategoryName.includes('furniture')) {
      // Malzeme kalitesi
      let materialQualityValue = 0;
      if (product.attributes && product.attributes.material) {
        const material = product.attributes.material.toString().toLowerCase();
        if (material.includes('masif') || material.includes('ahşap') || material.includes('meşe') || 
            material.includes('ceviz') || material.includes('solid')) {
          materialQualityValue = 1.0; // Masif ahşap en değerli
        } else if (material.includes('mdf') && material.includes('kaplama')) {
          materialQualityValue = 0.8; // Kaplamalı MDF
        } else if (material.includes('mdf') || material.includes('sunta') && material.includes('lake')) {
          materialQualityValue = 0.6; // Lake MDF/Sunta
        } else if (material.includes('mdf') || material.includes('sunta')) {
          materialQualityValue = 0.4; // Sade MDF/Sunta
        } else if (material.includes('plastik') || material.includes('plastic')) {
          materialQualityValue = 0.2; // Plastik en düşük
        }
      }
      features.push(materialQualityValue);
      featureNames.push('material_quality');
    }
    
    // Özellik vektörünü ve adlarını sakla
    return { features, featureNames };
  }

  /**
   * Kategori bazlı özellik gereksinimleri
   */
  async getRequiredAttributesForCategory(categoryId) {
    try {
      console.log(`Getting attributes for category: ${categoryId}`);
      
      // Kategori bilgisini getir
      let category = null;
      
      if (categoryId) {
        try {
          category = await Category.findById(categoryId);
          console.log("Kategori bilgisi bulundu:", category ? category.name : 'null');
        } catch (err) {
          console.error("Kategori arama hatası:", err);
        }
      }
      
      if (!category) {
        console.log("Kategori bulunamadı, varsayılan özellikler kullanılacak");
        return this.getDefaultAttributesForUnknownCategory();
      }
      
      // Kategori adına göre gerekli özellikleri belirle
      const lowCategoryName = category.name.toLowerCase();
      let categorySpecificAttributes = [];
      
      // Aksesuarlar
      if (lowCategoryName.includes('aksesuar')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Ayakkabılar
      else if (lowCategoryName.includes('ayakkabı')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Bebek ve Çocuk
      else if (lowCategoryName.includes('bebek') || lowCategoryName.includes('çocuk')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Dekorasyon
      else if (lowCategoryName.includes('dekorasyon')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Kitap, Film, Müzik
      else if (lowCategoryName.includes('kitap') || lowCategoryName.includes('film') || lowCategoryName.includes('müzik')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Mobilya
      else if (lowCategoryName.includes('mobilya')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Mutfak Eşyaları
      else if (lowCategoryName.includes('mutfak')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Erkek Giyim
      else if (lowCategoryName.includes('erkek') && lowCategoryName.includes('giyim')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Kadın Giyim
      else if (lowCategoryName.includes('kadın') && lowCategoryName.includes('giyim')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Ses Sistemleri
      else if (lowCategoryName.includes('ses') || lowCategoryName.includes('audio')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Spor ve Outdoor
      else if (lowCategoryName.includes('spor') || lowCategoryName.includes('outdoor')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Televizyonlar
      else if (lowCategoryName.includes('televizyon') || lowCategoryName.includes('tv')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Yatak ve Banyo
      else if (lowCategoryName.includes('yatak') || lowCategoryName.includes('banyo')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Çocuk Giyim
      else if (lowCategoryName.includes('çocuk') && lowCategoryName.includes('giyim')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Telefonlar
      else if (lowCategoryName.includes('telefon') || lowCategoryName.includes('phone')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Bilgisayarlar
      else if (lowCategoryName.includes('bilgisayar') || lowCategoryName.includes('computer') || lowCategoryName.includes('laptop')) {
        categorySpecificAttributes = [
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
        ];
      }
      
      // Eğer kategori bulunamadıysa varsayılan özellikleri döndür
      if (categorySpecificAttributes.length === 0) {
        return this.getDefaultAttributesForUnknownCategory();
      }
      
      return categorySpecificAttributes;
    } catch (err) {
      console.error('getRequiredAttributesForCategory error:', err);
      return this.getDefaultAttributesForUnknownCategory();
    }
  }
  
  /**
   * Bilinmeyen kategoriler için varsayılan özellikler
   */
  getDefaultAttributesForUnknownCategory() {
    return [
      {
        name: 'fabric_type',
        label: 'Kumaş Türü',
        type: 'select',
        options: [
          { label: "Pamuk", value: "pamuk", impact: 0.2 },
          { label: "Polyester", value: "polyester", impact: -0.1 },
          { label: "Yün", value: "yün", impact: 0.3 },
          { label: "Denim", value: "denim", impact: 0.15 },
          { label: "Keten", value: "keten", impact: 0.25 },
          { label: "Diğer", value: "diğer", impact: 0 }
        ],
        required: false
      },
      {
        name: 'age',
        label: 'Ürün Yaşı',
        type: 'select',
        options: ['1 aydan az', '1-6 ay', '6-12 ay', '1-2 yıl', '2-5 yıl', '5+ yıl'],
        required: false
      }
    ];
  }

  /**
   * Özellik değerini normalize et
   * @param {string} featureType - Özellik tipi
   * @param {string|number} value - Özellik değeri
   * @param {string} categoryName - Kategori adı
   * @returns {number} - Normalize edilmiş değer (0-1 arası)
   */
  normalizeFeatureValue(featureType, value, categoryName) {
    if (value === undefined || value === null) return 0;
    
    // Boolean veya string boolean değerlerini işle
    if (value === true || value === 'true' || value === 'yes' || value === 'evet' || value === 'var') {
      return 1.0;
    } else if (value === false || value === 'false' || value === 'no' || value === 'hayır' || value === 'yok') {
      return 0.0;
    }
    
    // Özellik tipine göre değerleri normalize et
    switch(featureType.toLowerCase()) {
      case 'is_original':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'has_warranty':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'hygiene':
      case 'hygiene_status':
      case 'cleanliness':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue.includes('very_clean') || lowerValue.includes('çok temiz')) return 1.0;
          if (lowerValue.includes('clean') || lowerValue.includes('temiz')) return 0.8;
          if (lowerValue.includes('normal')) return 0.6;
          if (lowerValue.includes('fair') || lowerValue.includes('orta')) return 0.4;
          if (lowerValue.includes('poor') || lowerValue.includes('kötü')) return 0.2;
        }
        return 0.5; // varsayılan
        
      case 'is_handmade':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'fabric_type':
      case 'fabric':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue.includes('silk') || lowerValue.includes('ipek')) return 1.0;
          if (lowerValue.includes('leather') || lowerValue.includes('deri')) return 0.9;
          if (lowerValue.includes('wool') || lowerValue.includes('yün')) return 0.8;
          if (lowerValue.includes('linen') || lowerValue.includes('keten')) return 0.7;
          if (lowerValue.includes('cotton') || lowerValue.includes('pamuk')) return 0.6;
          if (lowerValue.includes('polyester')) return 0.3;
        }
        return 0.5;
        
      case 'is_rare':
      case 'has_signature':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'usage_duration':
        // Kullanım süresi daha az olan daha değerli (ters oran)
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const duration = Number(value);
          // Max 10 yıl olarak sınırla
          return Math.max(0, 1 - (duration / 10));
        }
        return 0.5;
        
      case 'pieces_count':
      case 'piece_count':
        // Parça sayısı daha fazla olan daha değerli
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const count = Number(value);
          // Max 20 parça olarak sınırla
          return Math.min(1, count / 20);
        }
        return 0.5;
        
      case 'channels':
      case 'channel_count':
        if (typeof value === 'string') {
          if (value === '7.1') return 1.0;
          if (value === '5.1') return 0.8;
          if (value === '2.1') return 0.5;
          if (value === '2.0') return 0.3;
        }
        return 0.5;
        
      case 'connection_type':
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue.includes('both') || lowerValue.includes('her ikisi')) return 1.0;
          if (lowerValue.includes('bluetooth')) return 0.7;
          if (lowerValue.includes('wired') || lowerValue.includes('kablolu')) return 0.4;
        }
        return 0.5;
        
      case 'battery_health':
        // Batarya sağlığı yüzdesi
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const health = Number(value);
          return Math.min(1, Math.max(0, health / 100));
        }
        return 0.5;
        
      case 'is_smart':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'has_remote':
        return value === true || value === 'true' ? 1.0 : 0.0;
        
      case 'screen_size':
        // Ekran boyutu - daha büyük daha değerli
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const size = Number(value);
          // 32" ile 85" arası normalize et
          return Math.min(1, Math.max(0, (size - 32) / (85 - 32)));
        }
        return 0.5;
        
      case 'storage':
        // Depolama kapasitesi - logaritmik ölçek
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const storage = Number(value);
          // 32GB ile 1024GB arası normalize et
          if (storage <= 0) return 0;
          const logScale = Math.log(storage) / Math.log(1024); // log_1024(storage)
          return Math.min(1, Math.max(0, logScale));
        }
        return 0.5;
        
      case 'ram':
        // RAM kapasitesi - logaritmik ölçek
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const ram = Number(value);
          // 2GB ile 64GB arası normalize et
          if (ram <= 0) return 0;
          const logScale = Math.log(ram) / Math.log(64); // log_64(ram)
          return Math.min(1, Math.max(0, logScale));
        }
        return 0.5;
        
      case 'year':
      case 'release_year':
        // Yıl - daha yeni daha değerli (son 30 yıl için)
        if (typeof value === 'number' || !isNaN(Number(value))) {
          const year = Number(value);
          const currentYear = new Date().getFullYear();
          // Son 30 yıl içinde normalize et
          return Math.min(1, Math.max(0, (year - (currentYear - 30)) / 30));
        }
        return 0.5;
        
      case 'size':
        // Beden - kategoriye göre farklı değerlendirme
        if (typeof value === 'string') {
          const lowerCategoryName = categoryName.toLowerCase();
          
          // Giyim için
          if (lowerCategoryName.includes('giyim') || lowerCategoryName.includes('clothing')) {
            const lowerValue = value.toLowerCase();
            // Orta bedenler daha popüler olabilir
            if (lowerValue === 'm') return 1.0;
            if (lowerValue === 'l' || lowerValue === 's') return 0.9;
            if (lowerValue === 'xl' || lowerValue === 'xs') return 0.7;
            if (lowerValue === 'xxl' || lowerValue === 'xxxl') return 0.5;
            
            // Numerik bedenler
            if (!isNaN(Number(lowerValue))) {
              const size = Number(lowerValue);
              // Kadın giyim için 36-42 arası daha değerli
              if (lowerCategoryName.includes('kadın')) {
                if (size >= 36 && size <= 42) return 0.8 + (1 - Math.abs(39 - size) / 6) * 0.2; // 39 = orta nokta
              } 
              // Erkek giyim için 48-54 arası daha değerli
              else if (lowerCategoryName.includes('erkek')) {
                if (size >= 48 && size <= 54) return 0.8 + (1 - Math.abs(51 - size) / 6) * 0.2; // 51 = orta nokta
              }
            }
          }
          
          // TV/Monitor için
          if (lowerCategoryName.includes('tv') || lowerCategoryName.includes('monitor') || lowerCategoryName.includes('televizyon')) {
            if (!isNaN(Number(value))) {
              const size = Number(value);
              // 32" - 85" arası normalize et
              return Math.min(1, Math.max(0, (size - 32) / (85 - 32)));
            }
          }
        }
        return 0.5;
      
      case 'product_type':
        // Ürün tipine göre özel değerlendirme
        if (typeof value === 'string') {
          const lowerCategoryName = categoryName.toLowerCase();
          const lowerValue = value.toLowerCase();
          
          // Dekorasyon için
          if (lowerCategoryName.includes('dekorasyon')) {
            if (lowerValue === 'sculpture' || lowerValue === 'heykel') return 1.0;
            if (lowerValue === 'painting' || lowerValue === 'tablo') return 0.8;
            if (lowerValue === 'vase' || lowerValue === 'vazo') return 0.6;
          }
          
          // Spor için
          if (lowerCategoryName.includes('spor')) {
            if (lowerValue === 'treadmill' || lowerValue === 'koşu bandı') return 1.0;
            if (lowerValue === 'bicycle' || lowerValue === 'bisiklet') return 0.9;
            if (lowerValue === 'fitness_equipment' || lowerValue === 'kondisyon aleti') return 0.8;
            if (lowerValue === 'tent' || lowerValue === 'çadır') return 0.6;
          }
        }
        return 0.5;
        
      default:
        // Diğer özellik tipleri için varsayılan 0.5 döndür
        return 0.5;
    }
  }
  
  /**
   * Özellik değerini impact değeriyle birlikte işle
   * @param {Object} attribute - Özellik objesi (frontend formatında)
   * @param {string|number|boolean} value - Özellik değeri
   * @returns {Object} - İşlenmiş değer ve etki
   */
  processAttributeWithImpact(attribute, value) {
    if (!attribute || value === undefined || value === null) {
      return { value: 0, impact: 0 };
    }
    
    let impact = 0;
    
    // Select tipindeki özellikler için
    if (attribute.type === 'select' && attribute.options) {
      // Seçenek ve etki değerini bul
      const option = attribute.options.find(opt => opt.value === value || opt.label === value);
      if (option && option.impact !== undefined) {
        impact = option.impact;
      }
    } 
    // Sayısal tipindeki özellikler için
    else if (attribute.type === 'number' && attribute.impact !== undefined) {
      const numValue = Number(value);
      
      // Min-max aralığında normalize et
      if (!isNaN(numValue) && attribute.min !== undefined && attribute.max !== undefined) {
        const normalizedValue = (numValue - attribute.min) / (attribute.max - attribute.min);
        // Etki değerine göre hesapla
        impact = normalizedValue * attribute.impact;
      } else {
        // Min-max yoksa doğrudan çarp
        impact = numValue * (attribute.impact / 100); // Yüzde olarak hesapla
      }
    }
    
    return { 
      value: this.normalizeFeatureValue(attribute.name, value, 'unknown'),
      impact 
    };
  }
  
  /**
   * Ürün fiyatını tahmin et
   * @param {Object} data - Tahmin için ürün verileri
   * @returns {Object} - Tahmin sonuçları
   */
  async predictPrice(data) {
    try {
      const { category, categoryName, condition, attributes, title, description } = data;
      
      console.log('predictPrice çağrıldı:', { category, categoryName, condition, attributes });
      
      // 1. Önce benzer ürünleri bul (gerçek piyasa verileri)
      const similarProducts = await this.findSimilarProducts(category, attributes, title, condition);
      console.log(`Benzer ürün sayısı: ${similarProducts.length}`);
      
      // 2. Benzer ürünlerden temel fiyat hesapla
      let basePrice = await this.calculateBasePriceFromSimilarProducts(similarProducts, category, categoryName);
      console.log(`Temel fiyat: ${basePrice} TL`);
      
      // 3. Başlangıç değerleri
      let estimatedPrice = basePrice;
      let confidence = 50; // Başlangıç güven değeri
      let attributeImpacts = []; // Özellik etkilerini saklamak için
      let priceRange = { min: 0, max: 0 };
      
      // 4. Benzer ürün sayısına göre güven skorunu ayarla
      if (similarProducts.length > 0) {
        confidence += Math.min(30, similarProducts.length * 3); // Her benzer ürün için +3 güven
        console.log(`Benzer ürünlerden güven artışı: +${Math.min(30, similarProducts.length * 3)}`);
      }
      
      // 5. Ürün durumunun (condition) fiyata etkisini hesapla
      if (condition) {
        let conditionImpact = 0;
        let conditionLabel = '';
        
        switch(condition.toLowerCase()) {
          case 'new':
            conditionImpact = 0.25; // +25% fiyat artışı
            conditionLabel = 'Yeni';
            break;
          case 'like_new':
            conditionImpact = 0.15; // +15% fiyat artışı
            conditionLabel = 'Yeni Gibi';
            break;
          case 'very_good':
            conditionImpact = 0.05; // +5% fiyat artışı
            conditionLabel = 'Çok İyi';
            break;
          case 'good':
            conditionImpact = 0; // Referans nokta (değişiklik yok)
            conditionLabel = 'İyi';
            break;
          case 'acceptable':
            conditionImpact = -0.15; // -15% fiyat düşüşü
            conditionLabel = 'Kabul Edilebilir';
            break;
          case 'poor':
            conditionImpact = -0.30; // -30% fiyat düşüşü
            conditionLabel = 'Kötü';
            break;
          default:
            conditionImpact = 0;
            conditionLabel = condition;
        }
        
        if (conditionImpact !== 0) {
          const conditionPriceImpact = Math.round(conditionImpact * basePrice);
          estimatedPrice += conditionPriceImpact;
          
          // Durum etkisini listeye ekle
          attributeImpacts.push({
            name: 'condition',
            label: 'Ürün Durumu',
            value: conditionLabel,
            impact: conditionPriceImpact,
            impactPercent: Math.round(conditionImpact * 100)
          });
          
          console.log(`Ürün durumu etkisi: ${condition} (${conditionLabel}), etki: ${conditionImpact}, fiyat etkisi: ${conditionPriceImpact} TL`);
          console.log(`Durum etkisi sonrası fiyat: ${estimatedPrice} TL`);
        }
      }
      
      // 6. Kategori özel özellikleri kullanarak fiyatı ayarla
      if (attributes && Object.keys(attributes).length > 0) {
        console.log('Özellikler işleniyor:', attributes);
        
        // Kategori için gerekli özellikleri al
        const requiredAttributes = await this.getRequiredAttributesForCategory(category);
        console.log(`Kategori için ${requiredAttributes.length} özellik yapılandırması bulundu`);
        
        let totalImpact = 0;
        
        // Her özellik için etki hesapla
        for (const [key, value] of Object.entries(attributes)) {
          if (value === undefined || value === null || value === '') continue;
          
          console.log(`İşleniyor: ${key} = ${value}`);
          
          // Özelliği bul
          const attributeConfig = requiredAttributes.find(attr => attr.name === key);
          
          if (attributeConfig) {
            // Özellik değerini ve etkisini işle
            const { impact } = this.processAttributeWithImpact(attributeConfig, value);
            
            // Impact değeri bir yüzde olarak değerlendirilir (ör: 0.3 = %30 artış)
            if (impact !== 0) {
              const priceImpact = Math.round(impact * basePrice);
              totalImpact += priceImpact;
              
              // Etki listesine ekle
              attributeImpacts.push({
                name: key,
                label: attributeConfig.label || key,
                value: value,
                impact: priceImpact,
                impactPercent: Math.round(impact * 100)
              });
              
              console.log(`Özellik etki değeri: ${key} = ${value}, etki: ${impact}, fiyat etkisi: ${priceImpact} TL`);
            }
          } else {
            console.log(`Yapılandırma bulunamadı: ${key}`);
            
            // Yapılandırma bulunamasa bile basit etki hesapla
            let simpleImpact = 0;
            
            // Telefon kategorisi için özel durumlar
            if (categoryName && categoryName.toLowerCase().includes('telefon')) {
              if (key === 'storage') {
                const storageValue = parseInt(value);
                if (!isNaN(storageValue)) {
                  // 32GB = -30%, 64GB = -10%, 128GB = +10%, 256GB = +30%, 512GB = +50%
                  if (storageValue <= 32) simpleImpact = -0.3;
                  else if (storageValue <= 64) simpleImpact = -0.1;
                  else if (storageValue <= 128) simpleImpact = 0.1;
                  else if (storageValue <= 256) simpleImpact = 0.3;
                  else simpleImpact = 0.5;
                }
              } else if (key === 'ram') {
                const ramValue = parseInt(value);
                if (!isNaN(ramValue)) {
                  // 2GB = -40%, 4GB = -10%, 6GB = +10%, 8GB = +30%
                  if (ramValue <= 2) simpleImpact = -0.4;
                  else if (ramValue <= 4) simpleImpact = -0.1;
                  else if (ramValue <= 6) simpleImpact = 0.1;
                  else simpleImpact = 0.3;
                }
              } else if (key === 'battery_health') {
                const batteryValue = parseInt(value);
                if (!isNaN(batteryValue)) {
                  // Batarya sağlığı: 80% altı = -20%, 90% üstü = +10%
                  if (batteryValue < 80) simpleImpact = -0.2;
                  else if (batteryValue > 90) simpleImpact = 0.1;
                }
              } else if (key === 'has_warranty') {
                simpleImpact = (value === 'Var' || value === true) ? 0.2 : -0.1;
              }
            }
            
            if (simpleImpact !== 0) {
              const priceImpact = Math.round(simpleImpact * basePrice);
              totalImpact += priceImpact;
              
              attributeImpacts.push({
                name: key,
                label: key,
                value: value,
                impact: priceImpact,
                impactPercent: Math.round(simpleImpact * 100)
              });
              
              console.log(`Basit etki hesaplama: ${key} = ${value}, etki: ${simpleImpact}, fiyat etkisi: ${priceImpact} TL`);
            }
          }
        }
        
        // Toplam etki değerini fiyata yansıt
        if (totalImpact !== 0) {
          const oldPrice = estimatedPrice;
          estimatedPrice += totalImpact;
          
          console.log(`Özellik etkileri toplamı: ${totalImpact} TL, Eski fiyat: ${oldPrice} TL, Yeni fiyat: ${estimatedPrice} TL`);
        }
        
        // Güven skorunu güncelle - her özellik biraz daha güveni artırır
        confidence = Math.min(95, confidence + (attributeImpacts.length * 2));
      }
      
      // 7. ML modeli varsa ek tahmin yap
      if (this.models[category]) {
        try {
          console.log('ML modeli kullanılıyor...');
          
          // Tahminde bulunmak için ürün verilerini hazırla
          const productData = {
            title: title || '',
            description: description || '',
            category,
            condition: condition || 'good',
            attributes: attributes || {},
            images: []
          };
          
          // Ürün özelliklerini çıkar
          const { features, featureNames } = this.extractFeatures(
            productData, 
            this.featureEncoders[category], 
            categoryName || (await Category.findById(category))?.name || ''
          );
          
          // Fiyat tahmininde bulun
          const predictedPrice = this.models[category].predict([features])[0];
          const modelPrice = Math.max(10, Math.round(predictedPrice));
          
          console.log(`ML model tahmini: ${modelPrice} TL`);
          
          // Model tahminini mevcut tahminle birleştir (ağırlıklı ortalama)
          const modelWeight = similarProducts.length > 5 ? 0.2 : 0.4; // Benzer ürün çoksa model ağırlığı az
          const marketWeight = 1 - modelWeight;
          
          const combinedPrice = Math.round(estimatedPrice * marketWeight + modelPrice * modelWeight);
          console.log(`Birleştirilmiş fiyat: ${combinedPrice} TL (piyasa: %${Math.round(marketWeight*100)}, model: %${Math.round(modelWeight*100)})`);
          
          estimatedPrice = combinedPrice;
          confidence = Math.min(90, confidence + 5); // ML modeli varsa +5 güven
          
        } catch (error) {
          console.error('ML model tahmini hatası:', error);
        }
      }
      
      // 8. Fiyat aralığını belirle
      priceRange = {
        min: Math.max(10, Math.round(estimatedPrice * 0.8)),
        max: Math.round(estimatedPrice * 1.2)
      };
      
      // 9. Minimum fiyat kontrolü
      estimatedPrice = Math.max(10, Math.round(estimatedPrice));
      
      // 10. Analiz çıktısını oluştur
      const result = {
        estimatedPrice,
        confidence: Math.round(confidence),
        priceRange,
        analysis: {
          method: 'market-based-with-attributes-and-condition',
          sampleSize: this.models[category] ? this.getModelSize(category) : 0,
          similarProductsCount: similarProducts.length,
          features: attributeImpacts,
          averagePrice: Math.round(estimatedPrice * 0.95),
          medianPrice: Math.round(estimatedPrice * 1.05),
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          basePriceFromMarket: basePrice,
          totalAttributeImpact: attributeImpacts.reduce((sum, attr) => sum + attr.impact, 0)
        },
        similarProducts: similarProducts.slice(0, 5).map(p => ({
          title: p.title,
          price: p.price,
          condition: p.condition,
          similarity: Math.round((p.similarity || 0) * 100)
        }))
      };
      
      console.log('Fiyat tahmini sonucu:', {
        estimatedPrice: result.estimatedPrice,
        confidence: result.confidence,
        hasModel: !!this.models[category],
        similarProductsCount: similarProducts.length,
        basePrice,
        conditionImpact: attributeImpacts.find(attr => attr.name === 'condition')?.impact || 0,
        attributeImpactsCount: attributeImpacts.length,
        totalAttributeImpact: result.analysis.totalAttributeImpact
      });
      
      return result;
      
    } catch (error) {
      console.error('predictPrice hatası:', error);
      
      // Hata durumunda basit bir tahmin döndür
      return {
        estimatedPrice: 500,
        confidence: 30,
        priceRange: { min: 300, max: 700 },
        analysis: {
          method: 'fallback',
          sampleSize: 0,
          similarProductsCount: 0,
          features: [],
          averagePrice: 500,
          medianPrice: 500,
          minPrice: 300,
          maxPrice: 700,
          totalAttributeImpact: 0
        },
        similarProducts: [],
        error: error.message
      };
    }
  }
  
  /**
   * Model değerlendirme metrikleri hesapla
   * @param {Array} actual - Gerçek değerler
   * @param {Array} predicted - Tahmin edilen değerler
   * @returns {Object} - Metrikler
   */
  evaluateModel(actual, predicted) {
    // Mean Squared Error (MSE)
    const mse = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0) / actual.length;
    
    // Mean Absolute Error (MAE)
    const mae = actual.reduce((sum, y, i) => sum + Math.abs(y - predicted[i]), 0) / actual.length;
    
    // R-squared (determination coefficient)
    const mean = actual.reduce((sum, y) => sum + y, 0) / actual.length;
    const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);
    const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);
    
    return { mse, mae, r2 };
  }
  
  /**
   * Tüm modelleri zorla yeniden eğit
   * @returns {Object} - Eğitim sonuçları
   */
  async forceTrainAllModels() {
    if (this.modelTrainingInProgress) {
      return { 
        success: false, 
        message: 'Eğitim zaten devam ediyor' 
      };
    }
    
    this.modelTrainingInProgress = true;
    const results = [];
    
    try {
      // Tüm kategorileri al
      const categories = await Category.find().lean();
      
      // Her kategori için model eğit
      for (const category of categories) {
        try {
          await this.trainModelForCategory(category._id.toString(), category.name);
          results.push({
            category: category.name,
            success: true
          });
        } catch (error) {
          results.push({
            category: category.name,
            success: false,
            error: error.message
          });
        }
      }
      
      this.lastTrainingTime = Date.now();
      
      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('forceTrainAllModels hatası:', error);
      return {
        success: false,
        message: error.message,
        results
      };
    } finally {
      this.modelTrainingInProgress = false;
    }
  }
  
  /**
   * Model eğitim durumunu al
   * @returns {Object} - Eğitim durumu
   */
  getModelTrainingStatus() {
    return {
      inProgress: this.modelTrainingInProgress,
      lastTrainingTime: this.lastTrainingTime,
      modelCount: Object.keys(this.models).length,
      models: Object.keys(this.models).map(categoryId => ({
        categoryId,
        treeCount: this.getModelSize(categoryId)
      }))
    };
  }
  
  /**
   * Model boyutunu güvenli şekilde al
   * @param {string} categoryId - Kategori ID
   * @returns {number} - Model boyutu
   */
  getModelSize(categoryId) {
    if (!this.models[categoryId]) return 0;
    
    const model = this.models[categoryId];
    
    if (model.trees && Array.isArray(model.trees)) {
      return model.trees.length;
    } else if (model.nEstimators) {
      return model.nEstimators;
    } else {
      return 1; // Varsayılan değer
    }
  }
  
  /**
   * Kategori için özellik yapılandırmasını al (frontend ile uyumlu)
   * @param {string} categoryName - Kategori adı
   * @returns {Array} - Özellik yapılandırması
   */
  getCategoryAttributeConfig(categoryName) {
    const lowerCategoryName = categoryName.toLowerCase();
    
    // Telefon kategorisi
    if (lowerCategoryName.includes('telefon')) {
      return [
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
      ];
    }
    
    // Bilgisayar kategorisi
    if (lowerCategoryName.includes('bilgisayar')) {
      return [
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
      ];
    }
    
    // Giyim kategorileri
    if (lowerCategoryName.includes('giyim')) {
      return [
        {
          name: "size",
          label: "Beden",
          type: "select",
          options: [
            { label: "XS", value: "XS", impact: -0.1 },
            { label: "S", value: "S", impact: 0.1 },
            { label: "M", value: "M", impact: 0.15 },
            { label: "L", value: "L", impact: 0.1 },
            { label: "XL", value: "XL", impact: -0.05 },
            { label: "XXL", value: "XXL", impact: -0.1 }
          ],
          required: true
        },
        {
          name: "fabric",
          label: "Kumaş Türü",
          type: "select",
          options: [
            { label: "Pamuk", value: "Pamuk", impact: 0.2 },
            { label: "Polyester", value: "Polyester", impact: -0.1 },
            { label: "Keten", value: "Keten", impact: 0.25 },
            { label: "Yün", value: "Yün", impact: 0.3 },
            { label: "Deri", value: "Deri", impact: 0.4 },
            { label: "Diğer", value: "Diğer", impact: 0 }
          ],
          required: true
        },
        {
          name: "is_original",
          label: "Orijinallik",
          type: "select",
          options: [
            { label: "Orijinal", value: "Orijinal", impact: 0.4 },
            { label: "Orijinal Değil", value: "Orijinal Değil", impact: -0.3 }
          ],
          required: true
        }
      ];
    }
    
    // Varsayılan boş dizi döndür
    return [];
  }

  /**
   * Benzer ürünleri bul (gerçek piyasa verileri)
   * @param {string} categoryId - Kategori ID
   * @param {Object} attributes - Ürün özellikleri
   * @param {string} title - Ürün başlığı
   * @param {string} condition - Ürün durumu
   * @returns {Array} - Benzer ürünler
   */
  async findSimilarProducts(categoryId, attributes = {}, title = '', condition = '') {
    try {
      // Temel sorgu - aynı kategori
      let query = {
        category: categoryId,
        status: 'active',
        price: { $gt: 0 }
      };
      
      // Durum filtresi ekle
      if (condition) {
        query.condition = condition;
      }
      
      // Aynı kategorideki ürünleri al
      let similarProducts = await Product.find(query)
        .select('title description price condition attributes createdAt')
        .sort({ createdAt: -1 }) // En yeni ürünler önce
        .limit(50) // Performans için sınırla
        .lean();
      
      console.log(`Kategori ${categoryId} için ${similarProducts.length} ürün bulundu`);
      
      // Eğer yeterli ürün yoksa, durum filtresi olmadan tekrar dene
      if (similarProducts.length < 5 && condition) {
        delete query.condition;
        similarProducts = await Product.find(query)
          .select('title description price condition attributes createdAt')
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        
        console.log(`Durum filtresi kaldırıldıktan sonra ${similarProducts.length} ürün bulundu`);
      }
      
      // Benzerlik skorları hesapla
      const productsWithSimilarity = similarProducts.map(product => {
        let similarity = 0;
        
        // Başlık benzerliği (basit kelime eşleştirme)
        if (title && product.title) {
          const titleWords = title.toLowerCase().split(' ').filter(w => w.length > 2);
          const productTitleWords = product.title.toLowerCase().split(' ').filter(w => w.length > 2);
          
          const commonWords = titleWords.filter(word => 
            productTitleWords.some(pWord => pWord.includes(word) || word.includes(pWord))
          );
          
          if (titleWords.length > 0) {
            similarity += (commonWords.length / titleWords.length) * 0.3; // %30 ağırlık
          }
        }
        
        // Durum benzerliği
        if (condition && product.condition === condition) {
          similarity += 0.2; // %20 ağırlık
        }
        
        // Özellik benzerliği
        if (attributes && product.attributes) {
          let attributeMatches = 0;
          let totalAttributes = 0;
          
          // Ortak özellikleri kontrol et
          for (const [key, value] of Object.entries(attributes)) {
            if (value && product.attributes[key]) {
              totalAttributes++;
              if (product.attributes[key].toString().toLowerCase() === value.toString().toLowerCase()) {
                attributeMatches++;
              }
            }
          }
          
          if (totalAttributes > 0) {
            similarity += (attributeMatches / totalAttributes) * 0.5; // %50 ağırlık
          }
        }
        
        return {
          ...product,
          similarity: Math.round(similarity * 100) / 100 // 2 ondalık basamak
        };
      });
      
      // Benzerlik skoruna göre sırala
      const sortedProducts = productsWithSimilarity
        .filter(p => p.similarity > 0.1) // Minimum %10 benzerlik
        .sort((a, b) => b.similarity - a.similarity);
      
      console.log(`Benzerlik filtresinden sonra ${sortedProducts.length} ürün kaldı`);
      
      return sortedProducts.slice(0, 20); // En fazla 20 benzer ürün döndür
      
    } catch (error) {
      console.error('findSimilarProducts hatası:', error);
      return [];
    }
  }
  
  /**
   * Benzer ürünlerden temel fiyat hesapla
   * @param {Array} similarProducts - Benzer ürünler
   * @param {string} categoryId - Kategori ID
   * @param {string} categoryName - Kategori adı
   * @returns {number} - Temel fiyat
   */
  async calculateBasePriceFromSimilarProducts(similarProducts, categoryId, categoryName) {
    try {
      if (similarProducts.length === 0) {
        // Benzer ürün yoksa kategori bazlı varsayılan fiyat
        return this.getDefaultPriceForCategory(categoryName);
      }
      
      // Fiyat istatistikleri hesapla
      const prices = similarProducts.map(p => p.price).sort((a, b) => a - b);
      
      // Aykırı değerleri temizle (alt %10 ve üst %10'u çıkar)
      const trimmedPrices = prices.slice(
        Math.floor(prices.length * 0.1),
        Math.ceil(prices.length * 0.9)
      );
      
      if (trimmedPrices.length === 0) {
        return prices[Math.floor(prices.length / 2)]; // Medyan
      }
      
      // Ağırlıklı ortalama hesapla (benzerlik skoruna göre)
      let weightedSum = 0;
      let totalWeight = 0;
      
      similarProducts.forEach(product => {
        if (trimmedPrices.includes(product.price)) {
          const weight = Math.max(0.1, product.similarity || 0.5); // Minimum %10 ağırlık
          weightedSum += product.price * weight;
          totalWeight += weight;
        }
      });
      
      const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Medyan hesapla
      const median = trimmedPrices[Math.floor(trimmedPrices.length / 2)];
      
      // Ağırlıklı ortalama ve medyanın ortalamasını al
      const basePrice = Math.round((weightedAverage + median) / 2);
      
      console.log(`Benzer ürünlerden hesaplanan temel fiyat: ${basePrice} TL (${similarProducts.length} ürün, ağırlıklı ort: ${Math.round(weightedAverage)}, medyan: ${median})`);
      
      return Math.max(10, basePrice); // Minimum 10 TL
      
    } catch (error) {
      console.error('calculateBasePriceFromSimilarProducts hatası:', error);
      return this.getDefaultPriceForCategory(categoryName);
    }
  }
  
  /**
   * Kategori için varsayılan fiyat
   * @param {string} categoryName - Kategori adı
   * @returns {number} - Varsayılan fiyat
   */
  getDefaultPriceForCategory(categoryName) {
    if (!categoryName) return 500;
    
    const lowerCatName = categoryName.toLowerCase();
    
    if (lowerCatName.includes('telefon') || lowerCatName.includes('phone')) {
      return 3000;
    } else if (lowerCatName.includes('bilgisayar') || lowerCatName.includes('laptop')) {
      return 5000;
    } else if (lowerCatName.includes('araba') || lowerCatName.includes('car')) {
      return 100000;
    } else if (lowerCatName.includes('giyim') || lowerCatName.includes('clothing')) {
      return 200;
    } else if (lowerCatName.includes('kitap') || lowerCatName.includes('book')) {
      return 50;
    } else if (lowerCatName.includes('mobilya') || lowerCatName.includes('furniture')) {
      return 1000;
    } else if (lowerCatName.includes('televizyon') || lowerCatName.includes('tv')) {
      return 4000;
    } else if (lowerCatName.includes('ses') || lowerCatName.includes('audio')) {
      return 1500;
    } else if (lowerCatName.includes('spor') || lowerCatName.includes('sport')) {
      return 800;
    } else if (lowerCatName.includes('bebek') || lowerCatName.includes('çocuk')) {
      return 150;
    } else if (lowerCatName.includes('aksesuar') || lowerCatName.includes('accessory')) {
      return 100;
    } else if (lowerCatName.includes('ayakkabı') || lowerCatName.includes('shoe')) {
      return 300;
    } else if (lowerCatName.includes('mutfak') || lowerCatName.includes('kitchen')) {
      return 400;
    } else if (lowerCatName.includes('dekorasyon') || lowerCatName.includes('decor')) {
      return 250;
    }
    
    return 500; // Varsayılan
  }
}

module.exports = new MLPricePredictionService(); 