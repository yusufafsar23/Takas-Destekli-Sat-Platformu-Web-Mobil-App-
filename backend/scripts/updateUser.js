const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// .env dosyasını yükle
dotenv.config();

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/takas-platform')
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });

// Test kullanıcısı oluştur/güncelle
const updateTestUser = async () => {
  try {
    // Kullanıcıyı e-posta ile ara
    const email = 'test@example.com';
    let user = await User.findOne({ email });
    
    // Yeni şifre (test123)
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (user) {
      console.log(`Mevcut kullanıcı güncelleniyor: ${email}`);
      
      // Kullanıcıyı güncelle
      user.username = 'testuser';
      user.password = hashedPassword;
      user.fullName = 'Test Kullanıcı';
      user.emailVerified = true;
      user.role = 'user';
      
      await user.save();
      console.log('Kullanıcı başarıyla güncellendi.');
    } else {
      console.log(`Yeni test kullanıcısı oluşturuluyor: ${email}`);
      
      // Yeni kullanıcı oluştur
      user = new User({
        email,
        username: 'testuser',
        password: hashedPassword,
        fullName: 'Test Kullanıcı',
        emailVerified: true,
        role: 'user'
      });
      
      await user.save();
      console.log('Test kullanıcısı başarıyla oluşturuldu.');
    }
    
    console.log('\nTest Kullanıcı Bilgileri:');
    console.log('========================');
    console.log(`E-posta: ${email}`);
    console.log(`Şifre: ${password}`);
    console.log(`Kullanıcı Adı: ${user.username}`);
  } catch (error) {
    console.error('Kullanıcı güncelleme hatası:', error);
  } finally {
    // Bağlantıyı kapat
    mongoose.connection.close();
  }
};

// Script'i çalıştır
updateTestUser(); 