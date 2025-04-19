/**
 * Global hata yakalama middleware'i
 * Hataları yakalar, loglar ve istemciye uygun yanıt döner
 */
const errorHandler = (err, req, res, next) => {
  // Hatayı konsola logla
  console.error('Hata oluştu:', err.message);
  console.error(err.stack);

  // HTTP durum kodunu belirle (varsayılan 500)
  const statusCode = err.statusCode || 500;

  // Hata yanıtını oluştur
  const errorResponse = {
    error: {
      message: err.message || 'Sunucu hatası',
      code: err.code || 'SERVER_ERROR'
    }
  };

  // Development ortamında hata stack'ini ekle
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // İstemciye yanıt döndür
  res.status(statusCode).json(errorResponse);
};

/**
 * Belirli bir hata fırlatmak için yardımcı fonksiyon
 * @param {string} message - Hata mesajı
 * @param {number} statusCode - HTTP durum kodu
 * @param {string} code - Hata kodu
 * @returns {Error} Hata nesnesi
 */
const createError = (message, statusCode = 400, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * 404 Not Found hatası için middleware
 */
const notFound = (req, res, next) => {
  const error = createError(`${req.originalUrl} adresinde kaynak bulunamadı`, 404, 'NOT_FOUND');
  next(error);
};

module.exports = {
  errorHandler,
  createError,
  notFound
}; 