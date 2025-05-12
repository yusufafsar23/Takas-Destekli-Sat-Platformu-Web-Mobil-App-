import React from 'react';

function Home() {
  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Takas Destekli Satış Platformu</h1>
        <p>Hem sıfır hem de ikinci el ürünlerin alım satımının yapılabildiği, takas özelliği ile desteklenen e-ticaret platformu.</p>
      </header>
      <main className="home-main">
        <section className="feature-section">
          <h2>Özellikler</h2>
          <div className="features">
            <div className="feature-card">
              <h3>Ürün Satışı</h3>
              <p>Sahip olduğunuz ürünleri kolayca satışa çıkarın.</p>
            </div>
            <div className="feature-card">
              <h3>Takas İmkanı</h3>
              <p>Satın almak yerine elinizde bulunan ürünler ile takas yapın.</p>
            </div>
            <div className="feature-card">
              <h3>Mesajlaşma</h3>
              <p>Satıcılar ile doğrudan iletişime geçin.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home; 