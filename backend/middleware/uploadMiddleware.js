const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createError } = require('./errorHandler');

// Dosyaları yüklemek için uploads klasörünün doğru yolu
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads');
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products');

// Klasörlerin varlığını kontrol et ve oluştur
const ensureDirectoriesExist = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('Created uploads directory');
  }
  
  if (!fs.existsSync(PRODUCTS_DIR)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    console.log('Created products uploads directory');
  }
};

// Klasörleri oluştur
ensureDirectoriesExist();

// Bellek depolama stratejisi (FormData için) - Cloudinary ve local storage seçenekleri
const memoryStorage = multer.memoryStorage();

// Disk depolama stratejisi (doğrudan dosya sistemine kaydetmek için)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PRODUCTS_DIR);
  },
  filename: (req, file, cb) => {
    // Güvenli dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

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

// Tek resim yükleme için memory middleware
const uploadSingleImageMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    ...limits,
    files: 1
  }
}).single('image');

// Çoklu resim yükleme için memory middleware
const uploadMultipleImagesMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits
}).array('images', 10);

// Tek resim yükleme için disk middleware
const uploadSingleImageDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    ...limits,
    files: 1
  }
}).single('image');

// Çoklu resim yükleme için disk middleware
const uploadMultipleImagesDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits
}).array('images', 10);

// Tek resim yükleme için Express middleware wrapper
const singleUpload = (req, res, next) => {
  uploadSingleImageMemory(req, res, (err) => {
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
  uploadMultipleImagesMemory(req, res, (err) => {
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

// Disk'e doğrudan yükleme için Express middleware wrapper
const singleUploadDisk = (req, res, next) => {
  uploadSingleImageDisk(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Dosya yükleme hatası: ${err.message}` });
      }
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    
    // Dosya URL'sini ekle
    if (req.file) {
      req.file.url = `/uploads/products/${req.file.filename}`;
    }
    
    next();
  });
};

// Disk'e doğrudan çoklu yükleme için Express middleware wrapper
const multipleUploadDisk = (req, res, next) => {
  uploadMultipleImagesDisk(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Dosya yükleme hatası: ${err.message}` });
      }
      return res.status(err.statusCode || 400).json({ error: err.message });
    }
    
    // Dosya URL'lerini ekle
    if (req.files && req.files.length > 0) {
      console.log(`Upload successful: ${req.files.length} files uploaded`);
      
      req.files.forEach((file, index) => {
        file.url = `/uploads/products/${file.filename}`;
        console.log(`File ${index + 1}: ${file.filename}, URL: ${file.url}`);
      });
    } else {
      console.log('No files uploaded with multipleUploadDisk middleware');
    }
    
    next();
  });
};

module.exports = {
  singleUpload,
  multipleUpload,
  singleUploadDisk,
  multipleUploadDisk
}; 