const multer = require('multer');
const path = require('path');
const { createError } = require('./errorHandler');

// Disk yerine belleğe kaydetme (Cloudinary'ye yüklemek için)
const storage = multer.memoryStorage();

// Dosya filtresi (sadece resim dosyalarını kabul etmek için)
const fileFilter = (req, file, cb) => {
  // Kabul edilen dosya tipleri
  const allowedFileTypes = /jpeg|jpg|png|gif/;
  
  // Extension kontrolü
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  
  // MIME type kontrolü
  const mimetype = allowedFileTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    // Kabul et
    return cb(null, true);
  } else {
    // Reddet
    return cb(createError('Sadece resim dosyaları (jpeg, jpg, png, gif) yüklenebilir.', 400, 'INVALID_FILE_TYPE'));
  }
};

// Dosya boyut limiti
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
  files: 10 // Tek seferde maximum 10 dosya
};

// Tek resim yükleme için middleware
const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: {
    ...limits,
    files: 1
  }
}).single('image');

// Çoklu resim yükleme için middleware
const uploadMultipleImages = multer({
  storage,
  fileFilter,
  limits
}).array('images', 10);

// Tek resim yükleme için Express middleware wrapper
const singleUpload = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer hatası
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Dosya boyutu çok büyük. Maximum 5MB olabilir.' });
        }
        return res.status(400).json({ error: `Dosya yükleme hatası: ${err.message}` });
      }
      
      // Kendi oluşturduğumuz hata
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    
    next();
  });
};

// Çoklu resim yükleme için Express middleware wrapper
const multipleUpload = (req, res, next) => {
  uploadMultipleImages(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Multer hatası
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Bir veya daha fazla dosya çok büyük. Maximum 5MB olabilir.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Çok fazla dosya. Maximum 10 resim yükleyebilirsiniz.' });
        }
        return res.status(400).json({ error: `Dosya yükleme hatası: ${err.message}` });
      }
      
      // Kendi oluşturduğumuz hata
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    
    next();
  });
};

module.exports = {
  singleUpload,
  multipleUpload
}; 