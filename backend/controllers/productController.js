const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadBase64Image, uploadBufferImage, deleteImage } = require('../utils/cloudinaryService');
const { createError } = require('../middleware/errorHandler');

/**
 * Ürün oluşturma
 * @route POST /api/products
 * @access Private
 */
const createProduct = async (req, res, next) => {
    try {
        const { 
            title, 
            description, 
            price, 
            category, 
            subcategory, 
            condition, 
            location, 
            coordinates,
            acceptsTradeOffers,
            tradePreferences,
            tags,
            attributes
        } = req.body;

        // Kategori doğrulama
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return next(createError('Geçersiz kategori.', 400, 'INVALID_CATEGORY'));
        }

        // Alt kategori belirtilmişse doğrula
        if (subcategory) {
            const subcategoryExists = await Category.findById(subcategory);
            if (!subcategoryExists || subcategoryExists.parent?.toString() !== category) {
                return next(createError('Geçersiz alt kategori.', 400, 'INVALID_SUBCATEGORY'));
            }
        }

        // Base64 formatında resimler
        let processedImages = [];
        if (req.body.images && Array.isArray(req.body.images)) {
            // Base64 formatında resim dizisi
            const imagePromises = req.body.images.map(async (image, index) => {
                if (image.startsWith('data:image')) {
                    const result = await uploadBase64Image(image, 'products');
                    return {
                        url: result.url,
                        publicId: result.publicId,
                        width: result.width,
                        height: result.height,
                        isCover: index === 0 // İlk resim varsayılan olarak kapak
                    };
                }
                return null;
            });
            
            processedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
        }
        
        // File upload ile gelen resimler
        if (req.files && Array.isArray(req.files)) {
            const filePromises = req.files.map(async (file, index) => {
                const result = await uploadBufferImage(file.buffer, 'products');
                return {
                    url: result.url,
                    publicId: result.publicId,
                    width: result.width,
                    height: result.height,
                    isCover: index === 0 && processedImages.length === 0 // Daha önce resim yoksa ilk dosya kapak
                };
            });
            
            const fileImages = await Promise.all(filePromises);
            processedImages = [...processedImages, ...fileImages];
        }
        
        // Ürün oluşturma
        const product = new Product({
            title,
            description,
            price,
            category,
            subcategory,
            condition,
            images: processedImages,
            location,
            coordinates,
            owner: req.user._id,
            acceptsTradeOffers: acceptsTradeOffers || false,
            tradePreferences: tradePreferences || {},
            tags: tags || [],
            attributes: attributes || {}
        });
        
        await product.save();
        
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ürünleri listeleme ve filtreleme
 * @route GET /api/products
 * @access Public
 */
const getProducts = async (req, res, next) => {
    try {
        const { 
            search, 
            category, 
            subcategory, 
            minPrice, 
            maxPrice, 
            condition, 
            location, 
            acceptsTradeOffers,
            status,
            owner,
            sort,
            page = 1,
            limit = 12
        } = req.query;
        
        // Filtreleme koşulları
        const query = {};
        
        // Arama sorgusu
        if (search) {
            query.$text = { $search: search };
        }
        
        // Kategori filtresi
        if (category) {
            query.category = category;
        }
        
        // Alt kategori filtresi
        if (subcategory) {
            query.subcategory = subcategory;
        }
        
        // Fiyat aralığı filtresi
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        
        // Durumu filtresi
        if (condition) {
            query.condition = condition;
        }
        
        // Konum filtresi
        if (location) {
            query.location = { $regex: location, $options: 'i' };
        }
        
        // Takas teklifi kabul filtresi
        if (acceptsTradeOffers === 'true') {
            query.acceptsTradeOffers = true;
        }
        
        // Ürün durumu filtresi
        if (status) {
            query.status = status;
        } else {
            // Varsayılan olarak sadece aktif ürünleri göster
            query.status = 'active';
        }
        
        // Kullanıcı filtresi
        if (owner) {
            query.owner = owner;
        }
        
        // Sayfalama
        const skip = (page - 1) * limit;
        
        // Sıralama
        let sortOptions = { createdAt: -1 }; // Varsayılan: en yeni
        
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    sortOptions = { price: 1 };
                    break;
                case 'price_desc':
                    sortOptions = { price: -1 };
                    break;
                case 'title_asc':
                    sortOptions = { title: 1 };
                    break;
                case 'views_desc':
                    sortOptions = { views: -1 };
                    break;
                case 'oldest':
                    sortOptions = { createdAt: 1 };
                    break;
                // Varsayılan: en yeni
                default:
                    sortOptions = { createdAt: -1 };
            }
        }
        
        // Toplam ürün sayısını hesapla
        const totalProducts = await Product.countDocuments(query);
        
        // Ürünleri getir
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('owner', 'username profilePicture')
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .populate('tradePreferences.preferredCategories', 'name slug');
        
        res.status(200).json({
            success: true,
            count: products.length,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: page,
            data: products
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ürün detayı getirme
 * @route GET /api/products/:id
 * @access Public
 */
const getProduct = async (req, res, next) => {
    try {
        let productQuery = Product.findById(req.params.id)
            .populate('owner', 'username profilePicture email')
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .populate('tradePreferences.preferredCategories', 'name slug');
            
        // Kullanıcı girişi yapmışsa favorileri kontrol et
        if (req.user) {
            productQuery = productQuery.populate({
                path: 'favoritesByUsers',
                match: { _id: req.user._id },
                select: '_id'
            });
        }
            
        const product = await productQuery;
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Görüntülenme sayacını artır
        product.views = product.views + 1;
        await product.save();
        
        // Kullanıcının favorilerde olup olmadığını kontrol et
        const isFavorited = req.user && product.favoritesByUsers && product.favoritesByUsers.length > 0;
        
        // Benzer ürünleri getir (aynı kategorideki son ürünler)
        const similarProducts = await Product.find({
            _id: { $ne: product._id },
            category: product.category,
            status: 'active'
        })
        .limit(4)
        .sort({ createdAt: -1 })
        .select('title price condition images slug');
        
        res.status(200).json({
            success: true,
            data: product,
            isFavorited,
            similarProducts
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Slug ile ürün detayı getirme
 * @route GET /api/products/slug/:slug
 * @access Public
 */
const getProductBySlug = async (req, res, next) => {
    try {
        let productQuery = Product.findOne({ slug: req.params.slug })
            .populate('owner', 'username profilePicture email')
            .populate('category', 'name slug')
            .populate('subcategory', 'name slug')
            .populate('tradePreferences.preferredCategories', 'name slug');
            
        // Kullanıcı girişi yapmışsa favorileri kontrol et
        if (req.user) {
            productQuery = productQuery.populate({
                path: 'favoritesByUsers',
                match: { _id: req.user._id },
                select: '_id'
            });
        }
            
        const product = await productQuery;
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Görüntülenme sayacını artır
        product.views = product.views + 1;
        await product.save();
        
        // Kullanıcının favorilerde olup olmadığını kontrol et
        const isFavorited = req.user && product.favoritesByUsers && product.favoritesByUsers.length > 0;
        
        // Benzer ürünleri getir (aynı kategorideki son ürünler)
        const similarProducts = await Product.find({
            _id: { $ne: product._id },
            category: product.category,
            status: 'active'
        })
        .limit(4)
        .sort({ createdAt: -1 })
        .select('title price condition images slug');
        
        res.status(200).json({
            success: true,
            data: product,
            isFavorited,
            similarProducts
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ürün güncelleme
 * @route PUT /api/products/:id
 * @access Private
 */
const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Ürün sahibi değilse engelle
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return next(createError('Bu işlem için yetkiniz bulunmuyor.', 403, 'UNAUTHORIZED_ACTION'));
        }
        
        const { 
            title, 
            description, 
            price, 
            category, 
            subcategory, 
            condition, 
            location, 
            coordinates,
            acceptsTradeOffers,
            tradePreferences,
            status,
            tags,
            attributes,
            images: newImages,
            imagesToRemove
        } = req.body;
        
        // Kategori değişiyorsa doğrula
        if (category && category !== product.category.toString()) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return next(createError('Geçersiz kategori.', 400, 'INVALID_CATEGORY'));
            }
        }
        
        // Alt kategori değişiyorsa doğrula
        if (subcategory && subcategory !== product.subcategory?.toString()) {
            const subcategoryExists = await Category.findById(subcategory);
            const categoryId = category || product.category.toString();
            
            if (!subcategoryExists || subcategoryExists.parent?.toString() !== categoryId) {
                return next(createError('Geçersiz alt kategori.', 400, 'INVALID_SUBCATEGORY'));
            }
        }
        
        // Yeni resimleri işle (base64 formatı)
        let processedImages = [...product.images];
        
        // Kaldırılacak resimleri sil
        if (imagesToRemove && Array.isArray(imagesToRemove)) {
            // Cloudinary'den sil
            const deletePromises = imagesToRemove.map(async (imageId) => {
                const image = product.images.find(img => img._id.toString() === imageId);
                if (image && image.publicId) {
                    await deleteImage(image.publicId);
                }
                return imageId;
            });
            
            await Promise.all(deletePromises);
            
            // Ürün nesnesinden kaldır
            processedImages = processedImages.filter(img => !imagesToRemove.includes(img._id.toString()));
        }
        
        // Yeni resimleri ekle (base64)
        if (newImages && Array.isArray(newImages)) {
            const imagePromises = newImages.map(async (image) => {
                if (image.startsWith('data:image')) {
                    const result = await uploadBase64Image(image, 'products');
                    return {
                        url: result.url,
                        publicId: result.publicId,
                        width: result.width,
                        height: result.height,
                        isCover: processedImages.length === 0 // Resim yoksa kapak olarak işaretle
                    };
                }
                return null;
            });
            
            const uploadedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
            processedImages = [...processedImages, ...uploadedImages];
        }
        
        // File upload ile gelen yeni resimler
        if (req.files && Array.isArray(req.files)) {
            const filePromises = req.files.map(async (file) => {
                const result = await uploadBufferImage(file.buffer, 'products');
                return {
                    url: result.url,
                    publicId: result.publicId,
                    width: result.width,
                    height: result.height,
                    isCover: processedImages.length === 0 // Resim yoksa kapak olarak işaretle
                };
            });
            
            const fileImages = await Promise.all(filePromises);
            processedImages = [...processedImages, ...fileImages];
        }
        
        // En az bir resim olmasını sağla
        if (processedImages.length === 0) {
            return next(createError('Ürün için en az bir resim gereklidir.', 400, 'NO_PRODUCT_IMAGES'));
        }
        
        // Kapak resmini ayarla
        if (req.body.coverImageId) {
            processedImages = processedImages.map(img => ({
                ...img,
                isCover: img._id.toString() === req.body.coverImageId
            }));
        } else if (!processedImages.some(img => img.isCover)) {
            // Kapak resmi yoksa ilkini kapak yap
            if (processedImages.length > 0) {
                processedImages[0].isCover = true;
            }
        }
        
        // Ürünü güncelle
        product.title = title || product.title;
        product.description = description || product.description;
        product.price = price !== undefined ? price : product.price;
        product.category = category || product.category;
        product.subcategory = subcategory || product.subcategory;
        product.condition = condition || product.condition;
        product.images = processedImages;
        product.location = location || product.location;
        
        if (coordinates) {
            product.coordinates = coordinates;
        }
        
        product.acceptsTradeOffers = acceptsTradeOffers !== undefined ? acceptsTradeOffers : product.acceptsTradeOffers;
        
        if (tradePreferences) {
            product.tradePreferences = {
                ...product.tradePreferences,
                ...tradePreferences
            };
        }
        
        if (status && ['active', 'sold', 'reserved', 'inactive'].includes(status)) {
            product.status = status;
        }
        
        if (tags) {
            product.tags = tags;
        }
        
        if (attributes) {
            product.attributes = attributes;
        }
        
        product.updatedAt = Date.now();
        
        await product.save();
        
        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ürün silme
 * @route DELETE /api/products/:id
 * @access Private
 */
const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Ürün sahibi değilse veya admin değilse engelle
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return next(createError('Bu işlem için yetkiniz bulunmuyor.', 403, 'UNAUTHORIZED_ACTION'));
        }
        
        // Cloudinary'den resimleri sil
        const deletePromises = product.images.map(async (image) => {
            if (image.publicId) {
                await deleteImage(image.publicId);
            }
        });
        
        await Promise.all(deletePromises);
        
        // Ürünü sil
        await product.remove();
        
        res.status(200).json({
            success: true,
            message: 'Ürün başarıyla silindi.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ürünü favorilere ekle/çıkar
 * @route POST /api/products/:id/favorite
 * @access Private
 */
const toggleFavorite = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Kullanıcının favori ürünlerini kontrol et
        const user = req.user;
        const isFavorited = user.favorites.includes(req.params.id);
        
        if (isFavorited) {
            // Favorilerden çıkar
            user.favorites = user.favorites.filter(id => id.toString() !== req.params.id);
            product.favorites = Math.max(0, product.favorites - 1);
        } else {
            // Favorilere ekle
            user.favorites.push(req.params.id);
            product.favorites = product.favorites + 1;
        }
        
        await user.save();
        await product.save();
        
        res.status(200).json({
            success: true,
            favorited: !isFavorited,
            favoritesCount: product.favorites
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Öne çıkarılmış ürünleri getir
 * @route GET /api/products/featured
 * @access Public
 */
const getFeaturedProducts = async (req, res, next) => {
    try {
        const featuredProducts = await Product.find({ 
            status: 'active',
            isPromoted: true,
            promotionExpiry: { $gt: new Date() }
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('owner', 'username profilePicture')
        .populate('category', 'name slug');
        
        res.status(200).json({
            success: true,
            count: featuredProducts.length,
            data: featuredProducts
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Kullanıcının ürünlerini getir
 * @route GET /api/products/user/:userId
 * @access Public
 */
const getUserProducts = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { status, page = 1, limit = 12 } = req.query;
        
        const query = { owner: userId };
        
        // Statüs filtresi (kendi ürünleriyse tüm statüdeki ürünleri görebilir)
        if (status && (req.user && req.user._id.toString() === userId)) {
            query.status = status;
        } else {
            // Başkasının ürünleriyse sadece aktif olanları görebilir
            query.status = 'active';
        }
        
        // Sayfalama
        const skip = (page - 1) * limit;
        
        // Toplam ürün sayısını hesapla
        const totalProducts = await Product.countDocuments(query);
        
        // Ürünleri getir
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('category', 'name slug');
        
        res.status(200).json({
            success: true,
            count: products.length,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: parseInt(page),
            data: products
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    getProductBySlug,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    getFeaturedProducts,
    getUserProducts
}; 