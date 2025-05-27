import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CategoryDropdown.css';

// Alt kategorilere sahip kategori dropdown komponenti
const CategoryDropdown = ({ category, subcategories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cihaz türünü tespit etme (mobil/masaüstü)
  const [isMobile, setIsMobile] = useState(false);

  // Ekran boyutu değişikliklerini dinle
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // İlk yüklendiğinde kontrol et
    checkIfMobile();
    
    // Ekran boyutu değiştiğinde kontrol et
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Dropdown dışına tıklandığında kapanma işlemi
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Sadece mobil cihazda document click listener'ı ekle
    if (isMobile) {
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  // Kategori tıklamasını işle
  const handleCategoryClick = (e) => {
    // Dropdown davranışı devre dışı bırakıldı
    return;
  };

  // Kategori ID'sini doğru formatta al
  const getCategoryId = (categoryId) => {
    // Eğer kategori ID'si 1, 2, 3, ... gibi sayılar ise aynen kullan
    // Ancak MongoDB ID (örneğin 68137aaf358c748f63723fc9) ise, sabit ID'lere dönüştür
    if (typeof categoryId === 'number' || /^\d+$/.test(categoryId)) {
      return categoryId;
    }
    
    // MongoDB ID'lerini kategori isimlerine göre sabit ID'lere dönüştür
    const categoryMap = {
      'Elektronik': '1',
      'Ev Eşyaları': '2',
      'Giyim': '3',
      'Kitap & Hobi': '4',
      'Spor': '5',
      'Oyun & Konsol': '6'
    };
    
    return categoryMap[category.name] || categoryId;
  };
  
  // Alt kategori ID'sini doğru formatta al
  const getSubcategoryId = (subcat, categoryId) => {
    if (typeof subcat.id === 'number' || /^\d+$/.test(subcat.id)) {
      return subcat.id;
    }
    
    // MongoDB ID'lerini alt kategori isimlerine göre sabit ID'lere dönüştür
    const subcategoryMap = {
      '1': { // Elektronik
        'Bilgisayarlar': '101',
        'Telefonlar': '102',
        'Televizyonlar': '103',
        'Ses Sistemleri': '104'
      },
      '2': { // Ev Eşyaları
        'Mobilya': '201',
        'Mutfak Eşyaları': '202',
        'Yatak ve Banyo': '203',
        'Dekorasyon': '204'
      },
      '3': { // Giyim
        'Kadın Giyim': '301',
        'Erkek Giyim': '302',
        'Çocuk Giyim': '303',
        'Ayakkabı ve Çanta': '304'
      },
      '4': { // Kitap & Hobi
        'Kitaplar': '401',
        'Müzik & Film': '402',
        'Koleksiyon': '403',
        'El İşi': '404'
      },
      '5': { // Spor
        'Spor Malzemeleri': '501',
        'Outdoor': '502',
        'Fitness': '503',
        'Bisiklet & Scooter': '504'
      },
      '6': { // Oyun & Konsol
        'Konsollar': '601',
        'Oyunlar': '602',
        'Aksesuarlar': '603'
      }
    };
    
    const mainCategoryId = getCategoryId(categoryId);
    return subcategoryMap[mainCategoryId]?.[subcat.name] || subcat.id;
  };
  
  // Ikon HTML'ini güvenli bir şekilde oluştur
  const renderCategoryIcon = () => {
    // Eğer ikon emoji ise doğrudan göster
    const emojiRegex = /\p{Emoji}/u;
    if (typeof category.icon === 'string' && emojiRegex.test(category.icon)) {
      return <span className="category-icon-emoji">{category.icon}</span>;
    }
    
    // Varsayılan ikonları kategorilere göre atama
    const defaultIcons = {
      'Elektronik': '📱',
      'Ev Eşyaları': '🏠',
      'Giyim': '👕',
      'Kitap & Hobi': '📚',
      'Spor': '⚽',
      'Oyun & Konsol': '🎮'
    };
    
    return <span className="category-icon-emoji">{defaultIcons[category.name] || '📦'}</span>;
  };
  
  // Kategori ve alt kategori ID'lerini alıp kullan
  const categoryId = getCategoryId(category.id);

  return (
    <div 
      className="category-dropdown" 
      ref={dropdownRef}
      onMouseEnter={() => {/* Hover dropdown deaktif edildi */}}
      onMouseLeave={() => {/* Hover dropdown deaktif edildi */}}
    >
      <Link 
        to={`/categories/${categoryId}`} 
        className="category-link"
        onClick={handleCategoryClick}
      >
        <div className="category-icon">
          {renderCategoryIcon()}
        </div>
        <h5 className="category-title">{category.name}</h5>
        <p className="text-muted category-count mb-0">{category.count || 0} İlan</p>
      </Link>

      {/* Alt menüleri tamamen devre dışı bırakıyoruz */}
      {false && isOpen && subcategories && subcategories.length > 0 && (
        <div className="subcategories-dropdown">
          <ul className="subcategory-list">
            {subcategories.map((subcat) => (
              <li key={subcat.id} className="subcategory-item">
                <Link to={`/categories/${categoryId}/${getSubcategoryId(subcat, categoryId)}`} className="subcategory-link">
                  {subcat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown; 