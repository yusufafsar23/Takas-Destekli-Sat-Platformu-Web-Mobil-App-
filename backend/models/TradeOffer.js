const mongoose = require('mongoose');

const tradeOfferSchema = new mongoose.Schema({
  offeredProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  requestedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  offeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  additionalCashOffer: {
    type: Number,
    default: 0,
    min: 0
  },
  message: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  isCounterOffer: {
    type: Boolean,
    default: false
  },
  originalOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeOffer'
  },
  offerExpiry: {
    type: Date, 
    default: function() {
      // Default expiry is 7 days from creation
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const TradeOffer = mongoose.model('TradeOffer', tradeOfferSchema);

module.exports = TradeOffer; 