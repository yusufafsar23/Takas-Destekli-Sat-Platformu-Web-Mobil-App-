import theme from './theme';

export { COLORS, FONTS, SIZES, SHADOWS } from './theme';

// API sabitleri
export const API_URL = 'https://takasapi.example.com';

// Kategori verileri
export const CATEGORIES = [
  { id: '0', name: 'Tümü', icon: 'apps' },
  { id: '1', name: 'Telefonlar', icon: 'phone-android' },
  { id: '2', name: 'Bilgisayarlar', icon: 'laptop' },
  { id: '3', name: 'Oyuncak', icon: 'toys' },
  { id: '4', name: 'Kitap', icon: 'book' },
  { id: '5', name: 'Oyun', icon: 'videogame-asset' },
  { id: '6', name: 'Oyun Konsolu', icon: 'gamepad' },
  { id: '7', name: 'Giyim', icon: 'checkroom' },
  { id: '8', name: 'Ev Eşyaları', icon: 'chair' },
  { id: '9', name: 'Diğer', icon: 'more-horiz' },
];

// Durum sabitleri
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  SOLD: 'sold',
  PENDING: 'pending',
  INACTIVE: 'inactive',
};

// Uygulama sabitleri
export const APP_CONSTANTS = {
  PAGE_SIZE: 10,
  MAX_IMAGES: 5,
  MAX_DESCRIPTION_LENGTH: 500,
};

export default {
  theme,
  API_URL,
  CATEGORIES,
  PRODUCT_STATUS,
  APP_CONSTANTS,
}; 