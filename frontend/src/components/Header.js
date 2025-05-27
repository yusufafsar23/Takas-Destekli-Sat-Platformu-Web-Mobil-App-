import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown, Badge, Form, Button, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

// Set to false to use actual message counts
const FORCE_SHOW_NOTIFICATION = false;

function Header() {
  const { user, logout } = useAuth();
  const { 
    unreadMessageCount, 
    unreadTradeOfferCount, 
    socket, 
    simulateNewMessage,
    fetchUnreadMessageCount,
    requestNotificationPermission
  } = useSocket();
  
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [hasAskedPermission, setHasAskedPermission] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  
  const navigate = useNavigate();
  
  // Debug için log - bildirim sayısını takip et
  useEffect(() => {
    console.log("Header - Unread Message Count:", unreadMessageCount);
  }, [unreadMessageCount]);
  
  // Debug için log - bildirim sayısını takip et
  useEffect(() => {
    console.log("Header - Unread Trade Offer Count:", unreadTradeOfferCount);
  }, [unreadTradeOfferCount]);
  
  // Bileşen yüklendiğinde bildirim sayısını güncelle
  useEffect(() => {
    if (user && user._id) {
      console.log("Header component mounted - Refreshing notification counts");
      fetchUnreadMessageCount();
    }
  }, [fetchUnreadMessageCount, user]);
  
  // Sayfa görünür olduğunda bildirim sayısını yenile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && user._id) {
        console.log("Tab became visible - refreshing notification counts");
        fetchUnreadMessageCount();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadMessageCount, user]);
  
  // Listen for new messages directly in the header component
  useEffect(() => {
    if (socket) {
      const handleDirectMessage = (messageData) => {
        console.log("HEADER: Direct message received:", messageData);
        
        // Mesajı bildirimin içeriğinde göster
        setShowToast(true);
        const senderName = messageData?.sender?.username || "Yeni mesaj";
        const messageText = messageData?.text || "Yeni bir mesaj aldınız";
        setToastMessage(`${senderName}: ${messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText}`);
        
        // Force refresh unread count when a message is received
        console.log("HEADER: Updating unread count after message");
        fetchUnreadMessageCount();
      };
      
      const handleCountUpdated = () => {
        console.log("HEADER: Message count update notification received");
        fetchUnreadMessageCount();
      };
      
      const handleConnect = () => {
        console.log("HEADER: Socket connected with ID:", socket.id);
      };
      
      const handleDisconnect = (reason) => {
        console.log("HEADER: Socket disconnected:", reason);
      };
      
      // Socket olaylarını dinle
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('newMessage', handleDirectMessage);
      socket.on('messageCountUpdated', handleCountUpdated);
      socket.on('refreshUnreadCount', handleCountUpdated);
      
      // Component temizleme
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('newMessage', handleDirectMessage);
        socket.off('messageCountUpdated', handleCountUpdated);
        socket.off('refreshUnreadCount', handleCountUpdated);
      };
    }
  }, [socket, fetchUnreadMessageCount]);
  
  // Bileşen yüklendiğinde bildirim izin durumunu kontrol et
  useEffect(() => {
    if (user && !hasAskedPermission && window.Notification && window.Notification.permission !== 'granted') {
      setShowToast(true);
      setToastMessage('Yeni mesaj bildirimlerini almak için izin verin.');
    }
  }, [user, hasAskedPermission]);
  
  // Çıkış yapma işlemi ve login sayfasına yönlendirme
  const handleLogout = () => {
    logout(() => {
      navigate('/login');
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const searchTerm = e.target.elements.search.value.trim();
    if (searchTerm) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
    }
  };
  
  // Test butonu - manuel olarak yeni mesaj simülasyonu
  const handleTestNotification = () => {
    console.log("HEADER: Triggering test notification");
    
    if (socket && socket.connected) {
      console.log("HEADER: Socket is connected, sending test message via socket");
      
      // Socket.io üzerinden doğrudan test mesajı gönder
      socket.emit('test:newMessage', {
        text: 'Test mesajı ' + new Date().toLocaleTimeString()
      });
      
      // Bildirim göster
      setShowToast(true);
      setToastMessage("Test bildirimi gönderildi. Mesaj alınacak...");
      
      // 2 saniye sonra bildirim sayacını güncelle
      setTimeout(() => {
        fetchUnreadMessageCount();
      }, 2000);
    } else {
      console.log("HEADER: Socket not connected, using local simulation only");
      simulateNewMessage();
      
      // Bildirim göster
      setShowToast(true);
      setToastMessage("Test bildirimi (yerel) oluşturuldu.");
    }
  };
  
  // Bildirim gösterilmeli mi kontrol ediyoruz
  const hasUnreadMessages = unreadMessageCount > 0;
  const hasUnreadTradeOffers = unreadTradeOfferCount > 0;

  // Mesajlar sayfasına gitme işlemi - sayfa değiştiğinde bildirimleri temizle
  const handleMessagesClick = () => {
    // Mesajlar sayfasına tıklandığında mesaj sayısını güncelle
    setTimeout(() => {
      fetchUnreadMessageCount();
    }, 300);
  };

  // Bildirim izni isteme
  const handleRequestPermission = async () => {
    try {
      const granted = await requestNotificationPermission();
      setHasAskedPermission(true);
      setShowToast(true);
      
      if (granted) {
        setToastMessage('Bildirim izni verildi. Artık yeni mesajları görebileceksiniz.');
      } else {
        setToastMessage('Bildirim izni reddedildi. Bildirimleri görmek için izin vermeniz gerekiyor.');
      }
    } catch (error) {
      console.error('Bildirim izni istenirken hata oluştu:', error);
      setShowToast(true);
      setToastMessage('Bildirim izni istenirken bir hata oluştu.');
    }
  };

  // Alt kategorileri göster/gizle
  const toggleCategory = (categoryId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeCategory === categoryId) {
      setActiveCategory(null);
    } else {
      setActiveCategory(categoryId);
    }
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="py-3 sticky-top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <span role="img" aria-label="logo" className="me-2">🔄</span>
            Takas Platformu
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="main-navbar-nav" />
          
          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/" exact="true">
                Ana Sayfa
              </Nav.Link>
              <Nav.Link as={NavLink} to="/products">
                Ürünler
              </Nav.Link>
              <NavDropdown title="Kategoriler" id="categories-dropdown">
                {/* Elektronik */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/1" className="category-item">
                    <span>Elektronik</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(1, e)}
                      aria-label="Toggle Electronics subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 1 ? 'rotated' : ''}`}></i>
                    </button>
                  </NavDropdown.Item>
                  {activeCategory === 1 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/1/101" className="subcategory-item">
                          — Bilgisayarlar
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/1/102" className="subcategory-item">
                          — Telefonlar
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/1/103" className="subcategory-item">
                          — Televizyonlar
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/1/104" className="subcategory-item">
                          — Ses Sistemleri
                        </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>

                {/* Ev Eşyaları */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/2" className="category-item">
                    <span>Ev Eşyaları</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(2, e)}
                      aria-label="Toggle Home Goods subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 2 ? 'rotated' : ''}`}></i>
                    </button>
                  </NavDropdown.Item>
                  {activeCategory === 2 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/2/201" className="subcategory-item">
                          — Mobilya
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/2/202" className="subcategory-item">
                          — Mutfak Eşyaları
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/2/203" className="subcategory-item">
                          — Yatak ve Banyo
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/2/204" className="subcategory-item">
                          — Dekorasyon
                        </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>

                {/* Giyim */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/3" className="category-item">
                    <span>Giyim</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(3, e)}
                      aria-label="Toggle Clothing subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 3 ? 'rotated' : ''}`}></i>
                    </button>
                  </NavDropdown.Item>
                  {activeCategory === 3 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/3/301" className="subcategory-item">
                          — Kadın Giyim
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/3/302" className="subcategory-item">
                          — Erkek Giyim
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/3/303" className="subcategory-item">
                          — Çocuk Giyim
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/3/304" className="subcategory-item">
                          — Ayakkabı ve Çanta
                        </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>

                {/* Kitap & Hobi */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/4" className="category-item">
                    <span>Kitap & Hobi</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(4, e)}
                      aria-label="Toggle Books & Hobbies subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 4 ? 'rotated' : ''}`}></i>
                    </button>
                  </NavDropdown.Item>
                  {activeCategory === 4 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/4/401" className="subcategory-item">
                          — Kitaplar
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/4/402" className="subcategory-item">
                          — Müzik & Film
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/4/403" className="subcategory-item">
                          — Koleksiyon
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/4/404" className="subcategory-item">
                          — El İşi
                        </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>

                {/* Spor */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/5" className="category-item">
                    <span>Spor</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(5, e)}
                      aria-label="Toggle Sports subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 5 ? 'rotated' : ''}`}></i>
                    </button>
                  </NavDropdown.Item>
                  {activeCategory === 5 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/5/501" className="subcategory-item">
                          — Spor Malzemeleri
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/5/502" className="subcategory-item">
                          — Outdoor
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/5/503" className="subcategory-item">
                          — Fitness
                </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/5/504" className="subcategory-item">
                          — Bisiklet & Scooter
                </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>

                {/* Oyun & Konsol */}
                <div className="category-container">
                  <NavDropdown.Item as={Link} to="/categories/6" className="category-item">
                    <span>Oyun & Konsol</span>
                    <button 
                      className="arrow-button" 
                      onClick={(e) => toggleCategory(6, e)}
                      aria-label="Toggle Games & Console subcategories"
                    >
                      <i className={`bi bi-chevron-down ${activeCategory === 6 ? 'rotated' : ''}`}></i>
                    </button>
                </NavDropdown.Item>
                  {activeCategory === 6 && (
                    <>
                      <NavDropdown.Divider />
                      <div className="subcategory-group">
                        <NavDropdown.Item as={Link} to="/categories/6/601" className="subcategory-item">
                          — Konsollar
                </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/6/602" className="subcategory-item">
                          — Oyunlar
                </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/categories/6/603" className="subcategory-item">
                          — Aksesuarlar
                </NavDropdown.Item>
                      </div>
                    </>
                  )}
                </div>
              </NavDropdown>
            </Nav>
            
            <Form className="d-flex mx-auto" onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  type="search"
                  placeholder="Ürün Ara..."
                  name="search"
                  aria-label="Search"
                  className="me-2"
                />
                <Button variant="outline-light" type="submit">
                  <i className="bi bi-search"></i>
                </Button>
              </InputGroup>
            </Form>
            
            <Nav>
              {user ? (
                <>
                  <Nav.Link as={NavLink} to="/products/add" className="btn btn-success btn-sm text-white me-2 d-flex align-items-center">
                    <i className="bi bi-plus-circle me-1"></i>
                    Ürün Ekle
                  </Nav.Link>
                  
                  <Nav.Link 
                    as={NavLink} 
                    to="/messages" 
                    className="position-relative me-3"
                    onClick={handleMessagesClick}
                  >
                    <div className="position-relative d-inline-block">
                      <i className={`bi bi-envelope${hasUnreadMessages ? '-fill text-danger' : ''} fs-5 ${hasUnreadMessages ? 'new-message-alert' : ''}`}></i>
                      {hasUnreadMessages && (
                        <Badge 
                          bg="danger" 
                          pill 
                          className="position-absolute top-0 start-100 translate-middle notification-badge pulsing-badge"
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            minWidth: "20px",
                            height: "20px",
                            border: "2px solid #fff",
                            boxShadow: "0 0 10px rgba(220, 53, 69, 0.9)",
                            zIndex: 1050
                          }}
                        >
                          {unreadMessageCount}
                        </Badge>
                      )}
                    </div>
                    <span className="ms-1">Mesajlar</span>
                  </Nav.Link>
                  
                  <NavDropdown 
                    title={
                      <span className="position-relative">
                        <i className="bi bi-person-circle me-1"></i>
                        {user.firstName}
                        {hasUnreadTradeOffers && (
                          <Badge bg="danger" pill className="position-absolute top-0 end-0 translate-middle notification-badge pulsing-badge" style={{ fontSize: '0.6rem' }}>
                            {unreadTradeOfferCount}
                          </Badge>
                        )}
                      </span>
                    } 
                    id="user-dropdown"
                  >
                    <NavDropdown.Item as={Link} to="/profile">
                      <i className="bi bi-person me-2"></i>
                      Profilim
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/dashboard">
                      <i className="bi bi-grid me-2"></i>
                      Hesabım
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/dashboard">
                      <i className="bi bi-box-seam me-2"></i>
                      Ürünlerim
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/dashboard?tab=received-offers" className="position-relative">
                      <i className="bi bi-arrow-down-circle me-2"></i>
                      Gelen Teklifler
                      {hasUnreadTradeOffers && (
                        <Badge bg="danger" pill className="ms-2 notification-badge pulsing-badge">
                          {unreadTradeOfferCount}
                        </Badge>
                      )}
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/dashboard?tab=sent-offers">
                      <i className="bi bi-arrow-up-circle me-2"></i>
                      Gönderilen Teklifler
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/messages" className="position-relative" onClick={handleMessagesClick}>
                      <i className={`bi bi-chat-dots${hasUnreadMessages ? '-fill text-danger' : ''} me-2 ${hasUnreadMessages ? 'new-message-alert' : ''}`}></i>
                      Mesajlar
                      {hasUnreadMessages && (
                        <Badge bg="danger" pill className="ms-2 notification-badge pulsing-badge">
                          {unreadMessageCount}
                        </Badge>
                      )}
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Çıkış Yap
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <>
                  <Nav.Link as={NavLink} to="/login">
                    Giriş Yap
                  </Nav.Link>
                  <Nav.Link as={NavLink} to="/register" className="btn btn-primary btn-sm text-white">
                    Kayıt Ol
                  </Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Bildirim Toast */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast 
          onClose={() => setShowToast(false)} 
          show={showToast} 
          delay={5000} 
          autohide 
          bg="dark"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Yeni Mesaj Bildirimleri</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
            {!hasAskedPermission && (
              <Button variant="light" size="sm" className="mt-2" onClick={handleRequestPermission}>
                Bildirimlere İzin Ver
              </Button>
            )}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
}

export default Header; 