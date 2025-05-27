import React from 'react';
import { Container, Row, Col, Card, Accordion } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const About = () => {
  // Sık sorulan sorular
  const faqs = [
    {
      question: 'Takas Platformu nasıl çalışır?',
      answer: 'Takas Platformu, kullanıcıların kullanmadıkları ürünleri satabilecekleri veya takas edebilecekleri bir platformdur. Ürününüzü platformda listeleyebilir, diğer kullanıcıların ürünlerine göz atabilir ve takas teklifleri gönderebilirsiniz. Ayrıca, ürünleri doğrudan satın alma seçeneği de bulunmaktadır.'
    },
    {
      question: 'Platformu kullanmanın maliyeti nedir?',
      answer: 'Temel platformu kullanmak tamamen ücretsizdir. Ürünlerinizi listeleyebilir, takas teklifleri gönderebilir ve alabilirsiniz. Satışlardan alınan küçük bir hizmet bedeli dışında ek ücret bulunmamaktadır.'
    },
    {
      question: 'Takas işlemi nasıl güvenli hale getiriliyor?',
      answer: 'Platformumuz, kullanıcılar arasında güvenli iletişim kanalları sağlar. Değerlendirme sistemi ile kullanıcıların güvenilirliği ölçülür. Ayrıca anlaşmazlık durumlarında devreye giren müşteri hizmetleri ekibimiz bulunmaktadır.'
    },
    {
      question: 'Hangi tür ürünler platformda takas edilebilir?',
      answer: 'Elektronik eşyalardan giyime, ev eşyalarından kitaplara kadar çeşitli kategorilerde ürün takası yapabilirsiniz. Yasadışı veya tehlikeli madde içeren ürünlerin platformda listelenmesi yasaktır.'
    }
  ];

  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero bg-primary text-white py-5 mb-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">İkinci El Eşyalara Yeni Hayat Veriyoruz</h1>
              <p className="fs-5 mb-4">
                Takas Platformu, 2025 yılında sürdürülebilir tüketimi desteklemek ve kullanılmayan eşyaların ekonomiye kazandırılmasını sağlamak amacıyla kuruldu.
              </p>
              <Link to="/products" className="btn btn-light btn-lg px-4 me-2">
                Ürünleri Keşfet
              </Link>
              <Link to="/register" className="btn btn-outline-light btn-lg px-4">
                Hemen Katıl
              </Link>
            </Col>
            <Col lg={6} className="text-center d-none d-lg-block">
              <img 
                src="/images/electronics.jpg" 
                alt="Takas Platformu" 
                className="img-fluid rounded shadow-lg" 
                style={{ maxHeight: '400px' }}
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* Mission and Vision */}
      <section className="py-5">
        <Container>
          <Row className="gx-5">
            <Col md={6} className="mb-4 mb-md-0">
              <div className="p-4 bg-light rounded-3 h-100">
                <h2 className="fw-bold mb-3">Misyonumuz</h2>
                <p className="lead mb-3">Kullanılmayan eşyaların yeniden değer kazanmasını sağlamak ve sürdürülebilir tüketimi teşvik etmek.</p>
                <p>
                  Takas Platformu olarak, israfı azaltmayı, kaynakların daha verimli kullanılmasını ve çevresel etkiyi en aza indirmeyi amaçlıyoruz. 
                  Kullanıcılarımıza güvenli, kolay ve keyifli bir takas deneyimi sunarak ekonomik ve çevresel fayda sağlıyoruz.
                </p>
              </div>
            </Col>
            <Col md={6}>
              <div className="p-4 bg-light rounded-3 h-100">
                <h2 className="fw-bold mb-3">Vizyonumuz</h2>
                <p className="lead mb-3">Türkiye'nin en büyük ve en güvenilir takas platformu olmak.</p>
                <p>
                  2025 yılına kadar Türkiye'nin her yerinden milyonlarca kullanıcının tercih ettiği, güvenle alışveriş ve takas yapabildiği 
                  bir platform olmayı hedefliyoruz. Teknolojimizi sürekli geliştirerek kullanıcı deneyimini en üst seviyeye çıkarmayı ve 
                  topluluğumuzu sürdürülebilir tüketim etrafında birleştirmeyi amaçlıyoruz.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Our Story */}
      <section className="py-5">
        <Container>
          <h2 className="text-center fw-bold mb-5">Hikayemiz</h2>
          <Row className="align-items-center">
            <Col lg={6} className="mb-4 mb-lg-0">
              <img 
                src="/images/banner1.jpg" 
                alt="Kuruluş Hikayemiz" 
                className="img-fluid rounded shadow"
              />
            </Col>
            <Col lg={6}>
              <div className="ps-lg-4">
                <h3 className="mb-3">Nasıl Başladık?</h3>
                <p className="mb-3">
                  Takas Platformu'nun hikayesi, kurucumuz Yusuf Afşar'ın evinde kullanmadığı eşyaları değerlendirmek istemesiyle başladı. 
                  İkinci el platformlarının sadece para karşılığı ürün satışına odaklandığını fark etti ve takas yapabileceği bir platform arayışına girdi.
                </p>
                <p className="mb-3">
                  Bu ihtiyaçtan yola çıkarak, 2025 yılında Takas Platformu'nu geliştirmeye başladı. İlk sürüm, sadece İstanbul'da 
                  hizmet veriyordu ve sınırlı kategorilerde takas imkanı sunuyordu. Kullanıcılardan gelen geri bildirimlerle platform hızla gelişti.
                </p>
                <p>
                  Ve her gün yüzlerce 
                  yeni ürün eklenmektedir. Çevre dostu yaklaşımımız ve kullanıcı odaklı geliştirmelerimizle büyümeye devam ediyoruz.
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-5">
        <Container>
          <h2 className="text-center fw-bold mb-5">Sık Sorulan Sorular</h2>
          <Row className="justify-content-center">
            <Col lg={8}>
              <Accordion>
                {faqs.map((faq, index) => (
                  <Accordion.Item eventKey={index.toString()} key={index}>
                    <Accordion.Header>{faq.question}</Accordion.Header>
                    <Accordion.Body>{faq.answer}</Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Call to Action */}
      <section className="py-5 bg-primary text-white text-center">
        <Container>
          <h2 className="fw-bold mb-3">Takas Platformuna Hemen Katılın</h2>
          <p className="lead mb-4">Kullanmadığınız eşyalara yeni bir hayat verin, ihtiyacınız olan ürünleri keşfedin!</p>
          <Link to="/register" className="btn btn-light btn-lg me-3">Üye Ol</Link>
          <Link to="/products" className="btn btn-outline-light btn-lg">Ürünleri Keşfet</Link>
        </Container>
      </section>

      {/* CSS styles for About page */}
      <style>
        {`
        .about-hero {
          background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
        }
        `}
      </style>
    </div>
  );
};

export default About; 