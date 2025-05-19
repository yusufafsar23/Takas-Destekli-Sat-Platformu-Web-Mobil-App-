# Yerel Resim Depolama Rehberi

## Genel Bakış

Takas Platformu artık resimleri yüklemeniz ve görüntülemeniz için Cloudinary gibi harici servisler gerektirmez. Sistem, yüklediğiniz tüm resimleri doğrudan uygulamanın içinde saklar.

## Nasıl Çalışır?

1. Bir ürün için resim yüklediğinizde, resimler otomatik olarak `/frontend/public/uploads/products/` klasörüne kaydedilir.
2. Her resim, benzersiz bir dosya adı alır ve sistemde otomatik olarak saklanır.
3. Resimler, public dizinine kaydedildiği için doğrudan web tarayıcınızda görüntülenebilir.

## Avantajlar

- **Basitlik**: Harici servisler için hesap oluşturmak veya kimlik bilgileri ayarlamak gerekmez.
- **Hız**: Resimler yerel olarak sunulduğu için daha hızlı yüklenir.
- **Güvenilirlik**: İnternet bağlantısı sorunlarından etkilenmez.

## Dosya Boyutu ve Limitleri

- Her resim dosyası en fazla 5MB olabilir.
- Bir ürün için en fazla 10 resim yükleyebilirsiniz.
- Desteklenen resim formatları: JPG, PNG, GIF.

## Notlar ve Kısıtlamalar

- Yerel depolama kullanıldığında, üretim ortamına geçildiğinde sunucu disk alanı takip edilmelidir.
- Uygulama yeni bir sunucuya taşınırsa, resim dosyalarının da taşınması gerekir.

## Sorun Giderme

Resim yükleme veya görüntüleme sorunları yaşıyorsanız:

1. Tarayıcınızın önbelleğini temizleyin.
2. Frontend ve backend servislerini yeniden başlatın.
3. `/frontend/public/uploads/products/` klasörünün varlığını ve erişim izinlerini kontrol edin.

## Kategori-Bazlı Yer Tutucu Resimler

Bir ürün için resim yüklemezseniz veya resim yüklenemezse, sistem ürün kategorisine göre otomatik olarak bir yer tutucu resim gösterir:

- Elektronik ürünler için: `electronics.jpg`
- Giyim ürünleri için: `clothing.jpg`
- Mobilya için: `furniture.jpg`
- Kitaplar için: `books.jpg`
- Spor ürünleri için: `sports.jpg`
- Diğer kategoriler için: `product-placeholder.jpg` 