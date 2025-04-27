import api from './api';

// Kullanıcı girişi
const login = async (email, password, rememberMe = false) => {
  const response = await api.post('/users/login', {
    email,
    password,
    rememberMe
  });
  return response.data;
};

// Kullanıcı kaydı
const register = async (userData) => {
  const response = await api.post('/users/register', userData);
  return response.data;
};

// Kullanıcı çıkışı
const logout = async () => {
  await api.post('/users/logout');
};

// Şifre sıfırlama isteği
const forgotPassword = async (email) => {
  const response = await api.post('/users/forgot-password', { email });
  return response.data;
};

// Şifre sıfırlama
const resetPassword = async (token, newPassword) => {
  const response = await api.post('/users/reset-password', {
    token,
    newPassword
  });
  return response.data;
};

// E-posta doğrulama
const verifyEmail = async (token) => {
  const response = await api.post('/users/verify-email', { token });
  return response.data;
};

// Kullanıcı profili alma
const getProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

// Kullanıcı profili güncelleme
const updateProfile = async (userData) => {
  const response = await api.put('/users/profile', userData);
  return response.data;
};

// Şifre değiştirme
const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/users/password', {
    currentPassword,
    newPassword
  });
  return response.data;
};

const authService = {
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,
  updateProfile,
  changePassword
};

export default authService; 