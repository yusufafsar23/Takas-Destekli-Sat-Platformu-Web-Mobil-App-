import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Breadcrumb } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, Loader, Alert } from '../components/UI';
import { productService, categoryService } from '../services/api';
import { getCategoryPlaceholder } from '../utils/imageHelpers';

// Kategori haritalaması
const CATEGORY_MAPPINGS = {
  '1': { name: 'Elektronik', mongoId: '', subcategories: {
    '101': { name: 'Bilgisayarlar', mongoId: '' },
    '102': { name: 'Telefonlar', mongoId: '' },
    '103': { name: 'Televizyonlar', mongoId: '' },
    '104': { name: 'Ses Sistemleri', mongoId: '' }
  } },
  '2': { name: 'Ev Eşyaları', mongoId: '', subcategories: {
    '201': { name: 'Mobilya', mongoId: '' },
    '202': { name: 'Mutfak Eşyaları', mongoId: '' },
    '203': { name: 'Yatak ve Banyo', mongoId: '' },
    '204': { name: 'Dekorasyon', mongoId: '' }
  } },
  '3': { name: 'Giyim', mongoId: '', subcategories: {
    '301': { name: 'Kadın Giyim', mongoId: '' },
    '302': { name: 'Erkek Giyim', mongoId: '' },
    '303': { name: 'Çocuk Giyim', mongoId: '' },
    '304': { name: 'Ayakkabı ve Çanta', mongoId: '' }
  } },
  '4': { name: 'Kitap & Hobi', mongoId: '', subcategories: {
    '401': { name: 'Kitaplar', mongoId: '' },
    '402': { name: 'Müzik & Film', mongoId: '' },
    '403': { name: 'Koleksiyon', mongoId: '' },
    '404': { name: 'El İşi', mongoId: '' }
  } },
  '5': { name: 'Spor', mongoId: '', subcategories: {
    '501': { name: 'Spor Malzemeleri', mongoId: '' },
    '502': { name: 'Outdoor', mongoId: '' },
    '503': { name: 'Fitness', mongoId: '' },
    '504': { name: 'Bisiklet & Scooter', mongoId: '' }
  } },
  '6': { name: 'Oyun & Konsol', mongoId: '', subcategories: {
    '601': { name: 'Konsollar', mongoId: '' },
    '602': { name: 'Oyunlar', mongoId: '' },
    '603': { name: 'Aksesuarlar', mongoId: '' }
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
  
  // Elektronik kategorileri için anahtar kelimeler
  const electronicKeywords = [
    'elektronik', 'electronic', 'tech', 'teknoloji',
    'telefon', 'phone', 'iphone', 'samsung', 'xiaomi', 
    'bilgisayar', 'computer', 'laptop', 'notebook', 'pc',
    'tv', 'televizyon', 'television', 'smart tv',
    'hoparlör', 'speaker', 'kulaklık', 'headphone'
  ];
  
  // Kategori elektronik mi?
  if (typeof product.category === 'object' && product.category) {
    const catName = product.category.name ? product.category.name.toLowerCase() : '';
    if (catName.includes('elektronik') || 
        catName.includes('bilgisayar') || 
        catName.includes('telefon') ||
        catName.includes('tv')) {
      return true;
    }
    
    // Üst kategori elektronik mi?
    if (product.category.parent && typeof product.category.parent === 'object') {
      const parentName = product.category.parent.name ? product.category.parent.name.toLowerCase() : '';
      if (parentName.includes('elektronik')) {
        return true;
      }
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
    
    setSubcategory({
      name: subCategoryInfo.name,
      _id: subCategoryInfo.mongoId || ''
    });
    
    // Alt kategori ürünlerini getir
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
    
    // Telefon kategorisi için özel işlem
    const isTelephoneCategory = subCategoryInfo.name.toLowerCase() === 'telefonlar';
    
    // Telefon ürünleri veya az ürün varsa içerik bazlı filtreleme yap
    if (isTelephoneCategory || productsList.length < 5) {
      // Telefon kategorisi için özel kontrol
      if (isTelephoneCategory) {
        const phoneProducts = allProductsList.filter(product => isPhoneProduct(product));
        
        // Telefon ürünlerini ekle
        phoneProducts.forEach(product => {
          if (!productsList.some(p => p._id === product._id)) {
            productsList.push(product);
          }
        });
      }
      
      // Kategori ve alt kategori ismine göre eşleşme kontrolü
      const filteredProducts = allProductsList.filter(product => 
        doesProductMatchCategory(product, mainCategory.name, subCategoryInfo.name)
      );
      
      // Tekrar olmadan ekle
      filteredProducts.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
    }
    
    console.log(`Toplam eşleşen alt kategori ürün sayısı: ${productsList.length}`);
    
    setProducts(productsList);
    setTotalProducts(productsList.length);
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
    
    console.log("Elektronik kategorisi mi?", isElectronics);
    
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
    
    // Alt kategorilere ait tüm ürünleri getir (özellikle Elektronik için kritik)
    if (subcategoryIds.length > 0) {
      try {
        console.log("Alt kategorilere ait ürünler getiriliyor...");
        
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
      // Telefon ürünleri için özel kontrol
      const phoneProducts = allProductsList.filter(product => isPhoneProduct(product));
      console.log(`Telefon olarak tespit edilen ürün sayısı: ${phoneProducts.length}`);
      
      // Telefon ürünlerini ekle
      phoneProducts.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Elektronik ürünlerini ekle
      const electronicProducts = allProductsList.filter(product => isProductElectronic(product));
      electronicProducts.forEach(product => {
        if (!productsList.some(p => p._id === product._id)) {
          productsList.push(product);
        }
      });
      
      // Anahtar kelime araması
      const keywords = ['elektronik', 'bilgisayar', 'telefon', 'tv'];
      for (const keyword of keywords) {
        try {
          const searchResponse = await productService.getAllProducts({
            search: keyword,
            sort: sortParam,
            limit: 30
          });
          
          let searchResults = [];
          if (searchResponse?.data?.data && Array.isArray(searchResponse.data.data)) {
            searchResults = searchResponse.data.data;
          } else if (searchResponse?.data && Array.isArray(searchResponse.data)) {
            searchResults = searchResponse.data;
          }
          
          // Arama sonuçlarını ekle
          searchResults.forEach(product => {
            if (!productsList.some(p => p._id === product._id)) {
              productsList.push(product);
            }
          });
        } catch (searchErr) {
          console.error(`"${keyword}" araması sırasında hata:`, searchErr);
        }
      }
    }
    
    console.log(`Son ürün sayısı: ${productsList.length}`);
    
    setProducts(productsList);
    setTotalProducts(productsList.length);
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