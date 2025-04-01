const Product = require('../models/Product');

// Ürün Oluşturma
const createProduct = async (req, res) => {
    try {
        const product = new Product({
            ...req.body,
            owner: req.user._id
        });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Ürünleri Listeleme
const getProducts = async (req, res) => {
    try {
        const { category, status, search } = req.query;
        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(query)
            .populate('owner', 'username')
            .sort({ createdAt: -1 });

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tek Ürün Detayı
const getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('owner', 'username');

        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Ürün Güncelleme
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        if (product.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        const updates = Object.keys(req.body);
        const allowedUpdates = ['title', 'description', 'price', 'category', 'status', 'images', 'tradePreferences'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ error: 'Geçersiz güncelleme alanları.' });
        }

        updates.forEach(update => product[update] = req.body[update]);
        await product.save();

        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Ürün Silme
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Ürün bulunamadı.' });
        }

        if (product.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
        }

        await product.remove();
        res.json({ message: 'Ürün başarıyla silindi.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct
}; 