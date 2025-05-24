const mongoose = require('mongoose');
const dotenv = require('dotenv');
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

// Kullanıcıları listele
const listUsers = async () => {
  try {
    const users = await User.find({}).select('-password -verificationToken -resetPasswordToken');
    
    console.log('\nKullanıcı Listesi:');
    console.log('==================');
    
    if (users.length === 0) {
      console.log('Veritabanında hiç kullanıcı yok!');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`\n#${index + 1} Kullanıcı:`);
      console.log(`ID: ${user._id}`);
      console.log(`Kullanıcı Adı: ${user.username}`);
      console.log(`E-posta: ${user.email}`);
      console.log(`Tam İsim: ${user.fullName}`);
      console.log(`Rol: ${user.role}`);
      console.log(`E-posta Doğrulandı: ${user.emailVerified ? 'Evet' : 'Hayır'}`);
      console.log(`Oluşturulma Tarihi: ${user.createdAt}`);
    });
    
    console.log('\nToplam Kullanıcı Sayısı:', users.length);
  } catch (error) {
    console.error('Kullanıcıları listelerken hata:', error);
  } finally {
    // Bağlantıyı kapat
    mongoose.connection.close();
  }
};

// Script'i çalıştır
listUsers(); 