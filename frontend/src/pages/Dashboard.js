import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { productService, tradeOfferService } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    unreadMessageCount, 
    unreadTradeOfferCount, 
    markTradeOfferNotificationsAsRead,
    socket,
    fetchUnreadMessageCount
  } = useSocket();
  
  // URL'den tab parametresini al
  const queryParams = new URLSearchParams(location.search);
  const tabParam = queryParams.get('tab');
  
  // State
  const [myProducts, setMyProducts] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(
    tabParam ? tabParam : 'products'
  );
  const [hasExplicitlySelectedTab, setHasExplicitlySelectedTab] = useState(!!tabParam);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    pendingOffers: 0,
    activeProducts: 0,
    totalProducts: 0
  });
  
  // Auto-switch to received-offers tab when there are pending offers
  useEffect(() => {
    if (!hasExplicitlySelectedTab && unreadTradeOfferCount > 0) {
      setActiveTab('received-offers');
    }
  }, [unreadTradeOfferCount, hasExplicitlySelectedTab]);
  
  // Handle tab change with explicit user selection
  const handleTabSelect = (key) => {
    if (key === "messages") {
      // Mesajlar tab'ına tıklandığında mesajlar sayfasına yönlendir
      navigate('/messages');
      return;
    }
    
    setActiveTab(key);
    setHasExplicitlySelectedTab(true);
  };
  
  // Monitor unread messages count
  useEffect(() => {
    console.log('Dashboard: Unread message count updated:', unreadMessageCount);
    setStats(prev => ({
      ...prev,
      unreadMessages: unreadMessageCount
    }));
  }, [unreadMessageCount]);
  
  // Listen for socket notifications
  useEffect(() => {
    if (socket) {
      const handleNewMessage = (messageData) => {
        console.log('Dashboard: New message notification received', messageData);
        // Update unread message count in stats
        setStats(prev => ({
          ...prev,
          unreadMessages: prev.unreadMessages + 1
        }));
      };
      
      const handleMessageCountUpdated = () => {
        console.log('Dashboard: Message count update notification received');
        fetchUnreadMessageCount();
      };
      
      socket.on('newMessage', handleNewMessage);
      socket.on('messageCountUpdated', handleMessageCountUpdated);
      socket.on('refreshUnreadCount', handleMessageCountUpdated);
      
      return () => {
        socket.off('newMessage', handleNewMessage);
        socket.off('messageCountUpdated', handleMessageCountUpdated);
        socket.off('refreshUnreadCount', handleMessageCountUpdated);
      };
    }
  }, [socket, fetchUnreadMessageCount]);
  
  // Tab değiştiğinde URL'i güncelle
  useEffect(() => {
    if (activeTab !== 'products') {
      navigate(`/dashboard?tab=${activeTab}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [activeTab, navigate]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Fetch user's products
  useEffect(() => {
    const fetchMyProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await productService.getUserProducts(user?._id);
        
        // Handle both response formats and ensure we have an array
        let products = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          products = response.data.data;
        } else if (response?.data?.products && Array.isArray(response.data.products)) {
          products = response.data.products;
        } else if (response?.data && Array.isArray(response.data)) {
          products = response.data;
        } else if (Array.isArray(response)) {
          products = response;
        }
        
        console.log("Fetched products:", products);
        setMyProducts(products);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalProducts: products.length,
          activeProducts: products.filter(p => p?.isActive || p?.status === 'active').length
        }));
      } catch (err) {
        console.error('Ürünler yüklenirken hata oluştu:', err);
        setError('Ürünleriniz yüklenirken bir hata oluştu.');
        setMyProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    if (user) {
      fetchMyProducts();
    }
  }, [user]);
  
  // Fetch trade offers
  useEffect(() => {
    const fetchTradeOffers = async () => {
      try {
        setLoadingOffers(true);
        const response = await tradeOfferService.getMyTradeOffers();
        
        // Handle both response formats and ensure we have an array
        let offers = [];
        if (response?.data?.data && Array.isArray(response.data.data)) {
          offers = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          offers = response.data;
        } else if (Array.isArray(response)) {
          offers = response;
        }
        
        // Separate received and sent offers based on isSender/isReceiver flags
        const received = [];
        const sent = [];
        
        offers.forEach(offer => {
          // ID düzeltmesi - MongoDB'den gelen _id'yi id olarak da ekle
          if (offer._id && !offer.id) {
            offer.id = offer._id;
          }
          
          // Debug için log ekleyelim
          console.log('Takas teklifi:', { 
            id: offer.id, 
            _id: offer._id, 
            status: offer.status,
            isSender: offer.isSender, 
            isReceiver: offer.isReceiver,
            requestedFrom: offer.requestedFrom?._id,
            offeredBy: offer.offeredBy?._id,
            userId: user?._id
          });
          
          // Check if the offer has the new isSender/isReceiver flags
          if (offer.hasOwnProperty('isSender') && offer.hasOwnProperty('isReceiver')) {
            if (offer.isReceiver) {
              received.push(offer);
            }
            if (offer.isSender) {
              sent.push(offer);
            }
          } else {
            // Fallback to the old logic
            if (offer?.requestedFrom?._id === user?._id) {
              received.push(offer);
            } else if (offer?.offeredBy?._id === user?._id) {
              sent.push(offer);
            }
          }
        });
        
        console.log('Received offers:', received.length);
        console.log('Sent offers:', sent.length);
        
        setReceivedOffers(received);
        setSentOffers(sent);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingOffers: offers.filter(o => o?.status === 'pending').length,
          acceptedOffers: offers.filter(o => o?.status === 'accepted').length
        }));
      } catch (err) {
        console.error('Takas teklifleri yüklenirken hata oluştu:', err);
        setError('Takas teklifleri yüklenirken bir hata oluştu.');
        setReceivedOffers([]);
        setSentOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    };
    
    if (user) {
      fetchTradeOffers();
    }
  }, [user]);
  
  // Mark trade offers as read when viewing the offers tab
  useEffect(() => {
    if (activeTab === 'received-offers' && markTradeOfferNotificationsAsRead) {
      markTradeOfferNotificationsAsRead();
    }
  }, [activeTab, markTradeOfferNotificationsAsRead]);
  
  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      // Silinecek ürün ID'sini log'a yazdır
      console.log('Silinecek ürün ID:', productId);
      
      try {
        // ID'yi kontrol et ve doğru formatta olduğundan emin ol
        const id = productId?._id || productId?.id || productId;
        console.log('Silinecek düzeltilmiş ürün ID:', id);
        
        const response = await productService.deleteProduct(id);
        console.log('Silme işlemi yanıtı:', response);
        
        // Başarılı silme işlemi sonrası UI'ı güncelle
        setMyProducts(prev => prev.filter(p => (p.id !== id && p._id !== id)));
        setStats(prev => ({
          ...prev,
          totalProducts: prev.totalProducts - 1,
          activeProducts: prev.activeProducts - 1
        }));
        
        // Başarı mesajı göster
        alert('Ürün başarıyla silindi');
      } catch (err) {
        console.error('Ürün silinirken hata oluştu:', err);
        console.error('Hata detayları:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(`Ürün silinirken bir hata oluştu: ${err.response?.data?.message || err.message}`);
      }
    }
  };
  
  const handleRespondToOffer = async (offerId, response) => {
    try {
      await tradeOfferService.respondToTradeOffer(offerId, { response });
      
      // Update offer status in the list
      setReceivedOffers(prev => 
        prev.map(offer => 
          (offer.id === offerId || offer._id === offerId)
            ? { ...offer, status: response === 'accept' ? 'accepted' : 'rejected' } 
            : offer
        )
      );
      
      // Update stats
      if (response === 'accept') {
        setStats(prev => ({
          ...prev,
          pendingOffers: prev.pendingOffers - 1,
          acceptedOffers: prev.acceptedOffers + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          pendingOffers: prev.pendingOffers - 1
        }));
      }
    } catch (err) {
      console.error('Takas teklifine yanıt verilirken hata oluştu:', err);
      setError('Takas teklifine yanıt verilirken bir hata oluştu.');
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge bg="warning">Bekliyor</Badge>;
      case 'accepted':
        return <Badge bg="success">Kabul Edildi</Badge>;
      case 'rejected':
        return <Badge bg="danger">Reddedildi</Badge>;
      case 'cancelled':
        return <Badge bg="secondary">İptal Edildi</Badge>;
      case 'completed':
        return <Badge bg="primary">Tamamlandı</Badge>;
      default:
        return <Badge bg="info">{status}</Badge>;
    }
  };
  
  if (!user) {
    return null; // Let the useEffect handle redirect
  }
  
  return (
    <Container className="py-4">
      <h1 className="mb-4">Hesabım</h1>
      
      {error && (
        <Alert variant="danger">{error}</Alert>
      )}
      
      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="dashboard-stat-card">
            <Card.Body>
              <div className="stat-content">
                <h3>{stats.totalProducts}</h3>
                <p>Toplam Ürün</p>
              </div>
              <div className="stat-icon">
                <i className="bi bi-box-seam"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className={`dashboard-stat-card ${stats.pendingOffers > 0 ? 'border-danger' : ''}`}>
            <Card.Body>
              <div className="stat-content">
                <h3 className={stats.pendingOffers > 0 ? 'text-danger' : ''}>{stats.pendingOffers}</h3>
                <p>Bekleyen Teklif</p>
              </div>
              <div className="stat-icon">
                <i className={`bi bi-arrow-repeat ${stats.pendingOffers > 0 ? 'text-danger' : ''}`}></i>
                {stats.pendingOffers > 0 && <span className="notification-dot"></span>}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="dashboard-stat-card">
            <Card.Body>
              <div className="stat-content">
                <h3>{stats.acceptedOffers}</h3>
                <p>Kabul Edilen Teklif</p>
              </div>
              <div className="stat-icon">
                <i className="bi bi-check2-circle"></i>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card 
            className={`dashboard-stat-card ${stats.unreadMessages > 0 ? 'border-danger cardPulse' : ''}`}
            onClick={() => navigate('/messages')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="stat-content">
                <h3 className={stats.unreadMessages > 0 ? 'text-danger textPulse' : ''}>
                  {stats.unreadMessages}
                </h3>
                <p className={stats.unreadMessages > 0 ? 'text-danger' : ''}>
                  Okunmamış Mesaj
                </p>
              </div>
              <div className="stat-icon">
                <i className={`bi bi-envelope ${stats.unreadMessages > 0 ? 'text-danger iconPulse' : ''}`}></i>
                {stats.unreadMessages > 0 && <span className="notification-dot"></span>}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Main Content */}
      <Card>
        <Card.Header>
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabSelect}
            className="mb-3"
          >
            <Tab eventKey="products" title="Ürünlerim">
              {loadingProducts ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                  </Spinner>
                </div>
              ) : !myProducts || !Array.isArray(myProducts) || myProducts.length === 0 ? (
                <div className="text-center py-5">
                  <p>Henüz hiç ürün eklememişsiniz.</p>
                  <Button 
                    variant="primary" 
                    className="mt-2"
                    onClick={() => navigate('/products/add')}
                  >
                    Ürün Ekle
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Resim</th>
                      <th>Ürün Adı</th>
                      <th>Fiyat</th>
                      <th>Durum</th>
                      <th>Kategori</th>
                      <th>Eklenme Tarihi</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myProducts.map(product => (
                      <tr key={product?.id || Math.random()}>
                        <td style={{ width: '80px' }}>
                          {product?.images && Array.isArray(product.images) && product.images.length > 0 ? (
                            <img 
                              src={typeof product.images[0] === 'string' 
                                  ? product.images[0] 
                                  : product.images[0]?.url || product.images[0]?.path || '/placeholder.png'} 
                              alt={product?.title || 'Ürün'} 
                              className="img-thumbnail" 
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div 
                              className="no-image-thumbnail" 
                              style={{ width: '60px', height: '60px' }}
                            >
                              <i className="bi bi-card-image"></i>
                            </div>
                          )}
                        </td>
                        <td>
                          <Link to={`/products/${product?.id || ''}`} className="product-title-link">
                            {product?.title || 'İsimsiz Ürün'}
                          </Link>
                        </td>
                        <td>
                          {product?.price ? `${product.price} ₺` : 'Sadece Takas'}
                        </td>
                        <td>
                          <Badge bg={product?.isActive || product?.status === 'active' ? 'success' : 'secondary'}>
                            {product?.status === 'active' || product?.isActive ? 'Aktif' : 
                             product?.status === 'sold' ? 'Satıldı' :
                             product?.status === 'reserved' ? 'Rezerve' : 'Pasif'}
                          </Badge>
                        </td>
                        <td>{product?.category?.name || '-'}</td>
                        <td>{product?.createdAt ? new Date(product.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => navigate(`/products/edit/${product?.id || ''}`)}
                            >
                              Düzenle
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                            >
                              Sil
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Tab>
            
            <Tab 
              eventKey="received-offers" 
              title={
                <span className="tab-notification-wrapper">
                  Gelen Takas Teklifleri
                  {receivedOffers && receivedOffers.some(offer => offer.status === 'pending') && (
                    <Badge bg="danger" pill className="position-absolute top-0 end-0 translate-middle">
                      {receivedOffers.filter(offer => offer.status === 'pending').length}
                    </Badge>
                  )}
                </span>
              }
            >
              {loadingOffers ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                  </Spinner>
                </div>
              ) : !receivedOffers || !Array.isArray(receivedOffers) || receivedOffers.length === 0 ? (
                <div className="text-center py-5">
                  <p>Henüz takas teklifi almadınız.</p>
                </div>
              ) : (
                <div className="trade-offers-list p-3">
                  {receivedOffers.map(offer => (
                    <Card key={offer?.id || Math.random()} className="mb-3 trade-offer-card">
                      <Card.Body>
                        <Row>
                          <Col md={8}>
                            <div className="trade-offer-details">
                              <h5>
                                <Link to={`/products/${offer?.requestedProduct?.id || ''}`}>
                                  {offer?.requestedProduct?.title || 'Ürün'}
                                </Link>
                                {' '}için takas teklifi
                              </h5>
                              <p className="text-muted">
                                <small>
                                  {offer?.createdAt ? new Date(offer.createdAt).toLocaleString('tr-TR') : '-'}
                                </small>
                              </p>
                              <div className="offered-products mb-3">
                                <strong>Teklif Edilen Ürünler:</strong>
                                <ul className="list-unstyled">
                                  {offer?.offeredProduct ? (
                                    <li key={offer.offeredProduct?.id || offer.offeredProduct?._id || Math.random()} className="d-flex align-items-center gap-2 mt-2">
                                      {offer.offeredProduct?.images && Array.isArray(offer.offeredProduct.images) && offer.offeredProduct.images.length > 0 ? (
                                        <img 
                                          src={typeof offer.offeredProduct.images[0] === 'string' 
                                              ? offer.offeredProduct.images[0] 
                                              : offer.offeredProduct.images[0]?.url || offer.offeredProduct.images[0]?.path || '/placeholder.png'} 
                                          alt={offer.offeredProduct?.title || 'Ürün'} 
                                          className="img-thumbnail" 
                                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <div className="no-image-thumbnail-sm">
                                          <i className="bi bi-card-image"></i>
                                        </div>
                                      )}
                                      <Link to={`/products/${offer.offeredProduct?.id || offer.offeredProduct?._id || ''}`}>
                                        {offer.offeredProduct?.title || 'İsimsiz Ürün'}
                                      </Link>
                                      {' '}
                                      <span className="text-muted">
                                        {offer.offeredProduct?.price ? `(${offer.offeredProduct.price} ₺)` : '(Sadece Takas)'}
                                      </span>
                                    </li>
                                  ) : (
                                    <li>Teklif edilen ürün bilgisi bulunamadı</li>
                                  )}
                                </ul>
                              </div>
                              {offer?.note && (
                                <div className="offer-note p-2 bg-light rounded">
                                  <small>{offer.note}</small>
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col md={4} className="d-flex flex-column justify-content-center align-items-center">
                            <div className="text-center mb-3">
                              <strong>Durum:</strong>{' '}
                              {getStatusBadge(offer?.status || 'pending')}
                            </div>
                            
                            {offer?.status === 'pending' && (
                              <div className="d-grid gap-2">
                                <Button 
                                  variant="success" 
                                  size="sm"
                                  onClick={() => handleRespondToOffer(offer?.id, 'accept')}
                                >
                                  Kabul Et
                                </Button>
                                <Button 
                                  variant="danger" 
                                  size="sm"
                                  onClick={() => handleRespondToOffer(offer?.id, 'reject')}
                                >
                                  Reddet
                                </Button>
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm"
                                  onClick={() => navigate('/messages', { 
                                    state: { 
                                      newConversation: true, 
                                      participantId: offer?.requestedFrom?._id,
                                      productId: offer?.requestedProduct?.id || offer?.requestedProduct?._id,
                                      tradeOfferId: offer?.id || offer?._id
                                    }
                                  })}
                                >
                                  Satıcıya Mesaj Gönder
                                </Button>
                              </div>
                            )}
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>
            
            <Tab 
              eventKey="sent-offers" 
              title={
                <span className="tab-notification-wrapper">
                  Gönderilen Takas Teklifleri
                  {sentOffers && sentOffers.some(offer => offer.status === 'pending') && (
                    <Badge bg="danger" pill className="position-absolute top-0 end-0 translate-middle">
                      {sentOffers.filter(offer => offer.status === 'pending').length}
                    </Badge>
                  )}
                </span>
              }
            >
              {loadingOffers ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Yükleniyor...</span>
                  </Spinner>
                </div>
              ) : !sentOffers || !Array.isArray(sentOffers) || sentOffers.length === 0 ? (
                <div className="text-center py-5">
                  <p>Henüz takas teklifi göndermediniz.</p>
                </div>
              ) : (
                <div className="trade-offers-list p-3">
                  {sentOffers.map(offer => (
                    <Card key={offer?.id || offer?._id || Math.random()} className="mb-3 trade-offer-card">
                      <Card.Body>
                        <Row>
                          <Col md={8}>
                            <div className="trade-offer-details">
                              <h5>
                                <Link to={`/products/${offer?.requestedProduct?.id || offer?.requestedProduct?._id || ''}`}>
                                  {offer?.requestedProduct?.title || 'Ürün'}
                                </Link>
                                {' '}için takas teklifiniz
                              </h5>
                              <p className="text-muted">
                                <small>
                                  {offer?.createdAt ? new Date(offer.createdAt).toLocaleString('tr-TR') : '-'}
                                </small>
                              </p>
                              <div className="offered-products mb-3">
                                <strong>Teklif Ettiğiniz Ürün:</strong>
                                <ul className="list-unstyled">
                                  {offer?.offeredProduct ? (
                                    <li key={offer.offeredProduct?.id || offer.offeredProduct?._id || Math.random()} className="d-flex align-items-center gap-2 mt-2">
                                      {offer.offeredProduct?.images && Array.isArray(offer.offeredProduct.images) && offer.offeredProduct.images.length > 0 ? (
                                        <img 
                                          src={typeof offer.offeredProduct.images[0] === 'string' 
                                              ? offer.offeredProduct.images[0] 
                                              : offer.offeredProduct.images[0]?.url || offer.offeredProduct.images[0]?.path || '/placeholder.png'} 
                                          alt={offer.offeredProduct?.title || 'Ürün'} 
                                          className="img-thumbnail" 
                                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <div className="no-image-thumbnail-sm">
                                          <i className="bi bi-card-image"></i>
                                        </div>
                                      )}
                                      <Link to={`/products/${offer.offeredProduct?.id || offer.offeredProduct?._id || ''}`}>
                                        {offer.offeredProduct?.title || 'İsimsiz Ürün'}
                                      </Link>
                                      {' '}
                                      <span className="text-muted">
                                        {offer.offeredProduct?.price ? `(${offer.offeredProduct.price} ₺)` : '(Sadece Takas)'}
                                      </span>
                                    </li>
                                  ) : (
                                    <li>Teklif ettiğiniz ürün bilgisi bulunamadı</li>
                                  )}
                                </ul>
                              </div>
                              {offer?.message && (
                                <div className="offer-note p-2 bg-light rounded">
                                  <strong>Not:</strong> <small>{offer.message}</small>
                                </div>
                              )}
                            </div>
                          </Col>
                          <Col md={4} className="d-flex flex-column justify-content-center align-items-center">
                            <div className="text-center mb-3">
                              <strong>Durum:</strong>{' '}
                              {getStatusBadge(offer?.status || 'pending')}
                            </div>
                            
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => navigate('/messages', { 
                                state: { 
                                  newConversation: true, 
                                  participantId: offer?.requestedFrom?._id,
                                  productId: offer?.requestedProduct?.id || offer?.requestedProduct?._id,
                                  tradeOfferId: offer?.id || offer?._id
                                }
                              })}
                            >
                              Satıcıya Mesaj Gönder
                            </Button>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab>
            
            <Tab 
              eventKey="messages" 
              title={
                <span className="tab-notification-wrapper">
                  Mesajlar
                  {stats.unreadMessages > 0 && (
                    <Badge 
                      bg="danger" 
                      pill 
                      className="position-absolute top-0 end-0 translate-middle pulsing-badge"
                    >
                      {stats.unreadMessages}
                    </Badge>
                  )}
                </span>
              }
            >
              <div className="text-center py-5">
                <p>Okunmamış mesajlarınızı görüntülemek için mesajlar sayfasına gidin.</p>
                <Button 
                  variant={stats.unreadMessages > 0 ? "danger" : "primary"} 
                  className={`mt-2 ${stats.unreadMessages > 0 ? 'pulsing-button' : ''}`}
                  onClick={() => navigate('/messages')}
                >
                  {stats.unreadMessages > 0 ? `${stats.unreadMessages} Okunmamış Mesaj` : 'Mesajlar Sayfasına Git'}
                </Button>
              </div>
            </Tab>
          </Tabs>
        </Card.Header>
        <Card.Body>
          <div className="tab-content">
            {/* Tab content is rendered by the Tab components */}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard; 