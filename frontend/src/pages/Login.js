import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Alert, Loader } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const { login, isLoading } = useAuth();
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setApiError(err.response?.data?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Giriş Yap</h2>
              
              {apiError && <Alert variant="danger" message={apiError} />}
              
              {isLoading ? (
                <Loader centered />
              ) : (
                <form onSubmit={handleSubmit}>
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
                    type="password"
                    label="Şifre"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Şifrenizi girin"
                    error={errors.password}
                    required
                  />
                  
                  <Button 
                    type="submit" 
                    variant="primary" 
                    block 
                    className="mt-4"
                  >
                    Giriş Yap
                  </Button>
                  
                  <div className="text-center mt-3">
                    <p>
                      Hesabınız yok mu? <Link to="/register">Kayıt Ol</Link>
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

export default Login; 