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
  responseMessage: {
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
  counterOffers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeOffer'
  }],
  specialConditions: {
    meetupPreferred: {
      type: Boolean,
      default: false
    },
    meetupLocation: {
      type: String,
      trim: true
    },
    shippingPreferred: {
      type: Boolean,
      default: false
    },
    shippingDetails: {
      type: String,
      trim: true
    },
    additionalNotes: {
      type: String,
      maxlength: 1000
    }
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
  completedDate: {
    type: Date
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Sanal alan: Teklif geçerli mi?
tradeOfferSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && new Date() < this.offerExpiry;
});

// Sanal alan: Teklifin kalan süresi (gün)
tradeOfferSchema.virtual('daysRemaining').get(function() {
  if (this.status !== 'pending') return 0;
  
  const today = new Date();
  const expiry = new Date(this.offerExpiry);
  
  if (today > expiry) return 0;
  
  const diffTime = Math.abs(expiry - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

const TradeOffer = mongoose.model('TradeOffer', tradeOfferSchema);

module.exports = TradeOffer; 