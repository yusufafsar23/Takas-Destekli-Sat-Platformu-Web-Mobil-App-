const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Cloudinary Yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Base64 formatındaki resmi Cloudinary'ye yükler
 * @param {string} base64Image - Base64 formatında resim
 * @param {string} folder - Yüklenecek klasör (örn: 'products')
 * @returns {Promise<Object>} Cloudinary yanıtı
 */
const uploadBase64Image = async (base64Image, folder = 'products') => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
      transformation: [
        { width: 1000, crop: 'limit' }, // En boy oranını koruyarak max genişlik 1000px
        { quality: 'auto:good' } // Otomatik kalite optimizasyonu
      ]
    });
    
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary yükleme hatası:', error);
    throw error;
  }
};

/**
 * Buffer formatındaki resmi Cloudinary'ye yükler
 * @param {Buffer} buffer - Resim buffer'ı
 * @param {string} folder - Yüklenecek klasör
 * @returns {Promise<Object>} Cloudinary yanıtı
 */
const uploadBufferImage = async (buffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
        transformation: [
          { width: 1000, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format
        });
      }
    );
    
    const readable = new Readable();
    readable._read = () => {}; // _read fonksiyonu gerekiyor
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
};

/**
 * Resmi Cloudinary'den siler
 * @param {string} publicId - Silinecek resmin public ID'si
 * @returns {Promise<Object>} Cloudinary yanıtı
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary silme hatası:', error);
    throw error;
  }
};

/**
 * URL'si verilmiş resmi işler ve Cloudinary'ye yükler
 * @param {string} imageUrl - İşlenecek resmin URL'si
 * @param {string} folder - Yüklenecek klasör
 * @param {Array} transformations - Dönüşüm parametreleri
 * @returns {Promise<Object>} Cloudinary yanıtı
 */
const processAndUploadImage = async (imageUrl, folder = 'products', transformations = []) => {
  try {
    // Varsayılan dönüşümler
    const defaultTransformations = [
      { width: 1000, crop: 'limit' },
      { quality: 'auto:good' }
    ];

    // Kullanıcının belirttiği dönüşümleri ekle
    const allTransformations = [...defaultTransformations, ...transformations];
    
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
      transformation: allTransformations
    });
    
    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary işleme hatası:', error);
    throw error;
  }
};

module.exports = {
  uploadBase64Image,
  uploadBufferImage,
  deleteImage,
  processAndUploadImage
}; 