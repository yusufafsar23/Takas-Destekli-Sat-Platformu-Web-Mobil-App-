import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, ImageBackground } from 'react-native';

/**
 * Slider banner komponenti
 * @param {Array} items - Banner öğeleri dizisi (title, description, imageUrl veya backgroundColor içermeli)
 * @param {object} style - Ek stil
 */
export const Banner = ({ items = [], style = {}, ...props }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = new Animated.Value(1);

  useEffect(() => {
    // Sadece birden fazla öğe varsa otomatik geçiş yap
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out animasyonu
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Sonraki indexe geç
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        
        // Fade in animasyonu
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000); // 5 saniyede bir değiş

    return () => clearInterval(interval);
  }, [items.length]);

  if (!items.length) return null;

  const currentItem = items[currentIndex] || {};
  
  // Eğer item'da imageUrl yoksa varsayılan renk arkaplanını kullan, aksi takdirde verilen resmi kullan
  const useDefaultBackground = !currentItem.imageUrl && !currentItem.localImage;
  const backgroundColor = currentItem.backgroundColor || '#2B3A67';

  return (
    <Animated.View 
      style={[
        styles.container, 
        style, 
        { opacity: fadeAnim },
        useDefaultBackground && { backgroundColor }
      ]} 
      {...props}
    >
      {!useDefaultBackground && (
        <ImageBackground 
          source={currentItem.imageUrl ? { uri: currentItem.imageUrl } : currentItem.localImage}
          style={styles.backgroundImage}
          imageStyle={styles.imageStyle}
        >
          {/* Banner içeriği alt kısımda */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentItem.title || ""}</Text>
            <Text style={styles.description}>{currentItem.description || ""}</Text>
          </View>
        </ImageBackground>
      )}
      
      {useDefaultBackground && (
        <>
          <View style={styles.content} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentItem.title || ""}</Text>
            <Text style={styles.description}>{currentItem.description || ""}</Text>
          </View>
        </>
      )}
      
      {/* İndikatör noktaları */}
      {items.length > 1 && (
        <View style={styles.indicators}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { backgroundColor: index === currentIndex ? '#FF6B6B' : 'rgba(255, 255, 255, 0.6)' }
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 12,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // Aşağıya hizala
  },
  imageStyle: {
    borderRadius: 10,
    resizeMode: 'cover',
  },
  textContainer: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 13,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 60, // İndikatörleri metin kutusunun üstüne taşıdık, banner yüksekliğine göre ayarladık
    left: 0,
    right: 0,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
}); 