const TradeOffer = require('../models/TradeOffer');
const Product = require('../models/Product');

// Takas Teklifi Oluşturma
const createTradeOffer = async (req, res) => {
    try {
        const { productId, offeredProductId, additionalCash } = req.body;

        // Ürün kontrolü
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        // Teklif edilen ürün kontrolü
        const offeredProduct = await Product.findById(offeredProductId);
        if (!offeredProduct) {
            return res.status(404).json({ error: 'Teklif edilen ürün bulunamadı.' });
        }

        // Ürün sahibi kontrolü
        if (product.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Kendi ürününüz için takas teklifi yapamazsınız.' });
        }

        // Teklif edilen ürün sahibi kontrolü
        if (offeredProduct.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu ürün size ait değil.' });
        }

        const tradeOffer = new TradeOffer({
            product: productId,
            offeredProduct: offeredProductId,
            additionalCash,
            status: 'pending',
            offeredBy: req.user._id
        });

        await tradeOffer.save();
        res.status(201).json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Teklifleri Listeleme
const getTradeOffers = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};

        if (status) query.status = status;

        const tradeOffers = await TradeOffer.find(query)
            .populate('product')
            .populate('offeredProduct')
            .populate('offeredBy', 'username')
            .sort({ createdAt: -1 });

        res.json(tradeOffers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Teklif Detayı
const getTradeOffer = async (req, res) => {
    try {
        const tradeOffer = await TradeOffer.findById(req.params.id)
            .populate('product')
            .populate('offeredProduct')
            .populate('offeredBy', 'username');

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        res.json(tradeOffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Teklif Güncelleme (Kabul/Red)
const updateTradeOffer = async (req, res) => {
    try {
        const { status } = req.body;
        const tradeOffer = await TradeOffer.findById(req.params.id);

        if (!tradeOffer) {
            return res.status(404).json({ error: 'Takas teklifi bulunamadı.' });
        }

        // Sadece ürün sahibi teklifi güncelleyebilir
        const product = await Product.findById(tradeOffer.product);
        if (product.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Geçersiz durum.' });
        }

        tradeOffer.status = status;
        await tradeOffer.save();

        res.json(tradeOffer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createTradeOffer,
    getTradeOffers,
    getTradeOffer,
    updateTradeOffer
}; 