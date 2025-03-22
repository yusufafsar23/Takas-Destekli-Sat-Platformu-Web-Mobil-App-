# Takas Destekli Satış Platformu - Proje Yol Haritası

Bu belge, Takas Destekli Satış Platformu projesinin 12 haftalık geliştirme planını içermektedir.

## 12 Haftalık İş Paket Çizelgesi (GitHub Commit Stratejisi Dahil)

### Hafta 1: Proje Kurulumu ve Planlama
- WEB/MOBİL: Proje gereksinimlerinin detaylı analizi
- WEB: Node.js ve Express.js backend kurulumu
- WEB: React.js frontend kurulumu
- MOBİL: React Native ve Expo kurulumu
- WEB/MOBİL: MongoDB veritabanı şemasının tasarlanması
- WEB/MOBİL: GitHub repo oluşturma ve versiyon kontrol sistemi kurulumu
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.1-hafta1" etiketinin oluşturulması**

### Hafta 2: Veritabanı ve API Tasarımı
- WEB/MOBİL: MongoDB veritabanı bağlantısının kurulması
- WEB/MOBİL: Kullanıcı, ürün ve takas modelleri oluşturulması
- WEB/MOBİL: RESTful API endpoint'lerinin tasarlanması
- WEB/MOBİL: Temel CRUD işlemleri için controller'ların yazılması
- WEB/MOBİL: API dokümantasyonu oluşturulması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.2-hafta2" etiketinin oluşturulması**

### Hafta 3: Kimlik Doğrulama ve Kullanıcı Yönetimi
- WEB/MOBİL: JWT tabanlı kimlik doğrulama sisteminin kurulması
- WEB/MOBİL: Kullanıcı kaydı, giriş ve çıkış API'lerinin geliştirilmesi
- WEB/MOBİL: Şifre sıfırlama ve e-posta doğrulama sisteminin kurulması
- WEB/MOBİL: Kullanıcı profil yönetimi API'lerinin geliştirilmesi
- WEB/MOBİL: Role-based yetkilendirme sisteminin kurulması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.3-hafta3" etiketinin oluşturulması**

### Hafta 4: Ürün ve İlan Yönetimi
- WEB/MOBİL: Ürün ekleme, düzenleme ve silme API'lerinin geliştirilmesi
- WEB/MOBİL: Ürün kategori sistemi oluşturulması
- WEB/MOBİL: Ürün arama ve filtreleme API'lerinin geliştirilmesi
- WEB/MOBİL: Ürün fotoğrafı yükleme ve işleme için Cloudinary entegrasyonu
- WEB/MOBİL: Takas tercihleri ve ayarları için API'lerin geliştirilmesi
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.4-hafta4" etiketinin oluşturulması**

### Hafta 5: Takas Sistemi
- WEB/MOBİL: Takas teklifi gönderme ve alma API'lerinin geliştirilmesi
- WEB/MOBİL: Takas tekliflerini kabul/reddetme mantığının oluşturulması
- WEB/MOBİL: Takas işlemi geçmişi ve durum takibi sisteminin geliştirilmesi
- WEB/MOBİL: Özel takas koşullarının belirlenmesi için API'lerin geliştirilmesi
- WEB/MOBİL: Akıllı eşleştirme algoritmasının temelleri
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.5-hafta5" etiketinin oluşturulması**

### Hafta 6: Mesajlaşma Sistemi
- WEB/MOBİL: Socket.io entegrasyonuyla gerçek zamanlı sohbet altyapısının kurulması
- WEB/MOBİL: Kullanıcılar arası mesajlaşma API'lerinin geliştirilmesi
- WEB/MOBİL: Mesaj okundu/okunmadı durumu takibi
- WEB/MOBİL: Mesaj bildirimleri sisteminin kurulması
- WEB/MOBİL: Sohbet geçmişi ve arşivleme fonksiyonlarının geliştirilmesi
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.6-hafta6" etiketinin oluşturulması**

### Hafta 7: Web Frontend Geliştirme (Temel)
- WEB: Responsive tasarım yapısının kurulması
- WEB: Temel UI komponentlerinin geliştirilmesi
- WEB: Kullanıcı giriş, kayıt ve profil sayfalarının oluşturulması
- WEB: Anasayfa ve kategori sayfalarının oluşturulması
- WEB: Navigasyon ve global state yönetiminin kurulması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.7-hafta7" etiketinin oluşturulması**

### Hafta 8: Web Frontend Geliştirme (İleri)
- WEB: Ürün listeleme ve detay sayfalarının geliştirilmesi
- WEB: Ürün ekleme ve düzenleme formlarının oluşturulması
- WEB: Filtreleme ve arama fonksiyonlarının entegrasyonu
- WEB: Takas teklifi gönderme ve alma kullanıcı arayüzünün geliştirilmesi
- WEB: Kullanıcı dashboard'unun oluşturulması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.8-hafta8" etiketinin oluşturulması**

### Hafta 9: Mobil Frontend Geliştirme (Temel)
- MOBİL: Temel UI komponentlerinin geliştirilmesi
- MOBİL: Tab ve Stack navigation yapısının kurulması
- MOBİL: Kullanıcı giriş, kayıt ve profil ekranlarının oluşturulması
- MOBİL: Anasayfa ve kategori ekranlarının oluşturulması
- MOBİL: Global state yönetiminin kurulması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.9-hafta9" etiketinin oluşturulması**

### Hafta 10: Mobil Frontend Geliştirme (İleri) ve Dağıtım Hazırlıkları
- MOBİL: Ürün listeleme ve detay ekranlarının geliştirilmesi
- MOBİL: Ürün ekleme ve düzenleme ekranlarının oluşturulması 
- MOBİL: Mobil kameradan fotoğraf çekme ve galeriden seçme entegrasyonu
- MOBİL: Takas teklifi gönderme ve alma kullanıcı arayüzünün geliştirilmesi
- MOBİL: Push notification sisteminin kurulması
- WEB: Web uygulamasının dağıtım için ilk hazırlıklarının yapılması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.10-hafta10" etiketinin oluşturulması**

### Hafta 11: Mesajlaşma Sistemi Entegrasyonu ve Güvenlik
- WEB: Mesajlaşma kullanıcı arayüzünün tamamlanması
- MOBİL: Mesajlaşma kullanıcı arayüzünün tamamlanması
- WEB/MOBİL: Socket.io ile gerçek zamanlı sohbetin entegrasyonu
- WEB/MOBİL: Birim testlerin ve entegrasyon testlerinin yazılması
- WEB/MOBİL: Güvenlik kontrollerinin yapılması ve açıkların kapatılması
- WEB: Web uygulamasının dağıtım için hazırlanması ve deployment
- MOBİL: App Store ve Google Play Store için uygulama paketlerinin hazırlanması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v0.11-hafta11" etiketinin oluşturulması**

### Hafta 12: Kullanılabilirlik Testleri ve Son Dokunuşlar
- WEB/MOBİL: Kullanılabilirlik testleri ve kullanıcı geri bildirimlerinin değerlendirilmesi
- WEB/MOBİL: Son kontroller ve ince ayarların yapılması
- WEB/MOBİL: Dokümantasyon ve kullanım kılavuzlarının hazırlanması
- **HAFTA SONU: Tüm görevlerin GitHub'a commit edilmesi ve "v1.0" final sürüm etiketinin oluşturulması**

## GitHub Commit Stratejisi

Her hafta için aşağıdaki commit stratejisini izleyeceğiz:

1. Her görev için ayrı commit'ler yapılacak (görev tamamlandıkça)
2. Açıklayıcı commit mesajları kullanılacak (ne yaptığınızı detaylı açıklayın)
3. Haftanın sonunda, o haftanın tüm görevlerini içeren bir "milestone commit" oluşturulacak
4. Her hafta sonunda yeni bir sürüm etiketi (tag) eklenecek (örn. "v0.1-hafta1", "v0.2-hafta2" vb.) 