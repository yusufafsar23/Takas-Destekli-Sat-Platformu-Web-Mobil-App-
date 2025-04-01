const express = require('express');
const router = express.Router();
const { createProduct, getProducts, getProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const auth = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes
router.post('/', auth, createProduct);
router.patch('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router; 