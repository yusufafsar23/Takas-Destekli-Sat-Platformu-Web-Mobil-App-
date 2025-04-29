import api from './api';

// Ürünleri getirme
const getProducts = async (filters) => {
  const response = await api.get('/products', { params: filters });
  return response.data;
};

// Öne çıkan ürünleri getirme
const getFeaturedProducts = async () => {
  const response = await api.get('/products/featured');
  return response.data;
};

// Kullanıcının ürünlerini getirme
const getUserProducts = async (userId) => {
  const response = await api.get(`/products/user/${userId}`);
  return response.data;
};

// Ürün detayını getirme
const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Ürün detayını slug ile getirme
const getProductBySlug = async (slug) => {
  const response = await api.get(`/products/slug/${slug}`);
  return response.data;
};

// Ürün oluşturma
const createProduct = async (productData) => {
  const response = await api.post('/products', productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Ürün güncelleme
const updateProduct = async (id, productData) => {
  const response = await api.put(`/products/${id}`, productData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Ürün silme
const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

// Ürünü favorilere ekleme/çıkarma
const toggleFavorite = async (id) => {
  const response = await api.post(`/products/${id}/favorite`);
  return response.data;
};

const productService = {
  getProducts,
  getFeaturedProducts,
  getUserProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFavorite
};

export default productService; 