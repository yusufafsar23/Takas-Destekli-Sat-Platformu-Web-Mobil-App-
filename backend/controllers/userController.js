const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Kullanıcı Kaydı
const register = async (req, res) => {
    try {
        const { username, email, password, phone, address } = req.body;

        // Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
        }

        // Şifre hashleme
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcı oluşturma
        const user = new User({
            username,
            email,
            password: hashedPassword,
            phone,
            address
        });

        await user.save();

        // Token oluşturma
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Kullanıcı Girişi
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcı kontrolü
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
        }

        // Şifre kontrolü
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Geçersiz email veya şifre.' });
        }

        // Token oluşturma
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });

        res.json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Profil Güncelleme
const updateProfile = async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['username', 'email', 'phone', 'address'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ error: 'Geçersiz güncelleme alanları.' });
        }

        updates.forEach(update => req.user[update] = req.body[update]);
        await req.user.save();

        res.json(req.user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Profil Bilgilerini Getirme
const getProfile = async (req, res) => {
    res.json(req.user);
};

module.exports = {
    register,
    login,
    updateProfile,
    getProfile
}; 