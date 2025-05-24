const Product = require('../models/Product');
const Category = require('../models/Category');
// Cloudinary servisini yorum satırı haline getir
// const { uploadBase64Image, uploadBufferImage, deleteImage } = require('../utils/cloudinaryService');
// Yerel depolama servisini kullan
const { saveBase64Image, saveBufferImage, deleteImage } = require('../utils/localImageStorage');
const { createError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

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
                    try {
                        // Yerel depolama ile resmi kaydet
                        const result = await saveBase64Image(image);
                        return {
                            url: result.url,
                            filename: result.filename,
                            isCover: index === 0 // İlk resim varsayılan olarak kapak
                        };
                    } catch (error) {
                        console.error("Base64 image save error:", error);
                        return null;
                    }
                }
                return null;
            });
            
            processedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
        }
        
        // File upload ile gelen resimler
        if (req.files && Array.isArray(req.files)) {
            console.log(`Processing ${req.files.length} uploaded files in createProduct`);
            
            const filePromises = req.files.map(async (file, index) => {
                try {
                    console.log(`Processing file ${index + 1}: ${file.originalname}, ${file.mimetype}, ${file.size} bytes`);
                    
                    // Eğer dosya zaten URL içeriyorsa
                    if (file.url) {
                        console.log(`File ${index + 1} already has URL:`, file.url);
                        return {
                            url: file.url,
                            filename: file.filename,
                            isCover: index === 0 && processedImages.length === 0
                        };
                    }
                    
                    // Yerel depolama ile resmi kaydet
                    const result = await saveBufferImage(file.buffer, file.mimetype);
                    console.log(`File ${index + 1} processed:`, result);
                    
                    return {
                        url: result.url,
                        filename: result.filename,
                        isCover: index === 0 && processedImages.length === 0 // Daha önce resim yoksa ilk dosya kapak
                    };
                } catch (error) {
                    console.error(`Error processing file ${index + 1}:`, error);
                    return null;
                }
            });
            
            const fileImages = await Promise.all(filePromises);
            const validImages = fileImages.filter(img => img !== null);
            console.log(`Successfully processed ${validImages.length} of ${req.files.length} files`);
            
            processedImages = [...processedImages, ...validImages];
        } else {
            console.log("No files found in request");
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
        console.error("Product creation error:", error);
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
            limit = 12,
            count
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
        
        // Toplam ürün sayısı
        const total = await Product.countDocuments(query);
        
        // Eğer sadece sayım isteniyorsa, detaya gerek yok
        if (count === 'true' || count === true) {
            console.log(`Category count request - Found ${total} products matching query:`, query);
            return res.status(200).json({
                success: true,
                total,
                count: total,
                data: []
            });
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
                case 'title_desc':
                    sortOptions = { title: -1 };
                    break;
                case 'views':
                    sortOptions = { views: -1 };
                    break;
            }
        }
        
        // Toplam ürün sayısını hesapla
        const totalProducts = await Product.countDocuments(query);
        
        // Ürünleri getir
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))
            .populate('owner', 'username profilePicture')
            .populate('category', 'name');

        // Debugging log
        console.log("Sending products response:", {
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            productsCount: products.length
        });
        
        // İlk ürünün görüntü yapısını loglama
        if (products.length > 0) {
            console.log("First product images structure:", products[0].images);
        }

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
        console.log("Getting product details for ID:", req.params.id);
        
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
            console.log("Product not found for ID:", req.params.id);
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Detaylı ürün içeriğini logla
        console.log("Product found:", {
            id: product._id,
            title: product.title,
            description: product.description ? product.description.substring(0, 50) + "..." : "No description",
            hasImages: product.images && product.images.length > 0,
            imageCount: product.images ? product.images.length : 0,
            owner: product.owner ? { 
                id: product.owner._id,
                username: product.owner.username 
            } : 'No owner data',
            category: product.category ? {
                id: product.category._id,
                name: product.category.name
            } : 'No category data'
        });
        
        // Resimleri detaylı logla
        if (product.images && product.images.length > 0) {
            product.images.forEach((image, index) => {
                console.log(`Image ${index + 1}:`, {
                    url: image.url || "No URL",
                    filename: image.filename || "No filename",
                    type: typeof image,
                    isString: typeof image === 'string',
                    keys: typeof image === 'object' ? Object.keys(image) : []
                });
            });
        } else {
            console.log("Product has no images");
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
        
        console.log("Sending product response with status 200");
        
        res.status(200).json({
            success: true,
            data: product,
            isFavorited,
            similarProducts
        });
    } catch (error) {
        console.error("Error getting product details:", error);
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
        console.log("Getting product details for slug:", req.params.slug);
        
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
            console.log("Product not found for slug:", req.params.slug);
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Detaylı ürün içeriğini logla
        console.log("Product found by slug:", {
            id: product._id,
            title: product.title,
            hasImages: product.images && product.images.length > 0,
            imageCount: product.images ? product.images.length : 0,
            owner: product.owner ? product.owner.username : 'No owner'
        });
        
        // Resimleri detaylı logla
        if (product.images && product.images.length > 0) {
            product.images.forEach((image, index) => {
                console.log(`Image ${index + 1} for product ${product.title}:`, {
                    url: image.url || "No URL",
                    filename: image.filename || "No filename",
                    type: typeof image,
                    isString: typeof image === 'string',
                    keys: typeof image === 'object' ? Object.keys(image) : []
                });
            });
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
        
        console.log("Sending product response with status 200");
        
        res.status(200).json({
            success: true,
            data: product,
            isFavorited,
            similarProducts
        });
    } catch (error) {
        console.error("Error getting product by slug:", error);
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
        const { id } = req.params;
        
        // Ürünü bul
        const product = await Product.findById(id);
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Ürün sahibi değilse veya admin değilse engelle
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
            imagesToRemove
        } = req.body;
        
        // Kategori değişiyorsa doğrula
        let categoryId = undefined;
        if (category && category !== product.category.toString()) {
            try {
                // Check if the category is a string name rather than an ID
                if (category && !mongoose.Types.ObjectId.isValid(category)) {
                    console.log(`Category appears to be a name, not an ID: "${category}"`);
                    // Try to find the category by name
                    const categoryByName = await Category.findOne({ name: category });
                    if (categoryByName) {
                        console.log(`Found category by name: ${categoryByName.name}, ID: ${categoryByName._id}`);
                        categoryId = categoryByName._id;
                    } else {
                        return next(createError(`Kategori bulunamadı: ${category}`, 400, 'INVALID_CATEGORY'));
                    }
                } else {
                    const categoryExists = await Category.findById(category);
                    if (!categoryExists) {
                        return next(createError('Geçersiz kategori.', 400, 'INVALID_CATEGORY'));
                    }
                    categoryId = category;
                }
            } catch (error) {
                console.error("Category validation error:", error);
                return next(createError(`Kategori işlenirken hata oluştu: ${error.message}`, 400, 'CATEGORY_PROCESSING_ERROR'));
            }
        }
        
        // Alt kategori değişiyorsa doğrula
        let subcategoryId = undefined;
        if (subcategory && subcategory !== product.subcategory?.toString()) {
            const subcategoryExists = await Category.findById(subcategory);
            const parentCategoryId = categoryId || product.category.toString();
            
            if (!subcategoryExists || subcategoryExists.parent?.toString() !== parentCategoryId) {
                return next(createError('Geçersiz alt kategori.', 400, 'INVALID_SUBCATEGORY'));
            }
            subcategoryId = subcategory;
        }
        
        // Mevcut resimleri saklayalım
        let processedImages = [...product.images];
        
        // Kaldırılacak resimleri sil
        if (imagesToRemove && Array.isArray(imagesToRemove)) {
            // Disk'ten sil
            const deletePromises = imagesToRemove.map(async (imageId) => {
                const image = product.images.find(img => img._id.toString() === imageId);
                if (image && image.url) {
                    try {
                        // URL'den dosya adını çıkart ve sil
                        await deleteImage(image.url);
                    } catch (error) {
                        console.error("Error deleting image:", error);
                    }
                }
                return imageId;
            });
            
            await Promise.all(deletePromises);
            
            // Ürün nesnesinden kaldır
            processedImages = processedImages.filter(img => !imagesToRemove.includes(img._id.toString()));
        }
        
        // Yeni eklenen dosya resimlerini ekle 
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            console.log("Adding new file images:", req.files.length);
            
            const fileImages = req.files.map((file, index) => ({
                url: file.url,  // Artık doğrudan url mevcut
                filename: file.filename,
                isCover: processedImages.length === 0 && index === 0 // Resim yoksa kapak olarak işaretle
            }));
            
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
                isCover: img._id && img._id.toString() === req.body.coverImageId
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
        
        // Kategori değişikliği - categoryId kullan
        if (categoryId) {
            product.category = categoryId;
        }
        
        // Alt kategori değişikliği - subcategoryId kullan
        if (subcategoryId) {
            product.subcategory = subcategoryId;
        }
        
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
        console.error("Product update error:", error);
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
        console.log("Deleting product with ID:", req.params.id);
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return next(createError('Ürün bulunamadı.', 404, 'PRODUCT_NOT_FOUND'));
        }
        
        // Ürün sahibi değilse veya admin değilse engelle
        if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return next(createError('Bu işlem için yetkiniz bulunmuyor.', 403, 'UNAUTHORIZED_ACTION'));
        }
        
        // Resimleri dosya sisteminden sil
        if (product.images && Array.isArray(product.images)) {
            const deletePromises = product.images.map(async (image) => {
                if (image && image.url) {
                    try {
                        await deleteImage(image.url);
                        console.log("Successfully deleted image:", image.url);
                    } catch (error) {
                        console.error("Error deleting image during product deletion:", error);
                    }
                }
                return true; // Her işlemin bir sonuç döndürmesi gerekiyor
            });
            
            await Promise.all(deletePromises);
        }
        
        // Ürünü sil - findByIdAndDelete kullan
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        console.log("Product deletion result:", deletedProduct ? "Success" : "Failed");
        
        if (!deletedProduct) {
            throw new Error(`Product with ID ${req.params.id} could not be deleted`);
        }
        
        res.status(200).json({
            success: true,
            message: 'Ürün başarıyla silindi.'
        });
    } catch (error) {
        console.error("Product deletion error:", error);
        console.error("Error stack:", error.stack);
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
 * @access Private
 */
const getUserProducts = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { status, page = 1, limit = 12 } = req.query;
        
        console.log("getUserProducts called:", {
            requestedUserId: userId,
            authenticatedUserId: req.user?._id,
            status,
            page,
            limit
        });
        
        // Güvenlik kontrolü: Sadece kendi ürünlerine erişim sağla
        if (userId !== req.user._id.toString()) {
            console.log("Unauthorized access attempt:", {
                requestedUserId: userId,
                authenticatedUserId: req.user._id.toString()
            });
            return next(createError('Bu kullanıcının ürünlerine erişme yetkiniz yok.', 403, 'UNAUTHORIZED_ACCESS'));
        }
        
        const query = { owner: userId };
        
        // Statüs filtresi
        if (status) {
            query.status = status;
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
        
        console.log(`Found ${products.length} products for user ${userId}`);
        
        res.status(200).json({
            success: true,
            count: products.length,
            total: totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: parseInt(page),
            data: products
        });
    } catch (error) {
        console.error("Error in getUserProducts:", error);
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