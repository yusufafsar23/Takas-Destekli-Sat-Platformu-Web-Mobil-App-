const fs = require('fs');
const path = require('path');
const https = require('https');

// Images klasör yolu
const imagesDir = path.join(__dirname, '../public/images');

// Güncellenecek bannerların listesi
const bannersToUpdate = [
  {
    name: 'banner1.jpg',
    url: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=1200&h=400&fit=crop&q=80',
    description: 'Modern e-ticaret / alışveriş banner'
  },
  {
    name: 'banner2.jpg',
    url: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1200&h=400&fit=crop&q=80',
    description: 'Takas/değişim konseptli banner'
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

// Bannerları güncelle
async function updateBanners() {
  console.log('Banner resimleri güncelleniyor...');
  
  for (const banner of bannersToUpdate) {
    const filepath = path.join(imagesDir, banner.name);
    
    // Mevcut dosyayı sil
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`Mevcut ${banner.name} silindi.`);
    }
    
    try {
      console.log(`İndiriliyor: ${banner.description}`);
      await downloadImage(banner.url, filepath);
    } catch (error) {
      console.error(`Hata: ${banner.name} indirilemedi - ${error.message}`);
    }
  }
  
  console.log('Banner resimleri güncellendi!');
}

// Betiği çalıştır
updateBanners().catch(console.error); 