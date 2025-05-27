/**
 * Bu script, veritabanındaki tüm mevcut kullanıcıları "doğrulanmış" olarak işaretler.
 * Böylece sadece yeni kayıt olan kullanıcılardan e-posta doğrulaması istenecektir.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// MongoDB bağlantısı
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB bağlantısı başarılı');
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err.message);
    process.exit(1);
  }
};

// Tüm kullanıcıları doğrulanmış olarak işaretle
const verifyAllExistingUsers = async () => {
  try {
    console.log('Mevcut kullanıcılar doğrulanmış olarak işaretleniyor...');
    
    // emailVerified değerini true olarak güncelle
    const result = await User.updateMany(
      { emailVerified: { $ne: true } }, // emailVerified true olmayanları bul
      { $set: { emailVerified: true } } // emailVerified değerini true olarak ayarla
    );
    
    console.log(`${result.modifiedCount} kullanıcı doğrulanmış olarak işaretlendi.`);
    console.log(`${result.matchedCount} kullanıcı bulundu.`);
    
    return result;
  } catch (err) {
    console.error('Kullanıcılar güncellenirken hata oluştu:', err);
    throw err;
  }
};

// Ana fonksiyon
const main = async () => {
  try {
    await connectDB();
    await verifyAllExistingUsers();
    console.log('İşlem başarıyla tamamlandı.');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
};

// Scripti çalıştır
main(); 