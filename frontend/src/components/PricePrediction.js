import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { pricePredictionService } from '../services/api';
import { getCategoryAttributes, calculatePriceImpact } from '../utils/categoryAttributesConfig';

const PricePrediction = ({ productData, onPredictionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showAttributeForm, setShowAttributeForm] = useState(false);
  const [attributes, setAttributes] = useState({});
  const [requiredAttributes, setRequiredAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Ürün verileri değiştiğinde tahmini sıfırla
  useEffect(() => {
    setPrediction(null);
    setError('');
    setShowAttributeForm(false);
    setAttributes({});
    setRequiredAttributes([]);
  }, [productData]);

  // Kategori değiştiğinde gerekli özellikleri getir
  useEffect(() => {
    if (showAttributeForm && productData?.category) {
      fetchCategoryAttributes(productData.category);
    }
  }, [showAttributeForm, productData?.category]);

  // Kategori için gerekli özellikleri getir
  const fetchCategoryAttributes = async (categoryId) => {
    try {
      setLoadingAttributes(true);
      setError('');
      
      const response = await pricePredictionService.getCategoryAttributes(categoryId);
      
      if (response?.data?.data) {
        setRequiredAttributes(response.data.data);
      } else {
        // Eğer API sonuç döndürmezse, varsayılan özellikleri kullan
        console.log('API özellik döndürmedi, varsayılan formlar kullanılacak');
      }
    } catch (err) {
      console.error('Kategori özellikleri alma hatası:', err);
      setError(err?.response?.data?.message || 'Kategori özellikleri alınamadı.');
    } finally {
      setLoadingAttributes(false);
    }
  };

  // Özellik değişikliği
  const handleAttributeChange = (attributeName, value) => {
    setAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };

  // Fiyat tahmini yap
  const getPrediction = async () => {
    if (!productData?.category) {
      setError('Lütfen önce bir kategori seçin.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Özelliklerle birlikte veri gönder
      const dataWithAttributes = {
        ...productData,
        attributes
      };
      
      const response = await pricePredictionService.getPricePrediction(dataWithAttributes);
      
      if (response?.data?.data) {
        setPrediction(response.data.data);
        
        // Üst bileşene bildir - Burada onPredictionComplete fonksiyonunu HESAPLAMA SONRASI çağırmıyoruz
        // onPredictionComplete burada otomatik çağrılmamalı, kullanıcı "Bu Fiyatı Kullan" butonuna tıklamalı
      } else {
        setError('Fiyat tahmini yapılamadı.');
      }
    } catch (err) {
      console.error('Fiyat tahmini hatası:', err);
      setError(err?.response?.data?.message || 'Fiyat tahmininde bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Dinamik özellik formu render etme
  const renderDynamicAttributeForm = () => {
    if (loadingAttributes) {
      return (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" /> 
          <span className="ms-2">Kategori özellikleri yükleniyor...</span>
        </div>
      );
    }
    
    if (requiredAttributes && requiredAttributes.length > 0) {
      return (
        <div className="mb-3">
          <h6>📋 {productData.categoryName || 'Ürün'} Özellikleri</h6>
          <div className="row">
            {requiredAttributes.map((attr, index) => (
              <div className="col-md-6" key={attr.name || index}>
                <div className="mb-3">
                  <label className="form-label">{attr.label || attr.name}</label>
                  {renderAttributeInput(attr)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Eğer API özellik döndürmediyse veya boşsa, varsayılan kategori bazlı formları göster
    return renderAttributesByCategory();
  };
  
  // Özellik tipine göre input render etme
  const renderAttributeInput = (attribute) => {
    const { name, type, options, placeholder } = attribute;
    
    switch (type) {
      case 'select':
        return (
          <select
            className="form-select"
            value={attributes[name] || ''}
            onChange={(e) => handleAttributeChange(name, e.target.value)}
          >
            <option value="">Seçiniz</option>
            {options && options.map((option, idx) => (
              <option key={idx} value={option.value || option}>
                {option.label || option}
              </option>
            ))}
          </select>
        );
        
      case 'number':
        return (
          <input
            type="number"
            className="form-control"
            placeholder={placeholder || `${attribute.label || name} değeri`}
            value={attributes[name] || ''}
            onChange={(e) => handleAttributeChange(name, e.target.value)}
          />
        );
        
      case 'boolean':
        return (
          <select
            className="form-select"
            value={attributes[name] || ''}
            onChange={(e) => handleAttributeChange(name, e.target.value === 'true')}
          >
            <option value="">Seçiniz</option>
            <option value="true">Evet</option>
            <option value="false">Hayır</option>
          </select>
        );
        
      default: // text input
        return (
          <input
            type="text"
            className="form-control"
            placeholder={placeholder || `${attribute.label || name}`}
            value={attributes[name] || ''}
            onChange={(e) => handleAttributeChange(name, e.target.value)}
          />
        );
    }
  };

  // Kategori bazlı özellik formları
  const renderAttributesByCategory = () => {
    if (!productData?.category) return null;
    
    // Kategori adını al
    const categoryName = productData.categoryName?.toLowerCase() || '';
    
    // Kategori için yapılandırılmış özellikleri al
    const configuredAttributes = getCategoryAttributes(productData.categoryName);
    
    // Eğer kategori için özel yapılandırma varsa onu kullan
    if (configuredAttributes && configuredAttributes.length > 0) {
      return (
        <div className="mb-3">
          <h6>📋 {productData.categoryName || 'Ürün'} Özellikleri</h6>
          <div className="row">
            {configuredAttributes.map((attr, index) => (
              <div className="col-md-6" key={attr.name || index}>
                <div className="mb-3">
                  <label className="form-label">{attr.label || attr.name}</label>
                  {renderConfiguredAttributeInput(attr)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Yapılandırma yoksa eski kategori eşleştirmelerini kullan
    if (categoryName.includes('telefon') || categoryName.includes('phone')) {
      return renderPhoneAttributes();
    } else if (categoryName.includes('giyim') || categoryName.includes('clothing')) {
      return renderClothingAttributes();
    } else if (categoryName.includes('ev') || categoryName.includes('home')) {
      return renderHomeAttributes();
    } else if (categoryName.includes('spor') || categoryName.includes('sports')) {
      return renderSportsAttributes();
    } else if (categoryName.includes('kitap') || categoryName.includes('book')) {
      return renderBookHobbyAttributes();
    } else if (categoryName.includes('araç') || categoryName.includes('vehicle')) {
      return renderVehicleAttributes();
    }
    
    // Varsayılan genel form
    return renderGeneralAttributes();
  };
  
  // Yapılandırılmış özellikler için input render etme
  const renderConfiguredAttributeInput = (attribute) => {
    const { name, type, options, placeholder, min, max, required } = attribute;
    
    // Select tipi için
    if (type === 'select' && options) {
      return (
        <select
          className="form-select"
          value={attributes[name] || ''}
          onChange={(e) => handleAttributeChange(name, e.target.value)}
          required={required}
        >
          <option value="">Seçiniz</option>
          {options.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    // Number tipi için
    if (type === 'number') {
      return (
        <input
          type="number"
          className="form-control"
          placeholder={placeholder || ''}
          min={min}
          max={max}
          value={attributes[name] || ''}
          onChange={(e) => handleAttributeChange(name, e.target.value)}
          required={required}
        />
      );
    }
    
    // Text tipi için (varsayılan)
    return (
      <input
        type="text"
        className="form-control"
        placeholder={placeholder || ''}
        value={attributes[name] || ''}
        onChange={(e) => handleAttributeChange(name, e.target.value)}
        required={required}
      />
    );
  };

  // Telefon özellikleri
  const renderPhoneAttributes = () => (
    <div className="mb-3">
      <h6>📱 Telefon Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="Apple, Samsung, Xiaomi vb."
              value={attributes.brand || ''}
              onChange={(e) => handleAttributeChange('brand', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Model</label>
            <input
              type="text"
              className="form-control"
              placeholder="iPhone 15, Galaxy S23 vb."
              value={attributes.model || ''}
              onChange={(e) => handleAttributeChange('model', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Hafıza (GB)</label>
            <select
              className="form-select"
              value={attributes.storage || ''}
              onChange={(e) => handleAttributeChange('storage', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="64">64 GB</option>
              <option value="128">128 GB</option>
              <option value="256">256 GB</option>
              <option value="512">512 GB</option>
              <option value="1024">1 TB</option>
            </select>
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">RAM (GB)</label>
            <select
              className="form-select"
              value={attributes.ram || ''}
              onChange={(e) => handleAttributeChange('ram', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="4">4 GB</option>
              <option value="6">6 GB</option>
              <option value="8">8 GB</option>
              <option value="12">12 GB</option>
              <option value="16">16 GB</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Giyim özellikleri
  const renderClothingAttributes = () => (
    <div className="mb-3">
      <h6>👕 Giyim Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Beden</label>
            <select
              className="form-select"
              value={attributes.size || ''}
              onChange={(e) => handleAttributeChange('size', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Kumaş Türü</label>
            <select
              className="form-select"
              value={attributes.fabric_type || ''}
              onChange={(e) => handleAttributeChange('fabric_type', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="pamuk">Pamuk</option>
              <option value="polyester">Polyester</option>
              <option value="yün">Yün</option>
              <option value="denim">Denim</option>
              <option value="keten">Keten</option>
              <option value="deri">Deri</option>
              <option value="ipek">İpek</option>
              <option value="dantel">Dantel</option>
              <option value="saten">Saten</option>
              <option value="karışım">Karışım</option>
              <option value="diğer">Diğer</option>
            </select>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Sezon</label>
            <select
              className="form-select"
              value={attributes.season || ''}
              onChange={(e) => handleAttributeChange('season', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="Yaz">Yaz</option>
              <option value="Kış">Kış</option>
              <option value="4 Mevsim">4 Mevsim</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Ev eşyaları özellikleri
  const renderHomeAttributes = () => (
    <div className="mb-3">
      <h6>🏠 Ev Eşyası Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="IKEA, Bellona vb."
              value={attributes.brand || ''}
              onChange={(e) => handleAttributeChange('brand', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Malzeme</label>
            <input
              type="text"
              className="form-control"
              placeholder="Masif, MDF, Deri vb."
              value={attributes.material || ''}
              onChange={(e) => handleAttributeChange('material', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Boyutlar</label>
            <input
              type="text"
              className="form-control"
              placeholder="200x100x80 cm"
              value={attributes.dimensions || ''}
              onChange={(e) => handleAttributeChange('dimensions', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Yaş (Yıl)</label>
            <input
              type="number"
              className="form-control"
              placeholder="Kaç yıllık?"
              value={attributes.age || ''}
              onChange={(e) => handleAttributeChange('age', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Spor malzemeleri özellikleri
  const renderSportsAttributes = () => (
    <div className="mb-3">
      <h6>⚽ Spor Malzemesi Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nike, Adidas, Wilson vb."
              value={attributes.brand || ''}
              onChange={(e) => handleAttributeChange('brand', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Spor Dalı</label>
            <input
              type="text"
              className="form-control"
              placeholder="Futbol, Tenis, Koşu vb."
              value={attributes.sport || ''}
              onChange={(e) => handleAttributeChange('sport', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Seviye</label>
            <select
              className="form-select"
              value={attributes.level || ''}
              onChange={(e) => handleAttributeChange('level', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="Başlangıç">Başlangıç</option>
              <option value="Amatör">Amatör</option>
              <option value="Profesyonel">Profesyonel</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Kitap & Hobi özellikleri
  const renderBookHobbyAttributes = () => (
    <div className="mb-3">
      <h6>📚 Kitap & Hobi Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Tür</label>
            <select
              className="form-select"
              value={attributes.type || ''}
              onChange={(e) => handleAttributeChange('type', e.target.value)}
            >
              <option value="">Seçiniz</option>
              <option value="Kitap">Kitap</option>
              <option value="Dergi">Dergi</option>
              <option value="Koleksiyon">Koleksiyon</option>
            </select>
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Yazar/Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="Yazar adı veya marka"
              value={attributes.author || ''}
              onChange={(e) => handleAttributeChange('author', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Araç özellikleri
  const renderVehicleAttributes = () => (
    <div className="mb-3">
      <h6>🚗 Araç Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="Toyota, BMW, Mercedes vb."
              value={attributes.brand || ''}
              onChange={(e) => handleAttributeChange('brand', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Model</label>
            <input
              type="text"
              className="form-control"
              placeholder="Corolla, 3 Serisi vb."
              value={attributes.model || ''}
              onChange={(e) => handleAttributeChange('model', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Yıl</label>
            <input
              type="number"
              className="form-control"
              placeholder="Model yılı"
              value={attributes.year || ''}
              onChange={(e) => handleAttributeChange('year', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Kilometre</label>
            <input
              type="number"
              className="form-control"
              placeholder="150000"
              value={attributes.mileage || ''}
              onChange={(e) => handleAttributeChange('mileage', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Genel özellikler (diğer kategoriler için)
  const renderGeneralAttributes = () => (
    <div className="mb-3">
      <h6>📦 Ürün Özellikleri</h6>
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Marka</label>
            <input
              type="text"
              className="form-control"
              placeholder="Marka adı"
              value={attributes.brand || ''}
              onChange={(e) => handleAttributeChange('brand', e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <div className="mb-3">
            <label className="form-label">Model</label>
            <input
              type="text"
              className="form-control"
              placeholder="Model"
              value={attributes.model || ''}
              onChange={(e) => handleAttributeChange('model', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Güven skoruna göre renk belirle
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'info';
    if (confidence >= 40) return 'warning';
    return 'danger';
  };

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🤖 Yapay Zeka Fiyat Tahmini</h5>
        {prediction && (
          <Badge 
            bg={getConfidenceColor(prediction.confidence)}
            className="ms-2"
          >
            %{prediction.confidence} Güven
          </Badge>
        )}
      </Card.Header>
      
      <Card.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        {!prediction && !loading && !showAttributeForm && (
          <div className="text-center mb-3">
            <p>Daha doğru fiyat tahmini için yapay zeka desteği alabilirsiniz.</p>
            <p className="text-muted small">Bu seçenek için ürün hakkında daha detaylı bilgi girmeniz gerekecek.</p>
            
            <Button 
              variant="primary" 
              onClick={() => setShowAttributeForm(true)}
              disabled={!productData?.category}
            >
              AI Fiyat Tahmini İste
            </Button>
          </div>
        )}

        {/* Özellik formu */}
        {showAttributeForm && !prediction && !loading && (
          <div>
            <Alert variant="info">
              <strong>🎯 AI için gerekli ek bilgiler:</strong><br/>
              Daha doğru tahmin için aşağıdaki bilgileri doldurun.
            </Alert>
            
            {renderDynamicAttributeForm()}
            
            <div className="d-flex gap-2">
              <Button 
                variant="success" 
                onClick={getPrediction}
              >
                Fiyat Tahminini Hesapla
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAttributeForm(false);
                  setAttributes({});
                }}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Benzer ürünler analiz ediliyor...</p>
            <p className="text-muted small">Yapay zeka modeli çalışıyor...</p>
          </div>
        )}
        
        {prediction && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="mb-0">{prediction.estimatedPrice.toLocaleString()} ₺</h3>
              <div className="text-muted">
                <small>
                  {prediction.priceRange.min.toLocaleString()} ₺ - {prediction.priceRange.max.toLocaleString()} ₺
                </small>
              </div>
            </div>
            
            {prediction.confidence > 0 && (
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Tahmin Güven Seviyesi</small>
                <ProgressBar 
                  now={prediction.confidence} 
                  variant={getConfidenceColor(prediction.confidence)}
                  label={`%${prediction.confidence}`}
                />
              </div>
            )}
            
            {/* ML kullanıldığını belirt */}
            <div className="mb-2">
              <Badge bg="info" className="me-2">Yapay Zeka ile Tahmin</Badge>
              <Badge bg="secondary">{prediction.analysis.method === 'linear-regression' ? 'Lineer Regresyon' : 'İstatistiksel Analiz'}</Badge>
            </div>
            
            <p className="text-muted mb-3">
              {prediction.analysis?.sampleSize || 0} benzer ürün analiz edilerek hesaplandı.
            </p>

            {/* Fiyatı uygula butonu - Daha görünür hale getiriyoruz */}
            <div className="mb-3">
              <Alert variant="success" className="p-2 text-center">
                <p className="mb-2"><strong>Tahmini fiyat hesaplandı!</strong></p>
                <Button 
                  variant="primary" 
                  className="btn-lg w-100"
                  onClick={() => {
                    if (onPredictionComplete) {
                      console.log("Bu Fiyatı Kullan butonuna tıklandı, fiyat aktarılıyor...");
                      onPredictionComplete(prediction);
                    }
                  }}
                >
                  <i className="bi bi-check-circle me-2"></i> Bu Fiyatı Kullan
                </Button>
              </Alert>
            </div>
            
            <Button 
              variant="link" 
              className="p-0" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Detayları Gizle' : 'Detayları Göster'}
            </Button>
            
            {showDetails && prediction.analysis && (
              <div className="mt-3">
                <h6>Detaylı Analiz</h6>
                <ul className="list-unstyled">
                  <li><strong>Ortalama Fiyat:</strong> {prediction.analysis.averagePrice?.toLocaleString() || '---'} ₺</li>
                  <li><strong>Medyan Fiyat:</strong> {prediction.analysis.medianPrice?.toLocaleString() || '---'} ₺</li>
                  <li><strong>Min Fiyat:</strong> {prediction.analysis.minPrice?.toLocaleString() || '---'} ₺</li>
                  <li><strong>Max Fiyat:</strong> {prediction.analysis.maxPrice?.toLocaleString() || '---'} ₺</li>
                  
                  {/* ML özellikleri detayları */}
                  {prediction.analysis?.features && prediction.analysis.features.length > 0 && (
                    <div className="mt-3">
                      <h6>Özellik Etkileri</h6>
                      {prediction.analysis.features.map((feature, idx) => (
                        <li key={feature.name || idx}>
                          <strong>{feature.name === 'storage' ? 'Depolama' : 
                                   feature.name === 'ram' ? 'RAM' :
                                   feature.name === 'brand' ? 'Marka' : 
                                   feature.name === 'processor' ? 'İşlemci' :
                                   feature.name === 'type' ? 'Cihaz Tipi' : 
                                   feature.name === 'size' ? 'Beden/Boyut' :
                                   feature.name === 'material' ? 'Malzeme' :
                                   feature.name === 'season' ? 'Sezon' :
                                   feature.name === 'sport' ? 'Spor Dalı' :
                                   feature.name === 'level' ? 'Seviye' :
                                   feature.name === 'year' ? 'Yıl' :
                                   feature.name === 'mileage' ? 'Kilometre' :
                                   feature.name === 'fuel' ? 'Yakıt' :
                                   feature.name}:</strong> {' '}
                          {feature.value} {' '}
                          <span className={feature.impact > 0 ? 'text-success' : feature.impact < 0 ? 'text-danger' : 'text-muted'}>
                            ({feature.impact > 0 ? '+' : ''}{feature.impact?.toLocaleString()} ₺)
                          </span>
                        </li>
                      ))}
                    </div>
                  )}
                  
                  {prediction.analysis.q1 && (
                    <>
                      <li><strong>1. Çeyrek Fiyat:</strong> {prediction.analysis.q1.toLocaleString()} ₺</li>
                      <li><strong>3. Çeyrek Fiyat:</strong> {prediction.analysis.q3.toLocaleString()} ₺</li>
                    </>
                  )}
                </ul>
                
                {prediction.similarProducts && prediction.similarProducts.length > 0 && (
                  <div className="mt-3">
                    <h6>Benzer Ürünler</h6>
                    <div className="similar-products">
                      {prediction.similarProducts.map((product, idx) => (
                        <div key={product.id || idx} className="similar-product mb-2 pb-2 border-bottom">
                          <div className="d-flex">
                            {product.imageUrl && (
                              <div className="me-2">
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.title}
                                  className="rounded"
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                            <div>
                              <div>{product.title}</div>
                              <div className="d-flex justify-content-between">
                                <div><strong>{product.price.toLocaleString()} ₺</strong></div>
                                <div className="text-muted">{product.condition}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PricePrediction; 