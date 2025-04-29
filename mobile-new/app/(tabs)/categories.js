import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CategoriesScreen() {
  return (
    <View style={styles.container}>
      {/* Categories Grid */}
      <View style={styles.grid}>
        <View style={[styles.categoryCard, { backgroundColor: '#A8E6CF' }]}>
          <Text style={styles.categoryIcon}>📱</Text>
          <Text style={styles.categoryName}>Elektronik</Text>
          <Text style={styles.categoryCount}>1250 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#DCEDC2' }]}>
          <Text style={styles.categoryIcon}>👕</Text>
          <Text style={styles.categoryName}>Giyim</Text>
          <Text style={styles.categoryCount}>950 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#FFD3B5' }]}>
          <Text style={styles.categoryIcon}>🏠</Text>
          <Text style={styles.categoryName}>Ev Eşyaları</Text>
          <Text style={styles.categoryCount}>820 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#FFAAA6' }]}>
          <Text style={styles.categoryIcon}>⚽</Text>
          <Text style={styles.categoryName}>Spor</Text>
          <Text style={styles.categoryCount}>560 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#FF8C94' }]}>
          <Text style={styles.categoryIcon}>📚</Text>
          <Text style={styles.categoryName}>Kitaplar</Text>
          <Text style={styles.categoryCount}>750 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#A8E6CF' }]}>
          <Text style={styles.categoryIcon}>📞</Text>
          <Text style={styles.categoryName}>Telefon</Text>
          <Text style={styles.categoryCount}>1080 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#DCEDC2' }]}>
          <Text style={styles.categoryIcon}>💻</Text>
          <Text style={styles.categoryName}>Bilgisayar</Text>
          <Text style={styles.categoryCount}>650 Ürün</Text>
        </View>
        
        <View style={[styles.categoryCard, { backgroundColor: '#FFD3B5' }]}>
          <Text style={styles.categoryIcon}>🎮</Text>
          <Text style={styles.categoryName}>Oyun & Konsol</Text>
          <Text style={styles.categoryCount}>480 Ürün</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  grid: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    height: 110,
    margin: 5,
    borderRadius: 8,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  categoryCount: {
    fontSize: 14,
    color: '#555',
  },
}); 