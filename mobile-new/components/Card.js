import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

/**
 * Özel Card Komponenti
 * @param {React.ReactNode} children - Card içeriği
 * @param {string} title - Kart başlığı
 * @param {string} description - Açıklama metni
 * @param {number} price - Fiyat
 * @param {string} imageUrl - Resim URL'i
 * @param {function} onPress - Tıklama işlevi
 * @param {object} style - Ek stil
 */
export const Card = ({
  children,
  title,
  description,
  price,
  imageUrl,
  onPress,
  style = {},
  ...props
}) => {
  const CardComponent = onPress ? TouchableOpacity : View;
  
  // Eğer standart bir ürün kartı ise
  if (imageUrl && (title || price)) {
    return (
      <CardComponent
        style={[styles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
        {...props}
      >
        <Image 
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.content}>
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
          {price && <Text style={styles.price}>{price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₺</Text>}
        </View>
      </CardComponent>
    );
  }
  
  // Genel kart bileşeni
  return (
    <CardComponent
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      {...props}
    >
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </CardComponent>
  );
};

/**
 * Card.Content Komponenti
 * @param {React.ReactNode} children - İçerik
 * @param {object} style - Ek stil
 */
Card.Content = ({ children, style = {}, ...props }) => (
  <View style={[styles.content, style]} {...props}>
    {children}
  </View>
);

/**
 * Card.Footer Komponenti
 * @param {React.ReactNode} children - Footer içeriği
 * @param {object} style - Ek stil
 */
Card.Footer = ({ children, style = {}, ...props }) => (
  <View style={[styles.footer, style]} {...props}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 240,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    lineHeight: 22,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 6,
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
}); 