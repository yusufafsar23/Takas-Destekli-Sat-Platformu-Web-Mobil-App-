const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

// Images klasör yolu
const imagesDir = path.join(__dirname, '../public/images');

// İndirilecek resimlerin listesi
const imagesToDownload = [
  {
    name: 'product-placeholder.jpg',
    url: 'https://images.unsplash.com/photo-1586769852044-692d6e3d3fdb?w=500&q=80',
  },
  {
    name: 'electronics.jpg',
    url: 'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=800&q=80',
  },
  {
    name: 'gaming.jpg',
    url: 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=800&q=80',
  },
  {
    name: 'laptop.jpg',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
  },
  {
    name: 'watch.jpg',
    url: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80',
  },
  {
    name: 'shoes.jpg',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  },
  {
    name: 'collectibles.jpg',
    url: 'https://images.unsplash.com/photo-1608278047551-bfbfd9c8fd47?w=400&q=80',
  },
  {
    name: 'clothing.jpg',
    url: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&q=80',
  },
  {
    name: 'banner1.jpg',
    url: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80',
  },
  {
    name: 'banner2.jpg',
    url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1200&q=80',
  },
];

// Klasörü oluştur
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log(`${imagesDir} klasörü oluşturuldu.`);
}

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

// Tüm resimleri indir
async function downloadAllImages() {
  console.log('Resimler indiriliyor...');
  
  for (const image of imagesToDownload) {
    const filepath = path.join(imagesDir, image.name);
    
    try {
      await downloadImage(image.url, filepath);
    } catch (error) {
      console.error(`Hata: ${image.name} indirilemedi - ${error.message}`);
    }
  }
  
  console.log('Tüm resimler indirildi!');
}

// Betiği çalıştır
downloadAllImages().catch(console.error); 