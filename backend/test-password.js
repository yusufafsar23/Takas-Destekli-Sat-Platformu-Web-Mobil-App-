const bcrypt = require('bcryptjs');

const testPassword = 'yusuf123';
const storedHash = '$2b$10$8MoK7DsN8hGRr1TCm652aO3wPTR2h8r5hVLczJ5LrrvkJVG/eWIpO';

console.log('Testing password:', testPassword);
console.log('Against hash:', storedHash);

bcrypt.compare(testPassword, storedHash)
  .then(result => {
    console.log('Password match result:', result);
  })
  .catch(err => {
    console.error('Error during comparison:', err);
  }); 