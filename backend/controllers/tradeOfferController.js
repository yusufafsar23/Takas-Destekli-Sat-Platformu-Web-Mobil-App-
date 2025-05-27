const TradeOffer = require('../models/TradeOffer');
const Product = require('../models/Product');
const User = require('../models/User');

// 1. Takas Teklifi Oluşturma
const createTradeOffer = async (req, res) => {
    try {
        const { 
            requestedProductId, 
            offeredProductId, 
            additionalCashOffer, 
            message,
            specialConditions
        } = req.body;

        console.log("Trade offer request:", {
            requestedProductId,
            offeredProductId,
            userId: req.user._id,
            additionalCashOffer, 
            message
        });

        // Talep edilen ürün kontrolü
        const requestedProduct = await Product.findById(requestedProductId);
        if (!requestedProduct) {
            console.log("Requested product not found:", requestedProductId);
            return res.status(404).json({ error: 'Talep edilen ürün bulunamadı.' });
        }
        console.log("Requested product found:", {
            id: requestedProduct._id,
            owner: requestedProduct.owner,
            acceptsTradeOffers: requestedProduct.acceptsTradeOffers
        });

        // Teklif edilen ürün kontrolü
        const offeredProduct = await Product.findById(offeredProductId);
        if (!offeredProduct) {
            console.log("Offered product not found:", offeredProductId);
            return res.status(404).json({ error: 'Teklif edilen ürün bulunamadı.' });
        }
        console.log("Offered product found:", {
            id: offeredProduct._id,
            owner: offeredProduct.owner
        });

        // Talep edilen ürün takas kabul ediyor mu kontrolü
        if (!requestedProduct.acceptsTradeOffers) {
            console.log("Product does not accept trade offers:", requestedProductId);
            return res.status(400).json({ error: 'Bu ürün takas tekliflerine kapalı.' });
        }

        // Teklif eden kişi kontrolü
        if (requestedProduct.owner.toString() === req.user._id.toString()) {
            console.log("User is trying to trade with their own product:", {
                productOwner: requestedProduct.owner.toString(),
                userId: req.user._id.toString()
            });
            return res.status(400).json({ error: 'Kendi ürününüz için takas teklifi yapamazsınız.' });
        }

        // Teklif edilen ürün sahibi kontrolü
        if (offeredProduct.owner.toString() !== req.user._id.toString()) {
            console.log("Offered product does not belong to user:", {
                productOwner: offeredProduct.owner.toString(),
                userId: req.user._id.toString()
            });
            return res.status(403).json({ error: 'Teklif ettiğiniz ürün size ait değil.' });
        }

        // Yeni teklifi oluştur
        const tradeOffer = new TradeOffer({
            requestedProduct: requestedProductId,
            offeredProduct: offeredProductId,
            requestedFrom: requestedProduct.owner,
            offeredBy: req.user._id,
            additionalCashOffer: additionalCashOffer || 0,
            message,
            specialConditions: specialConditions || {},
            status: 'pending'
        });

        await tradeOffer.save();
        console.log("Trade offer created successfully:", tradeOffer._id);
        
        res.status(201).json(tradeOffer);
    } catch (error) {
        console.error("Error creating trade offer:", error);
        res.status(400).json({ error: error.message });
    }
};

// 2. Gelen Teklifleri Listeleme
const getReceivedTradeOffers = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { requestedFrom: req.user._id };

        if (status) query.status = status;

        const tradeOffers = await TradeOffer.find(query)
            .populate('requestedProduct')
            .populate('offeredProduct')
            .populate('offeredBy', 'username avatar')
            .sort({ createdAt: -1 });

        res.json(tradeOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Gönderilen Teklifleri Listeleme
const getSentTradeOffers = async (req, res) => {
    try {
        const { status } = req.query;
        const query = { offeredBy: req.user._id };

        if (status) query.status = status;

        const tradeOffers = await TradeOffer.find(query)
            .populate('requestedProduct')
            .populate('offeredProduct')
            .populate('requestedFrom', 'username avatar')
            .sort({ createdAt: -1 });

        res.json(tradeOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Combine sent and received trade offers
const getMyTradeOffers = async (req, res) => {
    try {
        const { status } = req.query;
        const userId = req.user._id;
        
        // Create a query that matches offers either sent or received by the user
        const query = {
            $or: [
                { offeredBy: userId },
                { requestedFrom: userId }
            ]
        };

        if (status) query.status = status;

        const tradeOffers = await TradeOffer.find(query)
            .populate({
                path: 'requestedProduct',
                select: 'title price images status slug',
                populate: {
                    path: 'owner',
                    select: 'username avatar'
                }
            })
            .populate({
                path: 'offeredProduct',
                select: 'title price images status slug',
                populate: {
                    path: 'owner',
                    select: 'username avatar'
                }
            })
            .populate('offeredBy', 'username avatar')
            .populate('requestedFrom', 'username avatar')
            .sort({ createdAt: -1 });

        // Add a property to indicate if the user is the sender or receiver
        const enrichedOffers = tradeOffers.map(offer => {
            const offerObj = offer.toObject();
            offerObj.isSender = offer.offeredBy._id.toString() === userId.toString();
            offerObj.isReceiver = offer.requestedFrom._id.toString() === userId.toString();
            return offerObj;
        });

        res.json(enrichedOffers);
    } catch (error) {
        console.error('Error in getMyTradeOffers:', error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Tüm Teklifleri Listeleme (Admin için)
const getAllTradeOffers = async (req, res) => {
    try {
        const { status, userId, productId } = req.query;
        const query = {};

        if (status) query.status = status;
        if (userId) {
            query.$or = [
                { offeredBy: userId },
                { requestedFrom: userId }
            ];
        }
        if (productId) {
            query.$or = [
                { requestedProduct: productId },
                { offeredProduct: productId }
            ];
        }

        const tradeOffers = await TradeOffer.find(query)
            .populate('requestedProduct')
            .populate('offeredProduct')
            .populate('offeredBy', 'username avatar')
            .populate('requestedFrom', 'username avatar')
            .sort({ createdAt: -1 });

        res.json(tradeOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Teklif Detayı
const getTradeOfferById = async (req, res) => {
    try {
        const tradeOffer = await TradeOffer.findById(req.params.id)
            .populate('requestedProduct')
            .populate('offeredProduct')
            .populate('offeredBy', 'username avatar email')
            .populate('requestedFrom', 'username avatar email')
            .populate({
                path: 'counterOffers',
                populate: [
                    { path: 'requestedProduct' },
                    { path: 'offeredProduct' },
                    { path: 'offeredBy', select: 'username avatar' },
                    { path: 'requestedFrom', select: 'username avatar' }
                ]
            });

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        // Sadece ilgili kullanıcılar teklifi görebilir
        const userId = req.user._id.toString();
        if (tradeOffer.offeredBy._id.toString() !== userId && 
            tradeOffer.requestedFrom._id.toString() !== userId) {
            return res.status(403).json({ error: 'Bu teklifi görüntüleme yetkiniz yok.' });
        }

        res.json(tradeOffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Teklifi Kabul Etme
const acceptTradeOffer = async (req, res) => {
    try {
        const { responseMessage } = req.body;
        const tradeOffer = await TradeOffer.findById(req.params.id);

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        // Sadece talep edilen ürünün sahibi kabul edebilir
        if (tradeOffer.requestedFrom.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu teklifi kabul etme yetkiniz yok.' });
        }

        if (tradeOffer.status !== 'pending') {
            return res.status(400).json({ error: 'Bu teklif artık beklemede değil.' });
        }

        // Her iki ürünün de hala aktif olduğunu kontrol et
        const requestedProduct = await Product.findById(tradeOffer.requestedProduct);
        const offeredProduct = await Product.findById(tradeOffer.offeredProduct);

        if (!requestedProduct || requestedProduct.status !== 'active') {
            return res.status(400).json({ error: 'Talep edilen ürün artık mevcut değil.' });
        }

        if (!offeredProduct || offeredProduct.status !== 'active') {
            return res.status(400).json({ error: 'Teklif edilen ürün artık mevcut değil.' });
        }

        // Teklifi kabul et
        tradeOffer.status = 'accepted';
        tradeOffer.responseMessage = responseMessage;
        tradeOffer.updatedAt = Date.now();
        await tradeOffer.save();

        // Ürünlerin durumunu güncelle
        requestedProduct.status = 'sold';
        offeredProduct.status = 'sold';
        await requestedProduct.save();
        await offeredProduct.save();

        // Bu ürünle ilgili diğer teklifleri reddet
        await TradeOffer.updateMany(
            { 
                $or: [
                    { requestedProduct: tradeOffer.requestedProduct, _id: { $ne: tradeOffer._id } },
                    { offeredProduct: tradeOffer.offeredProduct, _id: { $ne: tradeOffer._id } }
                ],
                status: 'pending'
            },
            { status: 'rejected', responseMessage: 'Ürün başka bir takas teklifinde kullanıldı.' }
        );

        res.json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 7. Teklifi Reddetme
const rejectTradeOffer = async (req, res) => {
    try {
        const { responseMessage } = req.body;
        const tradeOffer = await TradeOffer.findById(req.params.id);

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        // Sadece talep edilen ürünün sahibi reddedebilir
        if (tradeOffer.requestedFrom.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu teklifi reddetme yetkiniz yok.' });
        }

        if (tradeOffer.status !== 'pending') {
            return res.status(400).json({ error: 'Bu teklif artık beklemede değil.' });
        }

        tradeOffer.status = 'rejected';
        tradeOffer.responseMessage = responseMessage;
        tradeOffer.updatedAt = Date.now();
        await tradeOffer.save();

        res.json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 8. Teklifi İptal Etme
const cancelTradeOffer = async (req, res) => {
    try {
        const tradeOffer = await TradeOffer.findById(req.params.id);

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        // Sadece teklifi yapan kişi iptal edebilir
        if (tradeOffer.offeredBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu teklifi iptal etme yetkiniz yok.' });
        }

        if (tradeOffer.status !== 'pending') {
            return res.status(400).json({ error: 'Bu teklif artık beklemede değil.' });
        }

        tradeOffer.status = 'cancelled';
        tradeOffer.updatedAt = Date.now();
        await tradeOffer.save();

        res.json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 9. Karşı Teklif Oluşturma
const createCounterOffer = async (req, res) => {
    try {
        const { 
            originalOfferId,
            requestedProductId, 
            offeredProductId, 
            additionalCashOffer, 
            message,
            specialConditions
        } = req.body;

        // Orijinal teklifi bul
        const originalOffer = await TradeOffer.findById(originalOfferId);
        if (!originalOffer) {
            return res.status(404).json({ error: 'Orijinal teklif bulunamadı.' });
        }

        if (originalOffer.status !== 'pending') {
            return res.status(400).json({ error: 'Orijinal teklif artık beklemede değil.' });
        }

        // Talep edilen ürün kontrolü
        const requestedProduct = await Product.findById(requestedProductId);
        if (!requestedProduct) {
            return res.status(404).json({ error: 'Talep edilen ürün bulunamadı.' });
        }

        // Teklif edilen ürün kontrolü
        const offeredProduct = await Product.findById(offeredProductId);
        if (!offeredProduct) {
            return res.status(404).json({ error: 'Teklif edilen ürün bulunamadı.' });
        }

        // Teklif edilen ürün sahibi kontrolü
        if (offeredProduct.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Teklif ettiğiniz ürün size ait değil.' });
        }

        // Karşı teklifi oluştur
        const counterOffer = new TradeOffer({
            requestedProduct: requestedProductId,
            offeredProduct: offeredProductId,
            requestedFrom: requestedProduct.owner,
            offeredBy: req.user._id,
            additionalCashOffer: additionalCashOffer || 0,
            message,
            specialConditions: specialConditions || {},
            status: 'pending',
            isCounterOffer: true,
            originalOffer: originalOfferId
        });

        await counterOffer.save();

        // Orijinal teklifin counterOffers alanını güncelle
        originalOffer.counterOffers.push(counterOffer._id);
        await originalOffer.save();
        
        res.status(201).json(counterOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 10. Kullanıcı Takas Geçmişi
const getUserTradeHistory = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;
        
        // Kullanıcının gönderdiği ve aldığı tüm teklifleri getir
        const tradeOffers = await TradeOffer.find({
            $or: [
                { offeredBy: userId },
                { requestedFrom: userId }
            ],
            status: { $in: ['accepted', 'rejected', 'cancelled', 'completed'] }
        })
        .populate('requestedProduct')
        .populate('offeredProduct')
        .populate('offeredBy', 'username avatar')
        .populate('requestedFrom', 'username avatar')
        .sort({ updatedAt: -1 });

        res.json(tradeOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 11. Takas İşlemini Tamamlama
const completeTradeOffer = async (req, res) => {
    try {
        const tradeOffer = await TradeOffer.findById(req.params.id);

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        if (tradeOffer.status !== 'accepted') {
            return res.status(400).json({ error: 'Sadece kabul edilmiş teklifler tamamlanabilir.' });
        }

        // Kullanıcı yetkisi kontrolü - her iki kullanıcı da tamamlayabilir
        const userId = req.user._id.toString();
        if (tradeOffer.offeredBy.toString() !== userId && 
            tradeOffer.requestedFrom.toString() !== userId) {
            return res.status(403).json({ error: 'Bu işlemi yapma yetkiniz yok.' });
        }

        tradeOffer.status = 'completed';
        tradeOffer.completedDate = Date.now();
        tradeOffer.updatedAt = Date.now();
        await tradeOffer.save();

        res.json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 12. Akıllı Eşleştirme - Kullanıcının ürünü için uygun takas teklifleri
const getSmartMatchesForProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Ürünü kontrol et
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        // Ürün sahibi kontrolü
        if (product.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu ürün size ait değil.' });
        }

        if (!product.acceptsTradeOffers) {
            return res.status(400).json({ error: 'Bu ürün takas tekliflerine kapalı.' });
        }

        // Eşleştirme için sorgular
        const matchQuery = {
            status: 'active',
            acceptsTradeOffers: true,
            owner: { $ne: req.user._id }
        };

        // Kategori filtresi
        if (product.tradePreferences?.preferredCategories?.length > 0) {
            matchQuery.category = { $in: product.tradePreferences.preferredCategories };
        }

        // Fiyat aralığı filtresi
        if (product.tradePreferences?.minTradeValuePercentage) {
            const minPrice = (product.price * product.tradePreferences.minTradeValuePercentage) / 100;
            matchQuery.price = { $gte: minPrice };
        }

        // Eşleştirmeleri bul
        const potentialMatches = await Product.find(matchQuery)
            .populate('owner', 'username avatar')
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(potentialMatches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createTradeOffer,
    getReceivedTradeOffers,
    getSentTradeOffers,
    getAllTradeOffers,
    getTradeOfferById,
    acceptTradeOffer,
    rejectTradeOffer,
    cancelTradeOffer,
    createCounterOffer,
    getUserTradeHistory,
    completeTradeOffer,
    getSmartMatchesForProduct,
    getMyTradeOffers
}; 