import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Input, Alert, Loader } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const VerifyEmail = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { verifyEmail, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Get email from query parameter or state
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const stateEmail = location.state?.email;
    
    if (emailParam) {
      setEmail(emailParam);
    } else if (stateEmail) {
      setEmail(stateEmail);
    } else {
      // If no email provided, redirect to login
      setError('E-posta adresi bilgisi eksik. Lütfen tekrar giriş yapın.');
      setTimeout(() => navigate('/login'), 3000);
    }
    
    // Start countdown for resending code
    if (emailParam || stateEmail) {
      setCountdown(120); // 2 minutes countdown
    }
  }, [location, navigate]);

  useEffect(() => {
    // Countdown timer
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!verificationCode.trim()) {
      setError('Lütfen e-postanıza gönderilen doğrulama kodunu girin.');
      return;
    }
    
    try {
      await verifyEmail(verificationCode, email);
      setSuccess(true);
      
      // Redirect to home after successful verification
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Doğrulama başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  const handleCancel = () => {
    // Log out and redirect to login
    logout(() => {
      navigate('/login');
    });
  };

  const handleResendCode = async () => {
    // You would need to implement this endpoint in your API
    try {
      // Implement resend code functionality
      setError('');
      setCountdown(120); // Reset countdown
      // Notification for user
      setSuccess('Yeni doğrulama kodu e-posta adresinize gönderildi.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">E-posta Doğrulama</h2>
              
              {success && typeof success === 'string' ? (
                <Alert variant="success" message={success} />
              ) : success ? (
                <Alert variant="success" message="E-posta adresiniz başarıyla doğrulandı. Anasayfaya yönlendiriliyorsunuz..." />
              ) : null}
              
              {error && <Alert variant="danger" message={error} />}
              
              {isLoading ? (
                <Loader centered />
              ) : success ? null : (
                <div>
                  <p className="text-center mb-4">
                    <strong>{email}</strong> adresine bir doğrulama kodu gönderdik.<br />
                    Lütfen e-postanızı kontrol edin ve aşağıya kodu girin.
                  </p>
                  
                  <form onSubmit={handleSubmit}>
                    <Input
                      type="text"
                      label="Doğrulama Kodu"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="6 haneli kodu girin"
                      required
                    />
                    
                    <div className="d-grid gap-2 mt-4">
                      <Button type="submit" variant="primary" block>
                        Doğrula
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline-secondary" 
                        block
                        onClick={handleCancel}
                      >
                        İptal
                      </Button>
                    </div>
                    
                    <div className="text-center mt-3">
                      {countdown > 0 ? (
                        <p>Yeni kod için: {formatTime(countdown)}</p>
                      ) : (
                        <Button 
                          type="button" 
                          variant="link" 
                          onClick={handleResendCode}
                          className="p-0"
                        >
                          Yeni kod gönder
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default VerifyEmail; 