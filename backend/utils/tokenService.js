const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT Token oluşturma
 * @param {string} userId - Kullanıcı ID'si
 * @param {string} role - Kullanıcı rolü
 * @param {boolean} rememberMe - Uzun süreli token (30 gün) oluşturma seçeneği
 * @returns {string} JWT token
 */
const generateAuthToken = (userId, role = 'user', rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '1d';
  
  return jwt.sign(
    { 
      id: userId,
      role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * JWT Token doğrulama
 * @param {string} token - Doğrulanacak JWT token
 * @returns {object} Doğrulanmış token verisi veya null
 */
const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * E-posta doğrulama token'ı oluşturma
 * @returns {string} Oluşturulan token
 */
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Şifre sıfırlama token'ı oluşturma
 * @returns {string} Oluşturulan token
 */
const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Token hashleme (şifre sıfırlama ve e-posta doğrulama için)
 * @param {string} token - Hashlenecek token
 * @returns {string} Hashlenen token
 */
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

module.exports = {
  generateAuthToken,
  verifyAuthToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashToken
}; 