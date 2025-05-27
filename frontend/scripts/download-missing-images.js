const fs = require('fs');
const path = require('path');
const https = require('https');

// Images klasör yolu
const imagesDir = path.join(__dirname, '../public/images');

// İndirilecek eksik resimlerin listesi
const missingImages = [
  {
    name: 'product-placeholder.jpg',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
  },
  {
    name: 'collectibles.jpg',
    url: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=400&q=80',
  }
];

// Resim indirme fonksiyonu
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Resim indirilemedi, status code: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`İndirildi: ${filepath}`);
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Hatalı dosyayı sil
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Eksik resimleri indir
async function downloadMissingImages() {
  console.log('Eksik resimler indiriliyor...');
  
  for (const image of missingImages) {
    const filepath = path.join(imagesDir, image.name);
    
    try {
      await downloadImage(image.url, filepath);
    } catch (error) {
      console.error(`Hata: ${image.name} indirilemedi - ${error.message}`);
    }
  }
  
  console.log('Eksik resimler indirildi!');
}

// Betiği çalıştır
downloadMissingImages().catch(console.error); 