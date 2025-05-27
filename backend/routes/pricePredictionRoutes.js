const express = require('express');
const router = express.Router();
const { 
  getPricePrediction, 
  trainModels,
  getModelStatus,
  getCategoryAttributes
} = require('../controllers/pricePredictionController');
const { protect, admin } = require('../middleware/authMiddleware');

// Fiyat tahmini için endpoint - Public
router.post('/', getPricePrediction);

// Kategori özellikleri için endpoint - Public
router.get('/attributes/:categoryId', getCategoryAttributes);

// ML modelleri yönetim endpointleri - Admin only
router.post('/train', protect, admin, trainModels);
router.get('/status', protect, admin, getModelStatus);

module.exports = router; 