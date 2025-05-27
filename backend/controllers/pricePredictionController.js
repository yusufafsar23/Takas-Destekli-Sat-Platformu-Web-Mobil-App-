const mlPriceService = require('../utils/mlPricePredictionService');
const { createError } = require('../middleware/errorHandler');

/**
 * Ürün özelliklerine göre yapay zeka tabanlı fiyat tahmini yap
 * @route POST /api/price-prediction
 * @access Public
 */
const getPricePrediction = async (req, res, next) => {
  try {
    const {
      category,
      subcategory,
      condition,
      attributes,
      title,
      description
    } = req.body;

    // Kategori kontrol et
    if (!category) {
      return next(createError('Kategori gereklidir.', 400, 'MISSING_CATEGORY'));
    }

    console.log('Yapay zeka (ML) tabanlı fiyat tahmini istendi:', {
      category,
      subcategory,
      condition,
      attributes
    });

    // ML tabanlı tahmin servisini çağır
    const prediction = await mlPriceService.predictPrice({
      category,
      subcategory,
      condition,
      attributes,
      title,
      description
    });

    res.status(200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('ML Fiyat tahmini hatası:', error);
    next(error);
  }
};

/**
 * Tüm kategoriler için ML modellerini yeniden eğit
 * @route POST /api/price-prediction/train
 * @access Admin
 */
const trainModels = async (req, res, next) => {
  try {
    console.log('ML modellerini eğitme isteği alındı');
    
    // Eğitim işlemini başlat
    const result = await mlPriceService.forceTrainAllModels();
    
    res.status(200).json({
      success: result.success,
      message: result.success ? 
        'Model eğitimi başarıyla tamamlandı' : 
        result.message,
      data: result.results
    });
  } catch (error) {
    console.error('ML Model eğitimi hatası:', error);
    next(error);
  }
};

/**
 * ML model durumunu kontrol et
 * @route GET /api/price-prediction/status
 * @access Admin
 */
const getModelStatus = async (req, res, next) => {
  try {
    const status = mlPriceService.getModelTrainingStatus();
    
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('ML Model durum kontrolü hatası:', error);
    next(error);
  }
};

/**
 * Kategori için gereken özellikleri al
 * @route GET /api/price-prediction/attributes/:categoryId
 * @access Public
 */
const getCategoryAttributes = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    
    if (!categoryId) {
      return next(createError('Kategori ID gereklidir.', 400, 'MISSING_CATEGORY_ID'));
    }
    
    // Kategori için gerekli özellikleri al
    const attributes = await mlPriceService.getRequiredAttributesForCategory(categoryId);
    
    res.status(200).json({
      success: true,
      data: attributes
    });
  } catch (error) {
    console.error('Kategori özellikleri alma hatası:', error);
    next(error);
  }
};

module.exports = {
  getPricePrediction,
  trainModels,
  getModelStatus,
  getCategoryAttributes
}; 