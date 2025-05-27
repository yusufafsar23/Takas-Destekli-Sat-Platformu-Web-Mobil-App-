const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestAccount() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
    
    const email = 'test2@example.com';
    const password = 'test123';
    const username = 'testuser' + Math.floor(Math.random() * 1000);
    
    console.log('Creating test user...');
    
    // Manuel olarak bcryptjs ile hash oluştur
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hash created:', hashedPassword);
    
    // Yeni kullanıcı oluştur
    const user = new User({
      username,
      email,
      password: hashedPassword, 
      fullName: 'Test User',
      role: 'user',
      emailVerified: true  
    });
    
    // Kullanıcıyı kaydet
    await User.create(user);
    
    console.log('Test user created successfully:');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Stored hash:', hashedPassword);
    
    // Şimdi şifre karşılaştırmasını test et
    const savedUser = await User.findOne({ email });
    if (savedUser) {
      console.log('User found in database');
      console.log('Stored password in DB:', savedUser.password);
      
      // Model metodu ile karşılaştır
      const compareResult1 = await savedUser.comparePassword(password);
      console.log('Model comparePassword result:', compareResult1);
      
      // Direkt bcrypt ile karşılaştır
      const compareResult2 = await bcrypt.compare(password, savedUser.password);
      console.log('Direct bcrypt.compare result:', compareResult2);

      if (!compareResult2) {
        // Test some variations of the string
        console.log('Testing password with extra space:', await bcrypt.compare(password + ' ', savedUser.password));
        console.log('Testing with straight quotes:', await bcrypt.compare('test123', savedUser.password));
      }
    } else {
      console.log('User not found in database!');
    }
    
    console.log('\nNow testing login functionality directly:');
    
    // Login fonksiyonu simülasyonu
    const loginUser = async (email, password) => {
      const user = await User.findOne({ email });
      if (!user) {
        console.log('Login test: User not found');
        return false;
      }
      
      // Direct bcrypt compare
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Login test: Password match =', isMatch);
      return isMatch;
    };
    
    await loginUser(email, password);
    
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

createTestAccount(); 