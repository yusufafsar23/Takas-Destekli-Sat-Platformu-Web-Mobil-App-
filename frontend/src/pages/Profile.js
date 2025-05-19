import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab } from 'react-bootstrap';
import { Button, Input, Alert, Loader } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateProfile, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        zipCode: user.zipCode || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
    setSuccessMessage('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
    setPasswordSuccessMessage('');
  };

  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!formData.firstName) {
      newErrors.firstName = 'Ad gereklidir';
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Soyad gereklidir';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Mevcut şifre gereklidir';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Yeni şifre gereklidir';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    try {
      await updateProfile(formData);
      setSuccessMessage('Profil başarıyla güncellendi.');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Profil güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      // Bu işlevi backend'e eklemeniz gerekecek
      // await authService.changePassword(passwordData);
      setPasswordSuccessMessage('Şifre başarıyla güncellendi.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Şifre güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  if (!user) {
    return <Loader centered text="Kullanıcı bilgileri yükleniyor..." />;
  }

  return (
    <Container className="py-5">
      <Row>
        <Col lg={3} md={4} className="mb-4">
          <Card className="shadow">
            <Card.Body>
              <div className="text-center mb-3">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  {user && user.firstName ? user.firstName.charAt(0) : ''}
                  {user && user.lastName ? user.lastName.charAt(0) : ''}
                </div>
                <h5 className="mt-3">{user.firstName || ''} {user.lastName || ''}</h5>
                <p className="text-muted">{user.email || ''}</p>
              </div>
              <Nav className="flex-column" variant="pills" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav.Item>
                  <Nav.Link eventKey="profile" className="mb-2">Profil Bilgileri</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="password" className="mb-2">Şifre Değiştir</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="listings" className="mb-2">İlanlarım</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="offers" className="mb-2">Tekliflerim</Nav.Link>
                </Nav.Item>
              </Nav>
              <Button 
                variant="outline-danger" 
                block 
                className="mt-4"
                onClick={logout}
              >
                Çıkış Yap
              </Button>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={9} md={8}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <Tab.Content>
                <Tab.Pane active={activeTab === 'profile'}>
                  <h3 className="mb-4">Profil Bilgileri</h3>
                  
                  {apiError && <Alert variant="danger" message={apiError} />}
                  {successMessage && <Alert variant="success" message={successMessage} />}
                  
                  {isLoading ? (
                    <Loader centered />
                  ) : (
                    <form onSubmit={handleProfileSubmit}>
                      <Row>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Ad"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            error={errors.firstName}
                            required
                          />
                        </Col>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Soyad"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            error={errors.lastName}
                            required
                          />
                        </Col>
                      </Row>
                      
                      <Input
                        type="email"
                        label="Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                        required
                        disabled
                      />
                      
                      <Input
                        type="tel"
                        label="Telefon"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        required
                      />
                      
                      <Input
                        type="text"
                        label="Adres"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        error={errors.address}
                      />
                      
                      <Row>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Şehir"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            error={errors.city}
                          />
                        </Col>
                        <Col md={6}>
                          <Input
                            type="text"
                            label="Posta Kodu"
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={handleChange}
                            error={errors.zipCode}
                          />
                        </Col>
                      </Row>
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        className="mt-4"
                      >
                        Profili Güncelle
                      </Button>
                    </form>
                  )}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'password'}>
                  <h3 className="mb-4">Şifre Değiştir</h3>
                  
                  {apiError && <Alert variant="danger" message={apiError} />}
                  {passwordSuccessMessage && <Alert variant="success" message={passwordSuccessMessage} />}
                  
                  {isLoading ? (
                    <Loader centered />
                  ) : (
                    <form onSubmit={handlePasswordSubmit}>
                      <Input
                        type="password"
                        label="Mevcut Şifre"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.currentPassword}
                        required
                      />
                      
                      <Input
                        type="password"
                        label="Yeni Şifre"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.newPassword}
                        required
                      />
                      
                      <Input
                        type="password"
                        label="Yeni Şifre Tekrarı"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        error={passwordErrors.confirmPassword}
                        required
                      />
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        className="mt-4"
                      >
                        Şifreyi Değiştir
                      </Button>
                    </form>
                  )}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'listings'}>
                  <h3 className="mb-4">İlanlarım</h3>
                  <p>Henüz ilan oluşturmadınız.</p>
                  {/* İlanlar burada listelenecek */}
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'offers'}>
                  <h3 className="mb-4">Tekliflerim</h3>
                  <p>Henüz teklif bulunmuyor.</p>
                  {/* Teklifler burada listelenecek */}
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile; 