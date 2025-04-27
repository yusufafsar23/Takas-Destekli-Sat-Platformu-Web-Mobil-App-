const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProduct,
    getProductBySlug,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    getFeaturedProducts,
    getUserProducts
} = require('../controllers/productController');
const auth = require('../middleware/auth');
const { singleUpload, multipleUpload } = require('../middleware/uploadMiddleware');

// Halka açık rotalar
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/user/:userId', getUserProducts);
router.get('/:id', getProduct);

// Koruma gerektiren rotalar
router.post('/', auth, multipleUpload, createProduct);
router.put('/:id', auth, multipleUpload, updateProduct);
router.delete('/:id', auth, deleteProduct);
router.post('/:id/favorite', auth, toggleFavorite);

module.exports = router; 