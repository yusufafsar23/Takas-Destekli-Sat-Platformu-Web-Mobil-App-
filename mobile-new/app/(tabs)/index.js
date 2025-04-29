import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useState } from 'react';

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState('Tümü');

  const categories = [
    { id: '0', name: 'Tümü' },
    { id: '1', name: 'Telefonlar' },
    { id: '2', name: 'Bilgisayarlar' },
    { id: '3', name: 'Oyuncak' },
    { id: '4', name: 'Kitap' },
    { id: '5', name: 'Oyun' },
    { id: '6', name: 'Oyun Konsolu' },
  ];

  // Örnek ürünler
  const products = [
    { id: '1', name: 'iPhone 13', price: '25.999 TL', category: 'Telefonlar' },
    { id: '2', name: 'MacBook Pro', price: '45.999 TL', category: 'Bilgisayarlar' },
    { id: '3', name: 'Samsung Galaxy S22', price: '21.499 TL', category: 'Telefonlar' },
    { id: '4', name: 'LEGO Star Wars', price: '1.499 TL', category: 'Oyuncak' },
    { id: '5', name: 'Suç ve Ceza', price: '85 TL', category: 'Kitap' },
    { id: '6', name: 'PS5', price: '18.999 TL', category: 'Oyun Konsolu' },
    { id: '7', name: 'Gaming Laptop', price: '35.500 TL', category: 'Bilgisayarlar' },
    { id: '8', name: 'FIFA 23', price: '1.200 TL', category: 'Oyun' },
    { id: '9', name: 'Kindle', price: '3.200 TL', category: 'Kitap' },
    { id: '10', name: 'Nintendo Switch', price: '11.999 TL', category: 'Oyun Konsolu' },
  ];

  const filteredProducts = activeCategory === 'Tümü' 
    ? products 
    : products.filter(product => product.category === activeCategory);

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        activeCategory === item.name && styles.activeCategoryItem
      ]}
      onPress={() => setActiveCategory(item.name)}
    >
      <Text 
        style={[
          styles.categoryText,
          activeCategory === item.name && styles.activeCategoryText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productImageContainer}>
        <Text style={styles.productEmoji}>
          {item.category === 'Telefonlar' ? '📱' :
           item.category === 'Bilgisayarlar' ? '💻' :
           item.category === 'Oyuncak' ? '🧸' :
           item.category === 'Kitap' ? '📚' :
           item.category === 'Oyun' ? '🎮' :
           item.category === 'Oyun Konsolu' ? '🎮' : '📦'}
        </Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Takas Platformu</Text>
        <Text style={styles.subtitle}>Hoş Geldiniz!</Text>
      </View>

      {/* Kategoriler */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Ürünler */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  header: {
    marginTop: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeCategoryItem: {
    backgroundColor: '#4169E1',
  },
  categoryText: {
    fontSize: 14,
  },
  activeCategoryText: {
    color: 'white',
  },
  productsGrid: {
    paddingBottom: 16,
  },
  productCard: {
    flex: 1,
    margin: 4,
    maxWidth: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    height: 120,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 50,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    color: '#4169E1',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 10,
    color: '#666',
  }
}); 