const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Base URL for the API
const API_BASE_URL = `http://localhost:${process.env.PORT || 5000}/api`;

// Test credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123';

// Function to test API endpoints
async function testApi() {
  try {
    console.log('Starting API endpoint tests...');
    console.log(`API Base URL: ${API_BASE_URL}`);

    // Test categories endpoint
    console.log('\n1. Testing Categories Endpoint:');
    try {
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`);
      console.log(`- Status: ${categoriesResponse.status}`);
      console.log(`- Response structure: ${JSON.stringify(categoriesResponse.data).substring(0, 500)}...`);
      console.log(`- Categories count: ${categoriesResponse.data.count || categoriesResponse.data.length || 'N/A'}`);
    } catch (error) {
      console.error('- Error testing categories endpoint:', error.message);
    }

    // Test products endpoint
    console.log('\n2. Testing Products Endpoint:');
    try {
      const productsResponse = await axios.get(`${API_BASE_URL}/products`);
      console.log(`- Status: ${productsResponse.status}`);
      console.log(`- Response structure: ${JSON.stringify(productsResponse.data).substring(0, 500)}...`);
      console.log(`- Products count: ${productsResponse.data.count || 
                                       (productsResponse.data.data && productsResponse.data.data.length) || 
                                       'N/A'}`);
    } catch (error) {
      console.error('- Error testing products endpoint:', error.message);
    }

    // Test featured products endpoint
    console.log('\n3. Testing Featured Products Endpoint:');
    try {
      const featuredResponse = await axios.get(`${API_BASE_URL}/products/featured`);
      console.log(`- Status: ${featuredResponse.status}`);
      console.log(`- Response structure: ${JSON.stringify(featuredResponse.data).substring(0, 500)}...`);
    } catch (error) {
      console.error('- Error testing featured products endpoint:', error.message);
    }

    // Test authentication endpoints
    console.log('\n4. Testing Authentication Endpoints:');
    try {
      // Login
      console.log('- Testing Login (POST /users/login):');
      const loginResponse = await axios.post(`${API_BASE_URL}/users/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });
      console.log(`  - Status: ${loginResponse.status}`);
      console.log(`  - Has token: ${loginResponse.data.token ? 'Yes' : 'No'}`);
      console.log(`  - Has user data: ${loginResponse.data.user ? 'Yes' : 'No'}`);
      
      const token = loginResponse.data.token;
      
      if (token) {
        // Test authenticated endpoint
        console.log('- Testing Authenticated Endpoint (GET /users/profile):');
        try {
          const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`  - Status: ${profileResponse.status}`);
          console.log(`  - User data: ${JSON.stringify(profileResponse.data).substring(0, 300)}...`);
        } catch (error) {
          console.error('  - Error testing profile endpoint:', error.message);
        }
      }
    } catch (error) {
      console.error('- Error testing authentication endpoints:', error.message);
      console.error('  Response data:', error.response?.data);
    }

    console.log('\nAPI endpoint tests completed.');
  } catch (error) {
    console.error('Error during API testing:', error);
  }
}

// Run the tests
testApi(); 