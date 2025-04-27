const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

// Get category tree from database
categorySchema.statics.getCategoryTree = async function() {
  // Get all categories
  const categories = await this.find({}).lean();
  
  // Create a map for quick lookup
  const categoryMap = {};
  categories.forEach(category => {
    categoryMap[category._id.toString()] = {
      ...category,
      children: []
    };
  });
  
  // Build the tree
  const rootCategories = [];
  categories.forEach(category => {
    if (category.parentId) {
      const parentId = category.parentId.toString();
      if (categoryMap[parentId]) {
        categoryMap[parentId].children.push(categoryMap[category._id.toString()]);
      }
    } else {
      rootCategories.push(categoryMap[category._id.toString()]);
    }
  });
  
  return rootCategories;
};

// Get main categories with their immediate children
categorySchema.statics.getMainCategories = async function() {
  const mainCategories = await this.find({ parentId: null })
    .populate({
      path: 'subcategories',
      select: 'name slug image icon'
    })
    .lean();
  
  return mainCategories;
};

// Get subcategories of a specific category
categorySchema.statics.getSubcategories = async function(categoryId) {
  return await this.find({ parentId: categoryId }).lean();
};

// Get full path from root to this category
categorySchema.statics.getCategoryPath = async function(categoryId) {
  const path = [];
  let currentCategory = await this.findById(categoryId).lean();
  
  if (!currentCategory) return path;
  
  path.unshift(currentCategory);
  
  while (currentCategory.parentId) {
    const parent = await this.findById(currentCategory.parentId).lean();
    if (!parent) break;
    
    path.unshift(parent);
    currentCategory = parent;
  }
  
  return path;
};

// Find categories matching a search query
categorySchema.statics.searchCategories = async function(query) {
  if (!query) return [];
  
  const regex = new RegExp(query, 'i');
  return await this.find({
    $or: [
      { name: { $regex: regex } },
      { description: { $regex: regex } }
    ]
  }).limit(10).lean();
};

// Index for faster querying
categorySchema.index({ parentId: 1 });
categorySchema.index({ name: 'text', description: 'text' });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 