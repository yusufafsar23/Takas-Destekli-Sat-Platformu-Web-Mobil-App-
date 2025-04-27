const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    lowercase: true,
    unique: true,
    index: true
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  condition: {
    type: String,
    required: true,
    enum: ['Yeni', 'Yeni Gibi', 'İyi', 'Makul', 'Kötü']
  },
  images: [{
    url: String,
    publicId: String,
    width: Number,
    height: Number,
    isCover: {
      type: Boolean,
      default: false
    }
  }],
  location: {
    type: String,
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  owner: {
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    minTradeValuePercentage: {
      type: Number,
      min: 0,
      max: 200, // Percentage of the product's value
      default: 100
    },
    description: {
      type: String,
      trim: true
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
  promotionExpiry: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  attributes: {
    type: Map,
    of: String
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

// Coğrafi indeks oluşturma
productSchema.index({ coordinates: '2dsphere' });

// Arama için indeks
productSchema.index({ 
  title: 'text', 
  description: 'text',
  tags: 'text'
});

// Slug oluşturma (pre-save hook)
productSchema.pre('save', async function(next) {
  if (!this.isModified('title')) {
    return next();
  }

  const baseSlug = this.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Slug benzersizliğini kontrol et
  let slug = baseSlug;
  let counter = 1;
  let existingProduct = await this.constructor.findOne({ slug });
  
  // Eğer aynı slug varsa, sayı ekleyerek benzersiz hale getir
  while (existingProduct) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    existingProduct = await this.constructor.findOne({ slug });
  }
  
  this.slug = slug;
  next();
});

// Kapak resmi için sanal alan
productSchema.virtual('coverImage').get(function() {
  if (this.images && this.images.length > 0) {
    // İlk olarak isCover true olan resmi bul
    const coverImage = this.images.find(img => img.isCover);
    
    // Yoksa ilk resmi döndür
    return coverImage || this.images[0];
  }
  return null;
});

// Favorilere eklenmiş kullanıcıları getirmek için sanal alan
productSchema.virtual('favoritesByUsers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'favorites'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 