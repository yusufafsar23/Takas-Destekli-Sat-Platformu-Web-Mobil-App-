const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Elektronik', 
      'Giyim', 
      'Ev Eşyaları', 
      'Kitaplar', 
      'Spor', 
      'Hobi', 
      'Mobilya', 
      'Otomobil', 
      'Emlak', 
      'Diğer'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    required: true,
    enum: ['Yeni', 'Yeni Gibi', 'İyi', 'Makul', 'Kötü']
  },
  images: [String],
  location: {
    type: String,
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptsTradeOffers: {
    type: Boolean,
    default: false
  },
  tradePreferences: {
    acceptsAnyTrade: {
      type: Boolean,
      default: false
    },
    preferredCategories: [{
      type: String,
      enum: [
        'Elektronik', 
        'Giyim', 
        'Ev Eşyaları', 
        'Kitaplar', 
        'Spor', 
        'Hobi', 
        'Mobilya', 
        'Otomobil', 
        'Emlak', 
        'Diğer'
      ]
    }],
    minTradeValuePercentage: {
      type: Number,
      min: 0,
      max: 200, // Percentage of the product's value
      default: 100
    }
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'reserved', 'inactive'],
    default: 'active'
  },
  isPromoted: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
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

// Index for search functionality
productSchema.index({ 
  title: 'text', 
  description: 'text',
  category: 'text',
  subcategory: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 