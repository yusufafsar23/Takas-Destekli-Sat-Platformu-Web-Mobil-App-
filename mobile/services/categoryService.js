import api from './api';

// Tüm kategorileri getirme
const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

// Üst kategorileri getirme (parent'ı olmayanlar)
const getMainCategories = async () => {
  const response = await api.get('/categories/main');
  return response.data;
};

// Alt kategorileri getirme
const getSubcategories = async (parentId) => {
  const response = await api.get(`/categories/${parentId}/subcategories`);
  return response.data;
};

// Kategori detayını getirme
const getCategory = async (id) => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

// Kategori detayını slug ile getirme
const getCategoryBySlug = async (slug) => {
  const response = await api.get(`/categories/slug/${slug}`);
  return response.data;
};

const categoryService = {
  getCategories,
  getMainCategories,
  getSubcategories,
  getCategory,
  getCategoryBySlug
};

export default categoryService; 