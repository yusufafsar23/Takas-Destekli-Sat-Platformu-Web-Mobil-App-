import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import api from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Countdown for auto-redirect after success
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate('/login');
    }
  }, [success, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Lütfen doğrulama kodunu giriniz.');
      return;
    }

    if (!email) {
      setError('E-posta adresi bulunamadı. Lütfen kaydolma işlemini tekrarlayınız.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API to verify email with verification code
      const response = await api.post('/users/verify-email', {
        code: verificationCode,
        email: email
      });

      setSuccess(true);
      setCountdown(5); // 5 second countdown

      // Store token if available
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(
        err.response?.data?.error || 
        'Doğrulama işlemi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            E-posta Doğrulama
          </Typography>

          {success ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <VerifiedIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                E-posta adresiniz başarıyla doğrulandı!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {countdown} saniye içinde giriş sayfasına yönlendirileceksiniz...
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Hemen Giriş Yap
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="body1" paragraph>
                Takas platformuna kayıt olduğunuz için teşekkür ederiz!
              </Typography>
              <Typography variant="body1" paragraph>
                {email ? `${email} adresine` : "E-posta adresinize"} gönderilen 6 haneli doğrulama kodunu aşağıya girerek hesabınızı aktifleştirebilirsiniz.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ my: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Doğrulama Kodu"
                  variant="outlined"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="6 haneli kodu giriniz"
                  inputProps={{
                    maxLength: 6,
                    inputMode: 'numeric',
                    pattern: '[0-9]*'
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">#</InputAdornment>,
                  }}
                  sx={{ mb: 3 }}
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading || verificationCode.length !== 6}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Doğrula'}
                </Button>
              </Box>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Doğrulama kodu almadınız mı?
                </Typography>
                <Button 
                  color="primary"
                  onClick={() => {/* Implement resend code functionality */}}
                  disabled={loading}
                  sx={{ mt: 1 }}
                >
                  Tekrar Gönder
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyEmail; 