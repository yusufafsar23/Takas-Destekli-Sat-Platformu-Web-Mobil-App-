import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Kategori kartı komponenti
 * @param {string} title - Kategori başlığı
 * @param {string} description - Kategori açıklaması
 * @param {string} imageUrl - Resim URL'i (isteğe bağlı)
 * @param {object} localImage - Require ile eklenmiş yerel resim
 * @param {string} backgroundColor - Arka plan rengi
 * @param {string} iconName - Ionicons ikon adı
 * @param {function} onPress - Tıklama işlevi
 * @param {object} style - Ek stil
 */
export const CategoryCard = ({
  title,
  description,
  imageUrl,
  localImage,
  backgroundColor,
  iconName = "grid-outline",
  iconColor = "#FF6B6B",
  buttonText = "Görüntüle",
  onPress,
  style = {},
  ...props
}) => {
  // Resim kaynağını belirle: önce imageUrl, yoksa localImage, yoksa varsayılan ikon
  const hasImage = imageUrl || localImage;
  
  // Stil hesaplama
  const getBackgroundStyle = () => {
    if (backgroundColor) return { backgroundColor };
    if (iconName === 'game-controller') return { backgroundColor: '#EFF6FF' };
    if (iconName === 'book') return { backgroundColor: '#F8F0E5' };
    if (iconName === 'football') return { backgroundColor: '#E5F8E9' };
    return { backgroundColor: '#EFF6FF' };
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}
      {...props}
    >
      <View style={styles.iconContainer}>
        {hasImage ? (
          <ImageBackground 
            source={imageUrl ? { uri: imageUrl } : localImage}
            style={styles.image}
            imageStyle={styles.imageStyle}
          >
            <View style={styles.imageOverlay} />
          </ImageBackground>
        ) : (
          <View style={[styles.iconBackground, getBackgroundStyle()]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Text style={styles.buttonText}>Görüntüle</Text>
          <Ionicons name="chevron-forward" size={14} color="#FF6B6B" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 90,
    height: 110,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  image: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FF6B6B',
    marginRight: 4,
  },
}); 