const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    updateProfile, 
    changePassword,
    getProfile,
    getAllUsers,
    updateUserPermissions
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const { authorize, checkEmailVerified } = require('../middleware/authorize');

// Public routes (Kimlik doğrulama gerektirmeyen)
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/logout', logout);

// Protected routes (Kimlik doğrulama gerektiren)
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);
router.post('/change-password', auth, changePassword);

// Admin routes (Sadece admin yetkisi olan kullanıcılar için)
router.get('/admin/users', auth, authorize('admin'), getAllUsers);
router.patch('/admin/users/:userId/permissions', auth, authorize('admin'), updateUserPermissions);

// Features that require email verification (E-posta doğrulaması gerektiren özellikler)
// Örnek: router.post('/feature-requiring-verification', auth, checkEmailVerified(), featureController);

module.exports = router; 