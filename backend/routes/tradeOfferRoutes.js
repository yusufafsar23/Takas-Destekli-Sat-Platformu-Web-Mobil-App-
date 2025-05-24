const express = require('express');
const router = express.Router();
const { 
    createTradeOffer, 
    getReceivedTradeOffers, 
    getSentTradeOffers, 
    getAllTradeOffers, 
    getTradeOfferById, 
    acceptTradeOffer, 
    rejectTradeOffer, 
    cancelTradeOffer, 
    createCounterOffer, 
    getUserTradeHistory, 
    completeTradeOffer, 
    getSmartMatchesForProduct,
    getMyTradeOffers 
} = require('../controllers/tradeOfferController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Genel route'lar (Admin için)
router.get('/all', auth, authorize('admin'), getAllTradeOffers);

// Kullanıcı takas teklifleri
router.get('/received', auth, getReceivedTradeOffers);
router.get('/sent', auth, getSentTradeOffers);
router.get('/my-offers', auth, getMyTradeOffers);
router.get('/history', auth, getUserTradeHistory);
router.get('/user/:userId/history', auth, getUserTradeHistory);

// Teklif detayı ve işlemler
router.get('/:id', auth, getTradeOfferById);
router.post('/', auth, createTradeOffer);
router.post('/counter-offer', auth, createCounterOffer);
router.put('/:id/accept', auth, acceptTradeOffer);
router.put('/:id/reject', auth, rejectTradeOffer);
router.put('/:id/cancel', auth, cancelTradeOffer);
router.put('/:id/complete', auth, completeTradeOffer);

// Akıllı eşleştirme
router.get('/smart-matches/:productId', auth, getSmartMatchesForProduct);

module.exports = router; 