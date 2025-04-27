const Category = require('../models/Category');
const { createError } = require('../middleware/errorHandler');
const slugify = require('slugify');
const mongoose = require('mongoose');

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = async (req, res) => {
  try {
    const { name, description, parentId, image, icon } = req.body;
    
    // Generate slug from name
    const slug = slugify(name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    // Check if a category with the same slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    
    // Check if parent category exists if parentId is provided
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }
    
    // Create new category
    const category = await Category.create({
      name,
      slug,
      description,
      parentId: parentId || null,
      image,
      icon,
      createdBy: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Creating category failed:', error);
    res.status(500).json({
      success: false,
      message: 'Creating category failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get all categories (with optional tree structure)
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res) => {
  try {
    const { format } = req.query;
    
    let categories;
    if (format === 'tree') {
      // Return tree structure
      categories = await Category.getCategoryTree();
    } else {
      // Return flat structure with basic parent info
      categories = await Category.find({})
        .populate('parentId', 'name slug')
        .sort({ name: 1 });
    }
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Fetching categories failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fetching categories failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get a category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }
    
    // Get the category with its subcategories
    const category = await Category.findById(categoryId)
      .populate({
        path: 'subcategories',
        select: 'name slug image icon'
      });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get category path (breadcrumbs)
    const path = await Category.getCategoryPath(categoryId);
    
    res.status(200).json({
      success: true,
      data: {
        category,
        path: path.map(item => ({
          _id: item._id,
          name: item.name,
          slug: item.slug
        }))
      }
    });
  } catch (error) {
    console.error('Fetching category failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fetching category failed',
      error: error.message
    });
  }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, parentId, image, icon, isActive } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }
    
    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if trying to set itself as parent
    if (parentId && parentId.toString() === categoryId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'A category cannot be its own parent'
      });
    }
    
    // Check if trying to set one of its descendants as parent (circular reference)
    if (parentId) {
      const descendants = await Category.getSubcategories(categoryId);
      const descendantIds = descendants.map(d => d._id.toString());
      if (descendantIds.includes(parentId.toString())) {
        return res.status(400).json({
          success: false,
          message: 'Cannot set a descendant as parent (circular reference)'
        });
      }
    }
    
    // Update slug if name is changed
    let updateData = { description, parentId, image, icon, isActive };
    if (name && name !== category.name) {
      const slug = slugify(name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });
      
      // Check if new slug already exists
      const existingCategory = await Category.findOne({ 
        slug, 
        _id: { $ne: categoryId }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists'
        });
      }
      
      updateData = { ...updateData, name, slug };
    }
    
    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true, runValidators: true }
    ).populate('parentId', 'name slug');
    
    res.status(200).json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Updating category failed:', error);
    res.status(500).json({
      success: false,
      message: 'Updating category failed',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }
    
    // Check if the category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if the category has subcategories
    const subcategories = await Category.find({ parentId: categoryId });
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Delete the subcategories first or move them to another category.'
      });
    }
    
    // Delete the category
    await Category.findByIdAndDelete(categoryId);
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Deleting category failed:', error);
    res.status(500).json({
      success: false,
      message: 'Deleting category failed',
      error: error.message
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
}; 