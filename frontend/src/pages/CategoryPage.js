import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Breadcrumb } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, Loader, Alert } from '../components/UI';
import { productService, categoryService } from '../services/api';
import { getCategoryPlaceholder } from '../utils/imageHelpers';

// Kategori haritalaması
const CATEGORY_MAPPINGS = {
  '1': { name: 'Elektronik', mongoId: '', subcategories: {
    '101': { name: 'Bilgisayarlar', mongoId: '68137ab2358c748f63723fe2' },
    '102': { name: 'Telefonlar', mongoId: '68137ab2358c748f63723fe4' },
    '103': { name: 'Televizyonlar', mongoId: '68137ab2358c748f63723fe6' },
    '104': { name: 'Ses Sistemleri', mongoId: '68137ab2358c748f63723fe8' }
  } },
  '2': { name: 'Ev Eşyaları', mongoId: '', subcategories: {
    '201': { name: 'Mobilya', mongoId: '68137ab4358c748f63723ff6' },
    '202': { name: 'Mutfak Eşyaları', mongoId: '68137ab4358c748f63723ff8' },
    '203': { name: 'Yatak ve Banyo', mongoId: '68137ab4358c748f63723ffa' },
    '204': { name: 'Dekorasyon', mongoId: '68137ab5358c748f63723ffc' }
  } },
  '3': { name: 'Giyim', mongoId: '', subcategories: {
    '301': { name: 'Kadın Giyim', mongoId: '68137ab3358c748f63723fec' },
    '302': { name: 'Erkek Giyim', mongoId: '68137ab3358c748f63723fee' },
    '303': { name: 'Çocuk Giyim', mongoId: '68137ab3358c748f63723ff0' },
    '304': { name: 'Ayakkabı ve Çanta', mongoId: '68137ab3358c748f63723ff2' },
    '305': { name: 'Bebek ve Çocuk', mongoId: '68137ab1358c748f63723fde' }
  } },
  '4': { name: 'Kitap & Hobi', mongoId: '', subcategories: {
    '401': { name: 'Kitaplar', mongoId: '68137ab0358c748f63723fd8' },
    '402': { name: 'Müzik & Film', mongoId: '' }
  } },
  '5': { name: 'Spor', mongoId: '', subcategories: {
    '501': { name: 'Spor Malzemeleri', mongoId: '68137ab0358c748f63723fd3' },
    '503': { name: 'Fitness', mongoId: '' },
    '504': { name: 'Bisiklet & Scooter', mongoId: '68137ab0358c748f63723fd3' }
  } },
  '6': { name: 'Oyun & Konsol', mongoId: '', subcategories: {
    '601': { name: 'Oyunlar & Konsollar', mongoId: '68137ab0358c748f63723fd6' },
    '603': { name: 'Aksesuarlar', mongoId: '68137ab4358c748f63723ff4' }
  } }
};

// Tüm ürünleri getiren yardımcı fonksiyon
async function getAllProducts(sortParam) {
  try {
    const response = await productService.getAllProducts({
      limit: 500,
      sort: sortParam
    });
    
    let productsList = [];
    if (response?.data?.data && Array.isArray(response.data.data)) {
      productsList = response.data.data;
    } else if (response?.data && Array.isArray(response.data)) {
      productsList = response.data;
    }
    
    console.log(`Toplam ${productsList.length} ürün getirildi`);
    return productsList;
  } catch (error) {
    console.error("Tüm ürünleri getirirken hata:", error);
    return [];
  }
}

// Telefon ürünlerini belirlemek için fonksiyon
function isPhoneProduct(product) {
  if (!product) return false;
  
  const titleLower = product.title ? product.title.toLowerCase() : '';
  const descLower = product.description ? product.description.toLowerCase() : '';
  
  // Telefon ile ilgili anahtar kelimeler
  const phoneKeywords = [
    'telefon', 'phone', 'smartphone', 'cep telefonu', 'akıllı telefon', 'mobile', 'cep',
    'iphone', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'huawei', 'oppo', 'realme', 
    'oneplus', 'vivo', 'poco', 'honor', 'nokia', 'motorola', 'google pixel'
  ];
  
  // Telefon kategorisi mi?
  if (typeof product.category === 'object' && product.category) {
    const catName = product.category.name ? product.category.name.toLowerCase() : '';
    if (catName.includes('telefon') || catName.includes('phone')) {
      return true;
    }
  } else if (typeof product.category === 'string') {
    const catStr = product.category.toLowerCase();
    if (catStr.includes('telefon') || catStr.includes('phone')) {
      return true;
    }
  }
  
  // Başlık veya açıklamada anahtar kelime var mı?
  return phoneKeywords.some(keyword => 
    titleLower.includes(keyword) || descLower.includes(keyword)
  );
}

// Elektronik ürünü olup olmadığını belirleyen fonksiyon
function isProductElectronic(product) {
  if (!product) return false;
  
  const titleLower = product.title ? product.title.toLowerCase() : '';
  const descLower = product.description ? product.description.toLowerCase() : '';
  
  // Elektronik kategorileri için anahtar kelimeler - daha spesifik ve dekorasyon ile karışmayacak şekilde
  const electronicKeywords = [
    'elektronik', 'electronic', 'tech', 'teknoloji',
    'telefon', 'phone', 'iphone', 'samsung', 'xiaomi', 'apple', 
    'bilgisayar', 'computer', 'laptop', 'notebook', 'pc', 'masaüstü',
    'tv', 'televizyon', 'television', 'smart tv', 'lcd', 'led tv',
    'hoparlör', 'speaker', 'kulaklık', 'headphone', 'bluetooth',
    'şarj cihazı', 'adaptör', 'batarya', 'tablet', 'klavye', 'mouse',
    'ses sistemi', 'ses sistemleri', 'müzik sistemi', 'anfi', 'amplifikatör', 
    'stereo', 'woofer', 'subwoofer', 'soundbar', 'mikrofon', 'mikser',
    'echo', 'bass', 'tiz', 'audio', 'ses', 'müzik çalar', 'mp3'
  ];
  
  // Dekorasyon ile ilgili kelimeler - bunlar varsa elektronik kabul etme
  const decorationKeywords = [
    'dekorasyon', 'süs', 'hediyelik', 'biblo', 'vazo', 'çerçeve', 'mum',
    'duvar', 'tablo', 'halı', 'perde', 'yastık', 'örtü', 'ev dekorasyon'
  ];
  
  // Başlık veya açıklamada dekorasyon ile ilgili kelime varsa, elektronik kategorisine dahil etme
  const hasDecorationKeyword = decorationKeywords.some(keyword => 
    titleLower.includes(keyword) || descLower.includes(keyword)
  );
  
  if (hasDecorationKeyword) {
    return false;
  }
  
  // Kategori elektronik mi?
  if (typeof product.category === 'object' && product.category) {
    const catName = product.category.name ? product.category.name.toLowerCase() : '';
    if (catName.includes('elektronik') || 
        catName.includes('bilgisayar') || 
        catName.includes('telefon') ||
        catName.includes('tv')) {
      return true;
    }
    
    // Dekorasyon kategorisindeyse kesinlikle elektronik değil
    if (catName.includes('dekor') || catName.includes('süs') || catName.includes('biblo')) {
      return false;
    }
    
    // Üst kategori elektronik mi?
    if (product.category.parent && typeof product.category.parent === 'object') {
      const parentName = product.category.parent.name ? product.category.parent.name.toLowerCase() : '';
      if (parentName.includes('elektronik')) {
        return true;
      }
      
      // Üst kategori dekorasyon ise kesinlikle elektronik değil
      if (parentName.includes('dekor') || parentName.includes('ev eşya')) {
        return false;
      }
    }
  } else if (typeof product.category === 'string') {
    const catStr = product.category.toLowerCase();
    
    // Dekorasyon kategorisindeyse kesinlikle elektronik değil
    if (catStr.includes('dekor') || catStr.includes('süs') || catStr.includes('ev eşya')) {
      return false;
    }
  }
  
  // Başlık veya açıklamada anahtar kelime var mı?
  return electronicKeywords.some(keyword => 
    titleLower.includes(keyword) || descLower.includes(keyword)
  );
}

// Ürün-kategori eşleşmesi için yardımcı fonksiyon
function doesProductMatchCategory(product, categoryName, subcategoryName = null) {
  if (!product) return false;
  
  const catName = categoryName.toLowerCase();
  const titleLower = product.title ? product.title.toLowerCase() : '';
  const descLower = product.description ? product.description.toLowerCase() : '';
  
  // Kategori kontrolü
  let categoryMatch = false;
  if (typeof product.category === 'object' && product.category) {
    const productCatName = product.category.name ? product.category.name.toLowerCase() : '';
    categoryMatch = productCatName.includes(catName);
    
    // Üst kategori kontrolü
    if (product.category.parent && typeof product.category.parent === 'object') {
      const parentName = product.category.parent.name ? product.category.parent.name.toLowerCase() : '';
      if (parentName === catName) {
        categoryMatch = true;
      }
    }
  } else if (typeof product.category === 'string') {
    categoryMatch = product.category.toLowerCase().includes(catName);
  }
  
  // Başlık ve açıklama kontrolü
  const titleMatch = titleLower.includes(catName);
  const descMatch = descLower.includes(catName);
  
  // Alt kategori varsa kontrol et
  if (subcategoryName) {
    const subcatName = subcategoryName.toLowerCase();
    
    // Alt kategori eşleşme kontrolü
    const titleSubMatch = titleLower.includes(subcatName);
    const descSubMatch = descLower.includes(subcatName);
    
    // Kategori özelliğinde alt kategori kontrolü
    let subcategoryMatch = false;
    if (typeof product.category === 'object' && product.category) {
      const productCatName = product.category.name ? product.category.name.toLowerCase() : '';
      subcategoryMatch = productCatName.includes(subcatName);
    } else if (typeof product.category === 'string') {
      subcategoryMatch = product.category.toLowerCase().includes(subcatName);
    }
    
    return titleSubMatch || descSubMatch || subcategoryMatch;
  }
  
  return categoryMatch || titleMatch || descMatch;
}

const CategoryPage = () => {
  const { categoryId, subcategoryId } = useParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [subcategory, setSubcategory] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [error, setError] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [categoryId, subcategoryId, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Aranacak kategori ID:', categoryId, 'Subcategory ID:', subcategoryId);
      
      // Tüm ürünleri getir
      const sortParam = getSortParam(sortBy);
      const allProductsList = await getAllProducts(sortParam);
      
      // Debugging
      console.log('API\'den gelen toplam ürün sayısı:', allProductsList.length);
      
      setAllProducts(allProductsList);
      
      // Tüm kategorileri getir ve MongoID'leri güncelle
      const allCategoriesResponse = await categoryService.getAllCategories();
      let categoriesList = [];
      
      if (allCategoriesResponse?.data?.data) {
        categoriesList = allCategoriesResponse.data.data;
      } else if (allCategoriesResponse?.data) {
        categoriesList = allCategoriesResponse.data;
      }
      
      // Kategorileri logla
      console.log('Tüm kategoriler yüklendi, toplam:', categoriesList.length);
      
      // Kategori eşleştirmelerini yap
      categoriesList.forEach(cat => {
        Object.keys(CATEGORY_MAPPINGS).forEach(key => {
          if (CATEGORY_MAPPINGS[key].name === cat.name) {
            CATEGORY_MAPPINGS[key].mongoId = cat._id;
            console.log(`Ana kategori eşleşti - ${cat.name}: ID ${key} -> MongoDB ID ${cat._id}`);
            
            // Alt kategorileri de eşleştir
            const subcats = categoriesList.filter(subcat => 
              subcat.parent === cat._id || 
              subcat.parentCategory === cat._id || 
              subcat.name?.includes(cat.name)
            );
            
            if (subcats.length > 0) {
              console.log(`${cat.name} için ${subcats.length} alt kategori bulundu`);
              
              Object.keys(CATEGORY_MAPPINGS[key].subcategories).forEach(subKey => {
                const subName = CATEGORY_MAPPINGS[key].subcategories[subKey].name;
                const matchingSub = subcats.find(s => 
                  s.name === subName || s.name?.includes(subName)
                );
                
                if (matchingSub) {
                  CATEGORY_MAPPINGS[key].subcategories[subKey].mongoId = matchingSub._id;
                  console.log(`Alt kategori eşleşti - ${subName}: ID ${subKey} -> MongoDB ID ${matchingSub._id}`);
                }
              });
            }
          }
        });
      });
      
      // Eğer kategori ID'si sabit ID (1, 2, 3) yerine MongoDB ID ise, onu sabit ID'ye çevir
      let staticCategoryId = categoryId;
      let staticSubcategoryId = subcategoryId;
      
      // MongoDB ID'sini sabit ID'ye çevir
      if (categoryId && categoryId.length === 24 && /^[0-9a-f]+$/i.test(categoryId)) {
        // MongoDB ID'si geçerli kategoriyle eşleştirilir
        Object.keys(CATEGORY_MAPPINGS).forEach(key => {
          if (CATEGORY_MAPPINGS[key].mongoId === categoryId) {
            staticCategoryId = key;
            console.log(`MongoDB ID ${categoryId} -> Sabit ID ${key}`);
          }
        });
      }
      
      // Alt kategori ID'sini kontrol et
      if (subcategoryId && subcategoryId.length === 24 && /^[0-9a-f]+$/i.test(subcategoryId)) {
        // MongoDB ID'si geçerli alt kategoriyle eşleştirilir
        if (staticCategoryId && CATEGORY_MAPPINGS[staticCategoryId]) {
          const subcategories = CATEGORY_MAPPINGS[staticCategoryId].subcategories;
          Object.keys(subcategories).forEach(subKey => {
            if (subcategories[subKey].mongoId === subcategoryId) {
              staticSubcategoryId = subKey;
              console.log(`MongoDB ID ${subcategoryId} -> Sabit ID ${subKey}`);
            }
          });
        }
      }
      
      // Alt kategori varsa işle, yoksa ana kategori işle
      // Sabit ID'leri kullanarak
      if (staticSubcategoryId) {
        handleSubcategory(staticCategoryId, staticSubcategoryId, allProductsList, sortParam);
      } else {
        handleMainCategory(staticCategoryId, allProductsList, sortParam);
      }
      
    } catch (err) {
      console.error('Kategori sayfası veri yükleme hatası:', err);
      setError('Ürünler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      setLoading(false);
    }
  };

  // Alt kategori sayfası için ürünleri işleme
  const handleSubcategory = async (catId, subCatId, allProductsList, sortParam) => {
    // Ana kategori ve alt kategori bilgisi al
    const mainCategory = CATEGORY_MAPPINGS[catId];
    if (!mainCategory) {
      setError('Kategori bulunamadı');
      setProducts([]);
      setLoading(false);
      return;
    }
    
    setCategory({
      name: mainCategory.name,
      _id: mainCategory.mongoId
    });
    
    // Alt kategori bilgisini al
    const subCategoryInfo = mainCategory.subcategories[subCatId];
    if (!subCategoryInfo) {
      setError('Alt kategori bulunamadı');
      setProducts([]);
      setLoading(false);
      return;
    }
    
    console.log(`Alt kategori bilgisi:`, subCategoryInfo);
    
    setSubcategory({
      name: subCategoryInfo.name,
      _id: subCategoryInfo.mongoId || ''
    });
    
    // Telefonlar kategorisi için özel işlem
    const isTelephoneCategory = subCatId === '102';
    // Bisiklet & Scooter kategorisi için özel işlem
    const isBicycleScooterCategory = subCatId === '504';
    
    if (isTelephoneCategory) {
      console.log("Telefonlar kategorisi için özel işlem yapılıyor...");
      
      // Telefon kategorisi için sabit MongoDB ID
      const telefonlarCategoryId = '68137ab2358c748f63723fe4';
      
      try {
        // Doğrudan API'den telefonlar kategorisine ait ürünleri getir
        const telefonlarResponse = await productService.getAllProducts({
          category: telefonlarCategoryId,
          sort: sortParam,
          limit: 100
        });
        
        let telefonProducts = [];
        if (telefonlarResponse?.data?.data && Array.isArray(telefonlarResponse.data.data)) {
          telefonProducts = telefonlarResponse.data.data;
        } else if (telefonlarResponse?.data && Array.isArray(telefonlarResponse.data)) {
          telefonProducts = telefonlarResponse.data;
        }
        
        console.log(`Telefonlar kategorisinden getirilen ürün sayısı: ${telefonProducts.length}`);
        
        // Dekorasyon ürününü filtrele
        const filteredTelefonProducts = telefonProducts.filter(product => 
          product._id !== '682c660c68777d1ab06cde6a'
        );
        
        console.log(`Filtreleme sonrası telefon ürünü sayısı: ${filteredTelefonProducts.length}`);
        
        setProducts(filteredTelefonProducts);
        setTotalProducts(filteredTelefonProducts.length);
        setLoading(false);
        return;
      } catch (err) {
        console.error('Telefonlar kategorisi ürünleri getirilirken hata:', err);
      }
    } else if (isBicycleScooterCategory) {
      console.log("Bisiklet & Scooter kategorisi için özel işlem yapılıyor...");
      
      // Bisiklet & Scooter kategorisi için sabit MongoDB ID
      const bisikletScooterCategoryId = '68137ab0358c748f63723fd3';
      
      try {
        // Doğrudan API'den bisiklet & scooter kategorisine ait ürünleri getir
        const bisikletScooterResponse = await productService.getAllProducts({
          category: bisikletScooterCategoryId,
          sort: sortParam,
          limit: 100
        });
        
        let bisikletScooterProducts = [];
        if (bisikletScooterResponse?.data?.data && Array.isArray(bisikletScooterResponse.data.data)) {
          bisikletScooterProducts = bisikletScooterResponse.data.data;
        } else if (bisikletScooterResponse?.data && Array.isArray(bisikletScooterResponse.data)) {
          bisikletScooterProducts = bisikletScooterResponse.data;
        }
        
        console.log(`Bisiklet & Scooter kategorisinden getirilen ürün sayısı: ${bisikletScooterProducts.length}`);
        
        setProducts(bisikletScooterProducts);
        setTotalProducts(bisikletScooterProducts.length);
        setLoading(false);
        return;
      } catch (err) {
        console.error('Bisiklet & Scooter kategorisi ürünleri getirilirken hata:', err);
      }
    }
    
    // Diğer alt kategoriler için normal işleme devam et
    let productsList = [];
    if (subCategoryInfo.mongoId) {
      try {
        const productsResponse = await productService.getAllProducts({
          category: subCategoryInfo.mongoId,
          sort: sortParam,
          limit: 50
        });
        
        if (productsResponse?.data?.data && Array.isArray(productsResponse.data.data)) {
          productsList = productsResponse.data.data;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          productsList = productsResponse.data;
        }
      } catch (err) {
        console.error('Alt kategori ürünleri getirilirken hata:', err);
      }
    }
    
    console.log(`Alt kategori ID'si ile getirilen ürün sayısı: ${productsList.length}`);
    
    // Alt kategori için MongoDB ID bazlı filtreleme yap
    if (subCategoryInfo.mongoId) {
      console.log(`Alt kategori için MongoDB ID bazlı filtreleme: ${subCategoryInfo.mongoId}`);
      
      // Eğer çok az ürün varsa, doğrudan ID bazlı filtreleme yap
      if (productsList.length < 5) {
        console.log("Yeterli ürün bulunamadı, doğrudan kategori ID ile filtreleme yapılıyor...");
        
        // Tüm ürünler içinden bu alt kategoriye ait olanları bul (ID bazlı)
        const exactCategoryProducts = allProductsList.filter(product => {
          if (product.category) {
            // Kategori bir obje ise
            if (typeof product.category === 'object' && product.category._id) {
              return product.category._id === subCategoryInfo.mongoId;
            }
            // Kategori bir string ise
            else if (typeof product.category === 'string') {
              return product.category === subCategoryInfo.mongoId;
            }
          }
          return false;
        });
        
        console.log(`Kesin kategori ID eşleşmesiyle bulunan ürün sayısı: ${exactCategoryProducts.length}`);
        
        // Kesin eşleşen ürünleri ekle
        exactCategoryProducts.forEach(product => {
          if (!productsList.some(p => p._id === product._id)) {
            productsList.push(product);
          }
        });
      }
    }
    
    // Sorunlu ürünleri filtrele (özellikle dekorasyon ürünlerini)
    if (productsList.length > 0) {
      const filteredList = productsList.filter(product => {
        // Ürün ID'si kontrolü - sorunlu ürünü direkt filtrele
        if (product._id === '682c660c68777d1ab06cde6a') {
          console.log('Sorunlu dekorasyon ürünü filtrelendi:', product.title || product._id);
          return false;
        }
        return true;
      });
      
      console.log(`Filtreleme sonrası kalan ürün sayısı: ${filteredList.length}`);
      productsList = filteredList;
    }
    
    console.log(`Toplam eşleşen alt kategori ürün sayısı: ${productsList.length}`);
    
    // Alt kategori sayısını localStorage'a kaydet
    try {
      const subcategoryCountKey = `${catId}_${subCatId}`;
      localStorage.setItem(subcategoryCountKey, productsList.length.toString());
      console.log(`Alt kategori ${subCatId} için ürün sayısı localStorage'a kaydedildi: ${productsList.length}`);
      
      // Ayrıca tüm kategori sayıları için global objeyi güncelle
      let allCategoryCounts = {};
      try {
        const savedCounts = localStorage.getItem('all_category_counts');
        if (savedCounts) {
          allCategoryCounts = JSON.parse(savedCounts);
        }
      } catch (e) {
        console.error('Eski kategori sayıları alınamadı:', e);
      }
      
      // Bu alt kategori için sayıyı güncelle
      allCategoryCounts[subcategoryCountKey] = productsList.length;
      
      // Ana kategori için de bu ürünleri sayıya ekle
      if (allCategoryCounts[catId]) {
        // Önceki değeri koru
      } else {
        // Ana kategori sayısını ilk kez ekle
        allCategoryCounts[catId] = productsList.length;
      }
      
      // Güncellenmiş objeyi kaydet
      localStorage.setItem('all_category_counts', JSON.stringify(allCategoryCounts));
      console.log('Tüm kategori sayıları güncellendi:', allCategoryCounts);
    } catch (e) {
      console.error('Alt kategori sayısı kaydedilirken hata:', e);
    }
    
    // Ürünleri client-side olarak sırala
    const sortedProducts = sortProductsClientSide(productsList, sortBy);
    
    setProducts(sortedProducts);
    setTotalProducts(sortedProducts.length);
    setLoading(false);
  };
  
  // Ana kategori sayfası için ürünleri işleme
  const handleMainCategory = async (catId, allProductsList, sortParam) => {
    console.log("==== ANA KATEGORİ SAYFASI YÜKLENİYOR ====");
    console.log("Kategori ID:", catId);
    
    const mappedCategory = CATEGORY_MAPPINGS[catId];
    if (!mappedCategory) {
      setError('Kategori bulunamadı');
      setProducts([]);
      setLoading(false);
      return;
    }
    
    console.log("Ana Kategori:", mappedCategory.name);
    
    setCategory({
      name: mappedCategory.name,
      _id: mappedCategory.mongoId
    });
    
    // Ürünleri toplamak için ana liste
    let productsList = [];
    
    // Tüm kategori isimleri
    const categoryName = mappedCategory.name.toLowerCase();
    const isElectronics = categoryName === 'elektronik';
    const isHomeItems = categoryName === 'ev eşyaları' || catId === '2';
    const isClothing = categoryName === 'giyim' || catId === '3';
    const isBookHobby = categoryName === 'kitap & hobi' || catId === '4';
    const isSports = categoryName === 'spor' || catId === '5';
    const isGaming = categoryName === 'oyun & konsol' || catId === '6';
    
    console.log("Elektronik kategorisi mi?", isElectronics);
    console.log("Ev Eşyaları kategorisi mi?", isHomeItems);
    console.log("Giyim kategorisi mi?", isClothing);
    console.log("Kitap & Hobi kategorisi mi?", isBookHobby);
    console.log("Spor kategorisi mi?", isSports);
    console.log("Oyun & Konsol kategorisi mi?", isGaming);
    
    // Alt kategorileri ve isimlerini al
    const subcategories = Object.values(mappedCategory.subcategories);
    const subcategoryNames = subcategories.map(subcat => subcat.name.toLowerCase());
    const subcategoryIds = subcategories
      .filter(subcat => subcat.mongoId)
      .map(subcat => subcat.mongoId);
    
    console.log("Alt kategori isimleri:", subcategoryNames);
    console.log("Alt kategori ID'leri:", subcategoryIds);
    
    // Ana kategoriye ait ürünleri doğrudan getir
    if (mappedCategory.mongoId) {
      try {
        console.log("Ana kategori MongoDB ID'si ile ürünler getiriliyor:", mappedCategory.mongoId);
        
        const productsResponse = await productService.getAllProducts({
          category: mappedCategory.mongoId,
          sort: sortParam,
          limit: 100
        });
        
        let categoryProducts = [];
        if (productsResponse?.data?.data && Array.isArray(productsResponse.data.data)) {
          categoryProducts = productsResponse.data.data;
        } else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
          categoryProducts = productsResponse.data;
        }
        
        console.log(`Ana kategori ID'si ile getirilen ürün sayısı: ${categoryProducts.length}`);
        
        // Ana kategoriye ait ürünleri ekle
        productsList = [...categoryProducts];
      } catch (err) {
        console.error('Ana kategori ürünleri getirilirken hata:', err);
      }
    }
    
    // Alt kategorilere ait tüm ürünleri getir
    if (subcategoryIds.length > 0) {
      try {
        console.log("Alt kategorilere ait ürünler getiriliyor...");
        
        // Ses sistemleri alt kategorisi için özel kontrol
        const sesSistemleriSubCategory = subcategories.find(subcat => 
          subcat.name.toLowerCase().includes('ses sistem')
        );
        
        if (sesSistemleriSubCategory && sesSistemleriSubCategory.mongoId) {
          console.log("Ses sistemleri alt kategorisi bulundu:", sesSistemleriSubCategory.name);
        }
        
        // Her bir alt kategori için ürünleri getir
        for (const subcategoryId of subcategoryIds) {
          console.log(`Alt kategori ID ${subcategoryId} için ürünler getiriliyor...`);
          
          try {
            const subcatResponse = await productService.getAllProducts({
              category: subcategoryId,
              sort: sortParam,
              limit: 50
            });
            
            let subcatProducts = [];
            if (subcatResponse?.data?.data && Array.isArray(subcatResponse.data.data)) {
              subcatProducts = subcatResponse.data.data;
            } else if (subcatResponse?.data && Array.isArray(subcatResponse.data)) {
              subcatProducts = subcatResponse.data;
            }
            
            console.log(`Alt kategori ${subcategoryId} için bulunan ürün sayısı: ${subcatProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            subcatProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (subcatErr) {
            console.error(`Alt kategori ${subcategoryId} ürünleri getirilirken hata:`, subcatErr);
          }
        }
        
        console.log(`Alt kategoriler eklendikten sonra toplam ürün sayısı: ${productsList.length}`);
      } catch (err) {
        console.error('Alt kategori ürünleri getirilirken hata:', err);
      }
    }
    
    // Elektronik kategorisi için özel işlem
    if (isElectronics) {
      console.log("Elektronik kategorisi için özel işlem yapılıyor...");
      
      // Elektronik alt kategorileri için sabit ID'ler
      const elektronikAltKategoriIDs = [
        '68137ab2358c748f63723fe2', // Bilgisayarlar
        '68137ab2358c748f63723fe4', // Telefonlar
        '68137ab2358c748f63723fe6', // Televizyonlar
        '68137ab2358c748f63723fe8'  // Ses Sistemleri
      ];
      
      console.log("Elektronik alt kategori ID'leri:", elektronikAltKategoriIDs);
      
      // Tüm ürünler içinden elektronik alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return elektronikAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return elektronikAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş ürün sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir elektronik alt kategorisi için ürünleri getir
        for (const categoryId of elektronikAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    // Ev Eşyaları kategorisi için özel işlem
    if (isHomeItems) {
      console.log("Ev Eşyaları kategorisi için özel işlem yapılıyor...");
      
      // Ev Eşyaları alt kategorileri için sabit ID'ler
      const evEsyalariAltKategoriIDs = [
        '68137ab4358c748f63723ff6', // Mobilya
        '68137ab4358c748f63723ff8', // Mutfak Eşyaları
        '68137ab4358c748f63723ffa', // Yatak ve Banyo
        '68137ab5358c748f63723ffc'  // Dekorasyon
      ];
      
      console.log("Ev Eşyaları alt kategori ID'leri:", evEsyalariAltKategoriIDs);
      
      // Tüm ürünler içinden ev eşyaları alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return evEsyalariAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return evEsyalariAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş ev eşyası sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir ev eşyaları alt kategorisi için ürünleri getir
        for (const categoryId of evEsyalariAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    // Giyim kategorisi için özel işlem
    if (isClothing) {
      console.log("Giyim kategorisi için özel işlem yapılıyor...");
      
      // Giyim alt kategorileri için sabit ID'ler
      const giyimAltKategoriIDs = [
        '68137ab3358c748f63723fec', // Kadın Giyim
        '68137ab3358c748f63723fee', // Erkek Giyim
        '68137ab3358c748f63723ff0', // Çocuk Giyim
        '68137ab3358c748f63723ff2', // Ayakkabılar
        '68137ab1358c748f63723fde'  // Bebek ve Çocuk
      ];
      
      console.log("Giyim alt kategori ID'leri:", giyimAltKategoriIDs);
      
      // Tüm ürünler içinden giyim alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return giyimAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return giyimAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş giyim ürünü sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir giyim alt kategorisi için ürünleri getir
        for (const categoryId of giyimAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    // Kitap & Hobi kategorisi için özel işlem
    if (isBookHobby) {
      console.log("Kitap & Hobi kategorisi için özel işlem yapılıyor...");
      
      // Kitap & Hobi alt kategorileri için sabit ID'ler
      const kitapHobiAltKategoriIDs = [
        '68137ab0358c748f63723fd8' // Kitaplar
      ];
      
      console.log("Kitap & Hobi alt kategori ID'leri:", kitapHobiAltKategoriIDs);
      
      // Tüm ürünler içinden kitap & hobi alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return kitapHobiAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return kitapHobiAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş kitap & hobi ürünü sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir kitap & hobi alt kategorisi için ürünleri getir
        for (const categoryId of kitapHobiAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    // Spor kategorisi için özel işlem
    if (isSports) {
      console.log("Spor kategorisi için özel işlem yapılıyor...");
      
      // Spor alt kategorileri için sabit ID'ler
      const sporAltKategoriIDs = [
        '68137ab0358c748f63723fd3' // Spor Malzemeleri
      ];
      
      console.log("Spor alt kategori ID'leri:", sporAltKategoriIDs);
      
      // Tüm ürünler içinden spor alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return sporAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return sporAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş spor ürünü sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir spor alt kategorisi için ürünleri getir
        for (const categoryId of sporAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    // Oyun & Konsol kategorisi için özel işlem
    if (isGaming) {
      console.log("Oyun & Konsol kategorisi için özel işlem yapılıyor...");
      
      // Oyun & Konsol alt kategorileri için sabit ID'ler
      const oyunKonsolAltKategoriIDs = [
        '68137ab0358c748f63723fd6', // Oyunlar & Konsollar
        '68137ab4358c748f63723ff4'  // Aksesuarlar
      ];
      
      console.log("Oyun & Konsol alt kategori ID'leri:", oyunKonsolAltKategoriIDs);
      
      // Tüm ürünler içinden oyun & konsol alt kategorilerine ait olanları filtrele
      const filteredByCategory = allProductsList.filter(product => {
        // Kategori ID kontrolü
        if (product.category) {
          // Kategori bir obje ise (populate edilmiş)
          if (typeof product.category === 'object' && product.category._id) {
            return oyunKonsolAltKategoriIDs.includes(product.category._id);
          }
          // Kategori bir string ise (ID)
          else if (typeof product.category === 'string') {
            return oyunKonsolAltKategoriIDs.includes(product.category);
          }
        }
        return false;
      });
      
      console.log(`Kategori ID'lerine göre filtrelenmiş oyun & konsol ürünü sayısı: ${filteredByCategory.length}`);
      
      // Filtrelenmiş ürünleri ekle
      filteredByCategory.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Eğer yeterli ürün bulunamadıysa, her bir alt kategori için ayrı ayrı API çağrısı yap
      if (filteredByCategory.length < 10) {
        console.log("Yeterli ürün bulunamadı, her bir alt kategori için ayrı ayrı sorgu yapılıyor...");
        
        // Her bir oyun & konsol alt kategorisi için ürünleri getir
        for (const categoryId of oyunKonsolAltKategoriIDs) {
          try {
            const categoryResponse = await productService.getAllProducts({
              category: categoryId,
              sort: sortParam,
              limit: 30
            });
            
            let categoryProducts = [];
            if (categoryResponse?.data?.data && Array.isArray(categoryResponse.data.data)) {
              categoryProducts = categoryResponse.data.data;
            } else if (categoryResponse?.data && Array.isArray(categoryResponse.data)) {
              categoryProducts = categoryResponse.data;
            }
            
            console.log(`Alt kategori ${categoryId} için bulunan ürün sayısı: ${categoryProducts.length}`);
            
            // Bu alt kategoriden gelen ve ana listede olmayan ürünleri ekle
            categoryProducts.forEach(product => {
              if (!productsList.some(p => p._id === product._id)) {
                productsList.push(product);
              }
            });
          } catch (categoryErr) {
            console.error(`Alt kategori ${categoryId} ürünleri getirilirken hata:`, categoryErr);
          }
        }
      }
    }
    
    console.log(`Son ürün sayısı: ${productsList.length}`);
    
    // Kategori sayısını localStorage'a kaydet
    try {
      const categoryCountKey = `category_count_${catId}`;
      localStorage.setItem(categoryCountKey, productsList.length.toString());
      console.log(`Kategori ${catId} için ürün sayısı localStorage'a kaydedildi: ${productsList.length}`);
      
      // Ayrıca tüm kategori sayıları için global bir obje de güncelleyelim
      let allCategoryCounts = {};
      try {
        const savedCounts = localStorage.getItem('all_category_counts');
        if (savedCounts) {
          allCategoryCounts = JSON.parse(savedCounts);
        }
      } catch (e) {
        console.error('Eski kategori sayıları alınamadı:', e);
      }
      
      // Bu kategori için sayıyı güncelle
      allCategoryCounts[catId] = productsList.length;
      
      // Güncellenmiş objeyi kaydet
      localStorage.setItem('all_category_counts', JSON.stringify(allCategoryCounts));
      console.log('Tüm kategori sayıları güncellendi:', allCategoryCounts);
    } catch (e) {
      console.error('Kategori sayısı kaydedilirken hata:', e);
    }
    
    // Ürünleri client-side olarak sırala
    const sortedProducts = sortProductsClientSide(productsList, sortBy);
    
    setProducts(sortedProducts);
    setTotalProducts(sortedProducts.length);
    setLoading(false);
  };

  const getSortParam = (sortValue) => {
    switch (sortValue) {
      case 'newest': return '-createdAt';
      case 'oldest': return 'createdAt';
      case 'price_low': return 'price';
      case 'price_high': return '-price';
      default: return '-createdAt';
    }
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    
    // Sıralama değiştiğinde client-side sıralama da yap
    if (products.length > 0) {
      const sortedProducts = sortProductsClientSide(products, e.target.value);
      setProducts(sortedProducts);
    }
  };
  
  // Client-side sıralama fonksiyonu
  const sortProductsClientSide = (productsList, sortOption) => {
    console.log(`Client-side sıralama yapılıyor: ${sortOption}`);
    
    const sortedProducts = [...productsList];
    
    switch (sortOption) {
      case 'newest':
        return sortedProducts.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      case 'oldest':
        return sortedProducts.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateA - dateB;
        });
      case 'price_low':
        return sortedProducts.sort((a, b) => {
          const priceA = a.price ? parseFloat(a.price) : 0;
          const priceB = b.price ? parseFloat(b.price) : 0;
          return priceA - priceB;
        });
      case 'price_high':
        return sortedProducts.sort((a, b) => {
          const priceA = a.price ? parseFloat(a.price) : 0;
          const priceB = b.price ? parseFloat(b.price) : 0;
          return priceB - priceA;
        });
      default:
        return sortedProducts;
    }
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      if (typeof product.images[0] === 'string') {
        return product.images[0];
      } else if (typeof product.images[0] === 'object' && product.images[0].url) {
        return product.images[0].url;
      }
    }
    
    // Kategori bazlı placeholder
    let categoryName = '';
    if (typeof product.category === 'object') {
      categoryName = product.category.name;
    }
    
    return getCategoryPlaceholder(categoryName);
  };

  const getPageTitle = () => {
    if (subcategory) {
      return `${subcategory.name} - ${category?.name || ''}`;
    }
    return category ? category.name : 'Kategori';
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Loader />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>Ana Sayfa</Breadcrumb.Item>
        {category && !subcategory && (
          <Breadcrumb.Item active>{category.name}</Breadcrumb.Item>
        )}
        {category && subcategory && (
          <>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: `/categories/${categoryId}` }}>
              {category.name}
            </Breadcrumb.Item>
            <Breadcrumb.Item active>{subcategory.name}</Breadcrumb.Item>
          </>
        )}
      </Breadcrumb>

      <h1 className="mb-4">{getPageTitle()}</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-4">
        <Col md={6}>
          <p>Toplam {totalProducts} ürün bulundu</p>
        </Col>
        <Col md={6} className="d-flex justify-content-md-end">
          <Form.Group className="mb-3">
            <Form.Select
              value={sortBy}
              onChange={handleSortChange}
              className="form-select-sm"
            >
              <option value="newest">En Yeni</option>
              <option value="oldest">En Eski</option>
              <option value="price_low">Fiyat (Düşükten Yükseğe)</option>
              <option value="price_high">Fiyat (Yüksekten Düşüğe)</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {products.length === 0 ? (
        <div className="text-center py-5">
          <h4>Bu kategoride henüz ilan bulunmuyor.</h4>
          <p>Başka kategorilere göz atabilir veya daha sonra tekrar kontrol edebilirsiniz.</p>
        </div>
      ) : (
        <Row>
          {products.map((product) => (
            <Col key={product._id} xs={12} sm={6} md={4} lg={3} className="mb-4">
              <Card className="product-card h-100">
                <div className="card-img-container">
                  <img
                    src={getProductImage(product)}
                    alt={product.title}
                    className="product-card-img"
                  />
                </div>
                <div className="card-body">
                  <h5 className="product-title">
                    <Link 
                      to={`/products/${product._id}`}
                      className="product-title-link"
                    >
                      {product.title}
                    </Link>
                  </h5>
                  <p className="product-price">
                    {product.price > 0 ? `${product.price} ₺` : 'Sadece Takas'}
                  </p>
                  <div className="d-grid">
                    <Button
                      as={Link}
                      to={`/products/${product._id}`}
                      variant="primary"
                      className="product-btn"
                    >
                      İncele
                    </Button>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default CategoryPage; 