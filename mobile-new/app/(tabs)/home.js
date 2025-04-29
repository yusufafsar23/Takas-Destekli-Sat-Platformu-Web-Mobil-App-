import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomePage() {
  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategoriler</Text>
          <View style={styles.categoriesRow}>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>📱</Text>
              <Text style={styles.categoryName}>Elektronik</Text>
            </View>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>👕</Text>
              <Text style={styles.categoryName}>Giyim</Text>
            </View>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>🏠</Text>
              <Text style={styles.categoryName}>Ev Eşyaları</Text>
            </View>
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Öne Çıkan Ürünler</Text>
          <View style={styles.productsList}>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productIcon}>📱</Text>
              </View>
              <Text style={styles.productName}>iPhone 13</Text>
              <Text style={styles.productPrice}>18,999 TL</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productIcon}>🎮</Text>
              </View>
              <Text style={styles.productName}>PlayStation 5</Text>
              <Text style={styles.productPrice}>12,500 TL</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productIcon}>👟</Text>
              </View>
              <Text style={styles.productName}>Nike Spor Ayakkabı</Text>
              <Text style={styles.productPrice}>800 TL</Text>
            </View>
            <View style={styles.productCard}>
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productIcon}>🪑</Text>
              </View>
              <Text style={styles.productName}>Ikea Çalışma Masası</Text>
              <Text style={styles.productPrice}>1,200 TL</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    backgroundColor: '#A8E6CF',
    padding: 15,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontWeight: '600',
  },
  productsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: 'white',
    width: '48%',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  productImagePlaceholder: {
    height: 100,
    backgroundColor: '#f1f1f1',
    borderRadius: 5,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIcon: {
    fontSize: 40,
  },
  productName: {
    fontWeight: '500',
    marginBottom: 5,
  },
  productPrice: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
}); 