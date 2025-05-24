import api from './api';

// Tüm kategorileri getirme
const getCategories = async () => {
  try {
    console.log('Fetching all categories');
    const response = await api.get('/categories');
    console.log('Categories response:', JSON.stringify({
      success: response.data?.success,
      count: response.data?.count || response.data?.data?.length || 0
    }));

    // Handle the response format properly
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      // Standardized backend response format
      return response.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Direct array response (legacy format)
      return {
        success: true,
        count: response.data.length,
        data: response.data
      };
    } else if (response.data && typeof response.data === 'object') {
      // Handle any other format
      console.log('Unexpected category response format:', response.data);
      return {
        success: true,
        count: 0,
        data: []
      };
    }
    
    // Default empty response
    return {
      success: false,
      count: 0,
      data: []
    };
  } catch (error) {
    console.error('Error fetching categories:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Return empty data structure on error
    return {
      success: false,
      count: 0,
      data: []
    };
  }
};

// Üst kategorileri getirme (parent'ı olmayanlar)
const getMainCategories = async () => {
  try {
    console.log('Fetching main categories');
    const response = await api.get('/categories/main');
    console.log('Main categories response:', JSON.stringify({
      success: response.data?.success,
      count: response.data?.count || response.data?.data?.length || 0
    }));
    
    // Handle the response format properly
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      // Standardized backend response format
      return response.data;
    } else if (response.data && Array.isArray(response.data)) {
      // Direct array response (legacy format)
      return {
        success: true,
        count: response.data.length,
        data: response.data
      };
    } else if (response.data && typeof response.data === 'object') {
      // Handle any other format
      console.log('Unexpected main category response format:', response.data);
      return {
        success: true,
        count: 0,
        data: []
      };
    }
    
    // Default empty response
    return {
      success: false,
      count: 0,
      data: []
    };
  } catch (error) {
    console.error('Error fetching main categories:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    // Eğer main kategorileri alınamazsa, tüm kategorileri almayı dene
    try {
      console.log('Falling back to all categories');
      const allCategoriesResponse = await getCategories();
      
      // Ana kategorileri filtrele (parentId null olanlar)
      if (allCategoriesResponse.success && Array.isArray(allCategoriesResponse.data)) {
        const mainCategories = allCategoriesResponse.data.filter(
          category => !category.parentId
        );
        
        console.log(`Filtered ${mainCategories.length} main categories from all categories`);
        return {
          success: true,
          count: mainCategories.length,
          data: mainCategories
        };
      }
      
      return allCategoriesResponse;
    } catch (fallbackError) {
      console.error('Error in fallback to all categories:', fallbackError.message);
      return {
        success: false,
        count: 0,
        data: []
      };
    }
  }
};

// Alt kategorileri getirme
const getSubcategories = async (parentId) => {
  try {
    console.log(`Fetching subcategories for parent ID: ${parentId}`);
    const response = await api.get(`/categories/${parentId}/subcategories`);
    console.log(`Retrieved ${response.data?.data?.length || 0} subcategories`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching subcategories for ${parentId}:`, error);
    throw error;
  }
};

// Kategori detayını getirme
const getCategory = async (id) => {
  try {
    console.log(`Fetching category details for ID: ${id}`);
    const response = await api.get(`/categories/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching category ${id}:`, error);
    throw error;
  }
};

// Kategori detayını slug ile getirme
const getCategoryBySlug = async (slug) => {
  try {
    console.log(`Fetching category details for slug: ${slug}`);
    const response = await api.get(`/categories/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error);
    throw error;
  }
};

const categoryService = {
  getCategories,
  getMainCategories,
  getSubcategories,
  getCategory,
  getCategoryBySlug
};

export default categoryService; 