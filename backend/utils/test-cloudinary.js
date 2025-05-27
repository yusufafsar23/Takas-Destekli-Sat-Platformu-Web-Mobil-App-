require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Cloudinary config check
const testCloudinaryConfig = () => {
  console.log('\n--- Cloudinary Configuration Test ---\n');
  
  // Check if environment variables are set
  const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
  const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
  const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;
  
  console.log('CLOUDINARY_CLOUD_NAME:', hasCloudName ? '✓ Set' : '✗ Missing');
  console.log('CLOUDINARY_API_KEY:', hasApiKey ? '✓ Set' : '✗ Missing');
  console.log('CLOUDINARY_API_SECRET:', hasApiSecret ? '✓ Set' : '✗ Missing');
  
  // If any are missing, display error and return
  if (!hasCloudName || !hasApiKey || !hasApiSecret) {
    console.log('\n❌ Some Cloudinary environment variables are missing!');
    console.log('Please check your .env file and make sure all Cloudinary variables are set.\n');
    return false;
  }
  
  // All variables are set, configure Cloudinary
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log('\n✓ Cloudinary configuration detected.');
    console.log('Attempting to ping Cloudinary API...\n');
    
    // Try to ping Cloudinary
    return true;
  } catch (error) {
    console.log('\n❌ Error configuring Cloudinary:', error.message);
    return false;
  }
};

// Test connectivity to Cloudinary API
const testCloudinaryConnection = async () => {
  try {
    // Try to ping Cloudinary - fetching account info is a simple way to check connectivity
    const result = await cloudinary.api.ping();
    console.log('✅ Successfully connected to Cloudinary!');
    console.log('Status:', result.status);
    return true;
  } catch (error) {
    console.log('❌ Failed to connect to Cloudinary API:');
    console.log('Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\nTip: Check that your API key and secret are correct.');
    } else if (error.message.includes('network')) {
      console.log('\nTip: Check your internet connection.');
    }
    
    return false;
  }
};

// Run the tests
const runTest = async () => {
  const configValid = testCloudinaryConfig();
  
  if (configValid) {
    await testCloudinaryConnection();
  }
  
  console.log('\n--- Test Complete ---\n');
  console.log('For more help, see the CLOUDINARY_SETUP.md file.');
};

runTest(); 