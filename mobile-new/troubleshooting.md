# Takas Platform Mobil Uygulama Sorun Giderme Rehberi

## Görüntü Yükleme Sorunları

### Sorun: Ürün resimleri yüklenmiyor veya görüntülenmiyor

MongoDB'den gelen ürün verileri resim URL'lerini içeriyor, ancak resimler mobil uygulamada görüntülenmiyor.

#### Çözüm Adımları:

1. **API URL Yapılandırması Kontrolü**

   MongoDB'den dönen resim URL'leri genellikle `/uploads/products/...` şeklinde başlar. Bu, göreceli bir yoldur ve tam API sunucusu URL'si ile birleştirilmesi gerekir.

   ```javascript
   // services/api.js dosyasında tanımlanan API_SERVER_URL sabiti
   export const API_SERVER_URL = 'http://192.168.1.61:5000';
   
   // Örnek resim URL'si: /uploads/products/1746183116825_ed01c1024f2bafee.jpg
   // Tam URL: http://192.168.1.61:5000/uploads/products/1746183116825_ed01c1024f2bafee.jpg
   ```

2. **Resim Helper Fonksiyonları Kullanımı**

   Resim URL'lerini işlemek için `imageHelper.js` içindeki merkezi fonksiyonları kullanın:

   ```javascript
   import { getProductImageUrl, getProductImages } from '../services/imageHelper';
   
   // Tek bir resim URL'si almak için:
   const imageUrl = getProductImageUrl(product);
   
   // Ürünün tüm resimlerini dizi olarak almak için:
   const imageUrls = getProductImages(product);
   ```

3. **Hata Ayıklama**

   Resim URL'lerini konsola yazdırarak doğru formatta olup olmadıklarını kontrol edin:

   ```javascript
   console.log('Resim URL:', getProductImageUrl(product));
   ```

   Doğru resim URL'si şöyle görünmelidir:
   `http://192.168.1.61:5000/uploads/products/1746183116825_ed01c1024f2bafee.jpg`

4. **Ağ İsteklerini İzleme**

   Uygulama geliştirici araçlarını kullanarak ağ isteklerini izleyin. Resim isteği 404 hatasıyla sonuçlanıyorsa, URL yanlış olabilir.

5. **Yaygın Sorunlar ve Çözümleri**

   - **Göreceli Yollar**: `/uploads/...` ile başlayan yollar, tam API URL'si ile birleştirilmelidir.
   - **CORS**: Backend'de CORS ayarlarının mobil uygulamaya izin verdiğinden emin olun.
   - **Önbellek**: Resimler önbellekte eski sürümlerle saklanıyor olabilir. Önbelleği temizleyin.
   - **Simülatör/Emülatör**: Bazen simülatör/emülatör görüntüleri yüklemede sorun yaşayabilir. Gerçek cihazda test edin.

6. **Manuel Test**

   ```javascript
   // Bir tarayıcıda doğrudan açarak resmin var olup olmadığını kontrol edin:
   // http://192.168.1.61:5000/uploads/products/1746183116825_ed01c1024f2bafee.jpg
   ```

7. **Backend Sorunları**

   - Backend'in doğru klasör yapısına sahip olduğundan emin olun.
   - Dosya izinlerinin doğru ayarlandığından emin olun.
   - Statik dosya sunumunun doğru yapılandırıldığından emin olun.

## Diğer Yaygın Sorunlar

### API Bağlantı Sorunları

Uygulama, API sunucusuna bağlanamıyorsa aşağıdaki adımları deneyin:

1. API sunucusunun çalıştığından emin olun.
2. IP adresinin ve port numarasının doğru olduğunu kontrol edin.
3. Ağ bağlantısının çalıştığından emin olun.
4. Çevrimdışı (offline) modun kapalı olduğunu kontrol edin.

### Veri Dönüşüm Sorunları

MongoDB verileri belirli bir formatta gelirken, uygulama farklı bir format bekliyor olabilir:

1. `console.log` kullanarak API yanıtlarını inceleyin.
2. Veri dönüşüm fonksiyonlarının beklenen verileri doğru şekilde işlediğinden emin olun.
3. Veri yapısında değişiklik olduysa, dönüşüm fonksiyonlarını güncelleyin. 