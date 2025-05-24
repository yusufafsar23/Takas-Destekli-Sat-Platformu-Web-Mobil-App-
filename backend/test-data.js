const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Test database connection and data retrieval
async function testDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // Test category collection
    console.log('\nTesting Category collection:');
    const categoryCount = await Category.countDocuments();
    console.log(`- Found ${categoryCount} categories in database`);
    
    if (categoryCount > 0) {
      const sampleCategories = await Category.find().limit(3);
      console.log('- Sample categories:');
      sampleCategories.forEach(category => {
        console.log(`  - ${category._id}: ${category.name}`);
      });
    } else {
      console.log('- No categories found.');
    }

    // Test product collection
    console.log('\nTesting Product collection:');
    const productCount = await Product.countDocuments();
    console.log(`- Found ${productCount} products in database`);
    
    if (productCount > 0) {
      const sampleProducts = await Product.find().limit(3);
      console.log('- Sample products:');
      sampleProducts.forEach(product => {
        console.log(`  - ${product._id}: ${product.title} (${product.price})`);
      });
    } else {
      console.log('- No products found.');
    }

    // Test user collection
    console.log('\nTesting User collection:');
    const userCount = await User.countDocuments();
    console.log(`- Found ${userCount} users in database`);
    
    if (userCount > 0) {
      const sampleUsers = await User.find().limit(3);
      console.log('- Sample users:');
      sampleUsers.forEach(user => {
        console.log(`  - ${user._id}: ${user.username} (${user.email})`);
      });
    } else {
      console.log('- No users found.');
    }

    // Test specific user credentials
    console.log('\nTesting test user account:');
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (testUser) {
      console.log(`- Test user found: ${testUser.username} (${testUser.email})`);
    } else {
      console.log('- Test user not found. Creating test user...');
      
      // Create a test user if it doesn't exist
      const newTestUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'test123',
        fullName: 'Test User',
        emailVerified: true
      });
      
      await newTestUser.save();
      console.log('- Test user created successfully.');
    }

    console.log('\nDatabase tests completed successfully.');
  } catch (error) {
    console.error('Error testing database:', error);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

// Run the test
testDatabase(); 