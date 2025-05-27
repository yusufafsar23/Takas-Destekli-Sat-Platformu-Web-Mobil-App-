import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Alert, Loader } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username) {
      newErrors.username = 'Kullanıcı adı gereklidir';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }
    
    if (!formData.fullName) {
      newErrors.fullName = 'Ad Soyad gereklidir';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }
    
    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gereklidir';
    } else if (!/^\d{10,11}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // Exclude confirmPassword from API call
      const { confirmPassword, ...registerData } = formData;
      
      console.log('Kayıt verileri:', registerData); // Debug için
      
      await register(registerData);
      navigate('/');
    } catch (err) {
      console.error('Kayıt hatası:', err); // Debug için
      setApiError(err.response?.data?.message || 'Kayıt yapılamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Kayıt Ol</h2>
              
              {apiError && <Alert variant="danger" message={apiError} />}
              
              {isLoading ? (
                <Loader centered />
              ) : (
                <form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Input
                        type="text"
                        label="Kullanıcı Adı"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Kullanıcı adınızı girin"
                        error={errors.username}
                        required
                      />
                    </Col>
                    <Col md={6}>
                      <Input
                        type="text"
                        label="Ad Soyad"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Ad soyadınızı girin"
                        error={errors.fullName}
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
                    placeholder="Email adresinizi girin"
                    error={errors.email}
                    required
                  />
                  
                  <Input
                    type="tel"
                    label="Telefon"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Telefon numaranızı girin"
                    error={errors.phone}
                    required
                  />
                  
                  <Input
                    type="password"
                    label="Şifre"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Şifrenizi girin"
                    error={errors.password}
                    required
                  />
                  
                  <Input
                    type="password"
                    label="Şifre Tekrarı"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Şifrenizi tekrar girin"
                    error={errors.confirmPassword}
                    required
                  />
                  
                  <Button 
                    type="submit" 
                    variant="primary" 
                    block 
                    className="mt-4"
                  >
                    Kayıt Ol
                  </Button>
                  
                  <div className="text-center mt-3">
                    <p>
                      Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
                    </p>
                  </div>
                </form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Register; 