// Uygulama geneli tema sabitleri

export const COLORS = {
  primary: '#FF6B6B',
  secondary: '#4169E1',
  success: '#4CAF50',
  danger: '#E53935',
  warning: '#FFC107',
  info: '#2196F3',
  
  // Nötr renkler
  white: '#FFFFFF',
  black: '#000000',
  grey: '#9E9E9E',
  lightGrey: '#E0E0E0',
  darkGrey: '#616161',
  
  // Arka plan renkleri
  background: '#F8F8F8',
  card: '#FFFFFF',
  
  // Metin renkleri
  text: '#333333',
  textSecondary: '#757575',
  placeholder: '#9E9E9E',
};

export const FONTS = {
  regular: {
    fontWeight: 'normal',
  },
  medium: {
    fontWeight: '500',
  },
  bold: {
    fontWeight: 'bold',
  },
  
  // Font büyüklükleri
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  h4: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  h5: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
  },
  body2: {
    fontSize: 14,
  },
  caption: {
    fontSize: 12,
  },
};

export const SIZES = {
  // Padding ve Margin büyüklükleri
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  
  // Ekran genişlik yüzdeleri
  width10: '10%',
  width20: '20%',
  width30: '30%',
  width40: '40%',
  width50: '50%',
  width60: '60%',
  width70: '70%',
  width80: '80%',
  width90: '90%',
  width100: '100%',
  
  // Border radius
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 16,
  radiusXl: 24,
  radiusRound: 50,
};

// Genel gölge stili
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export default { COLORS, FONTS, SIZES, SHADOWS }; 