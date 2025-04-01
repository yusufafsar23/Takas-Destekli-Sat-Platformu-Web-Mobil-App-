const express = require('express');
const router = express.Router();
const { createTradeOffer, getTradeOffers, getTradeOffer, updateTradeOffer } = require('../controllers/tradeOfferController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', getTradeOffers);
router.get('/:id', getTradeOffer);

// Protected routes
router.post('/', auth, createTradeOffer);
router.patch('/:id', auth, updateTradeOffer);

module.exports = router; 