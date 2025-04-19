const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { 
  generateAuthToken, 
  generateEmailVerificationToken, 
  generatePasswordResetToken,
  hashToken
} = require('../utils/tokenService');

// Kullanıcı Kaydı
const register = async (req, res) => {
    try {
        const { username, email, password, fullName, phone, address } = req.body;

        // Email kontrolü
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Bu email adresi zaten kayıtlı.' });
        }

        // Kullanıcı adı kontrolü
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }

        // E-posta doğrulama tokeni oluşturma
        const verificationToken = generateEmailVerificationToken();
        const hashedToken = hashToken(verificationToken);

        // Şifre hashleme
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcı oluşturma
        const user = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            phone,
            address,
            verificationToken: hashedToken,
            verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000 // 24 saat
        });

        await user.save();

        // E-posta doğrulama e-postası gönderme
        await sendEmail({
            to: email,
            subject: 'Takas Platformu - E-posta Adresinizi Doğrulayın',
            html: emailTemplates.verification(verificationToken, username)
        });

        // Token oluşturma
        const token = generateAuthToken(user._id, user.role);

        res.status(201).json({
            message: 'Kullanıcı kaydı başarılı. Lütfen e-posta adresinizi doğrulayın.',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                emailVerified: user.emailVerified
            },
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// E-posta Doğrulama
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Doğrulama token\'ı gereklidir.' });
        }

        // Token'ı hashle
        const hashedToken = hashToken(token);

        // Kullanıcıyı bul
        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token.' });
        }

        // Kullanıcı bilgilerini güncelle
        user.emailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();

        // Hoş geldiniz e-postası gönder
        await sendEmail({
            to: user.email,
            subject: 'Takas Platformu - Hoş Geldiniz!',
            html: emailTemplates.welcome(user.username)
        });

        // Yeni token oluştur
        const newToken = generateAuthToken(user._id, user.role);

        res.json({
            message: 'E-posta adresi başarıyla doğrulandı.',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                emailVerified: user.emailVerified
            },
            token: newToken
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Şifre Sıfırlama İsteği
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'E-posta adresi gereklidir.' });
        }

        // Kullanıcıyı e-posta adresine göre bul
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.' });
        }

        // Şifre sıfırlama token'ı oluştur
        const resetToken = generatePasswordResetToken();
        const hashedToken = hashToken(resetToken);

        // Kullanıcıyı güncelle
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 saat
        await user.save();

        // Şifre sıfırlama e-postası gönder
        await sendEmail({
            to: user.email,
            subject: 'Takas Platformu - Şifre Sıfırlama',
            html: emailTemplates.resetPassword(resetToken, user.username)
        });

        res.json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Şifre Sıfırlama
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token ve yeni şifre gereklidir.' });
        }

        // Minimum şifre uzunluğu kontrolü
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
        }

        // Token'ı hashle
        const hashedToken = hashToken(token);

        // Kullanıcıyı bul
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token.' });
        }

        // Şifreyi hashleme
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Kullanıcı bilgilerini güncelle
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        res.json({ message: 'Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Kullanıcı Girişi
const login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

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

        // Son aktif zamanı güncelle
        user.lastActive = Date.now();
        await user.save();

        // Token oluşturma (rememberMe seçeneğine göre)
        const token = generateAuthToken(user._id, user.role, rememberMe);

        res.json({
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                emailVerified: user.emailVerified
            },
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Çıkış Yapma (Client side)
const logout = (req, res) => {
    // JWT token stateless olduğu için server side logout yok
    // Client tarafında token silinir
    res.json({ message: 'Başarıyla çıkış yapıldı.' });
};

// Profil Güncelleme
const updateProfile = async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['username', 'fullName', 'phone', 'address', 'profilePicture'];
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ error: 'Geçersiz güncelleme alanları.' });
        }

        // Kullanıcı adı güncelleniyorsa ve başka bir kullanıcı tarafından kullanılıyorsa kontrol et
        if (updates.includes('username') && req.body.username !== req.user.username) {
            const existingUser = await User.findOne({ username: req.body.username });
            if (existingUser) {
                return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
            }
        }

        updates.forEach(update => req.user[update] = req.body[update]);
        req.user.updatedAt = Date.now();
        await req.user.save();

        res.json({
            user: {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                fullName: req.user.fullName,
                profilePicture: req.user.profilePicture,
                phone: req.user.phone,
                address: req.user.address,
                role: req.user.role,
                emailVerified: req.user.emailVerified
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Şifre Değiştirme
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gereklidir.' });
        }

        // Minimum şifre uzunluğu kontrolü
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
        }

        // Mevcut şifre kontrolü
        const isMatch = await bcrypt.compare(currentPassword, req.user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Mevcut şifre yanlış.' });
        }

        // Şifreyi hashleme
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Kullanıcı şifresini güncelle
        req.user.password = hashedPassword;
        req.user.updatedAt = Date.now();
        await req.user.save();

        res.json({ message: 'Şifreniz başarıyla değiştirildi.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Profil Bilgilerini Getirme
const getProfile = async (req, res) => {
    try {
        // Son aktif zamanı güncelle
        req.user.lastActive = Date.now();
        await req.user.save();

        res.json({
            user: {
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                fullName: req.user.fullName,
                profilePicture: req.user.profilePicture,
                phone: req.user.phone,
                address: req.user.address,
                role: req.user.role,
                permissions: req.user.permissions,
                emailVerified: req.user.emailVerified,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Kullanıcı listesi (sadece admin rolüne sahip kullanıcılar için)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password -verificationToken -resetPasswordToken');
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin: Kullanıcı yetkilerini düzenleme (sadece admin rolüne sahip kullanıcılar için)
const updateUserPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, permissions } = req.body;

        // Kullanıcıyı bul
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        }

        // Rol güncellemesi
        if (role && ['user', 'admin', 'moderator'].includes(role)) {
            user.role = role;
        }

        // İzin güncellemesi
        if (permissions && typeof permissions === 'object') {
            user.permissions = {
                ...user.permissions,
                ...permissions
            };
        }

        await user.save();

        res.json({
            message: 'Kullanıcı yetkileri başarıyla güncellendi.',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    login,
    logout,
    updateProfile,
    changePassword,
    getProfile,
    getAllUsers,
    updateUserPermissions
};