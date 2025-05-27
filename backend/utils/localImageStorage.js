const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);

// Resimlerin kaydedileceği klasör
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads');
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products');

// URL prefix for images - public path for browser
const URL_PREFIX = '/uploads/products';

/**
 * Dosya sistemi kontrolü
 */
const ensureDirectoriesExist = async () => {
  try {
    // Ana uploads klasörünü kontrol et
    if (!fs.existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
      console.log('Created uploads directory');
    }
    
    // Ürün resim klasörünü kontrol et
    if (!fs.existsSync(PRODUCTS_DIR)) {
      await mkdir(PRODUCTS_DIR, { recursive: true });
      console.log('Created products uploads directory');
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
    throw new Error('Could not create upload directories');
  }
};

/**
 * Base64 formatındaki resmi yerel dosya sistemine kaydeder
 * @param {string} base64Image - Base64 formatında resim
 * @returns {Promise<Object>} Kayıt sonucu
 */
const saveBase64Image = async (base64Image) => {
  try {
    await ensureDirectoriesExist();
    
    // Base64 formatını kontrol et
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }
    
    // Resim formatını ve veriyi çıkart
    const imageType = matches[1];
    const imageData = Buffer.from(matches[2], 'base64');
    
    // Dosya formatını belirle
    let extension = 'jpg'; // varsayılan
    if (imageType === 'image/png') extension = 'png';
    if (imageType === 'image/jpeg') extension = 'jpg';
    if (imageType === 'image/gif') extension = 'gif';
    
    // Benzersiz dosya adı oluştur
    const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const filePath = path.join(PRODUCTS_DIR, filename);
    
    // Dosyayı kaydet
    await writeFile(filePath, imageData);
    
    return {
      url: `${URL_PREFIX}/${filename}`,
      filename: filename,
      path: filePath
    };
  } catch (error) {
    console.error('Local image save error:', error);
    throw error;
  }
};

/**
 * Buffer formatındaki resmi yerel dosya sistemine kaydeder
 * @param {Buffer} buffer - Resim buffer'ı
 * @param {string} mimetype - Resmin MIME tipi
 * @returns {Promise<Object>} Kayıt sonucu
 */
const saveBufferImage = async (buffer, mimetype) => {
  try {
    console.log(`saveBufferImage called with mimetype: ${mimetype}, buffer size: ${buffer ? buffer.length : 'null'} bytes`);
    
    await ensureDirectoriesExist();
    
    // Buffer var mı kontrol et
    if (!buffer) {
      throw new Error('Geçersiz resim buffer\'ı');
    }
    
    // Dosya formatını belirle
    let extension = 'jpg'; // varsayılan
    if (mimetype === 'image/png') extension = 'png';
    if (mimetype === 'image/jpeg') extension = 'jpg';
    if (mimetype === 'image/gif') extension = 'gif';
    
    // Benzersiz dosya adı oluştur
    const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${extension}`;
    const filePath = path.join(PRODUCTS_DIR, filename);
    
    // Dosyayı kaydet
    await writeFile(filePath, buffer);
    console.log(`File successfully saved to ${filePath}`);
    
    // URL'yi oluştur
    const url = `${URL_PREFIX}/${filename}`;
    console.log(`Image URL created: ${url}`);
    
    return {
      url: url,
      filename: filename,
      path: filePath
    };
  } catch (error) {
    console.error('Local image save error:', error);
    throw error;
  }
};

/**
 * Yerel dosya sisteminden resim siler
 * @param {string} imageUrl - Silinecek resmin URL'si
 * @returns {Promise<boolean>} Silme sonucu
 */
const deleteImage = async (imageUrl) => {
  try {
    // URL'den dosya adını çıkart
    const filename = path.basename(imageUrl);
    const filePath = path.join(PRODUCTS_DIR, filename);
    
    // Dosya var mı kontrol et
    const fileExists = await exists(filePath);
    if (!fileExists) {
      console.warn(`File does not exist: ${filePath}`);
      return false;
    }
    
    // Dosyayı sil
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error('Local image delete error:', error);
    throw error;
  }
};

module.exports = {
  saveBase64Image,
  saveBufferImage,
  deleteImage,
  ensureDirectoriesExist
}; 