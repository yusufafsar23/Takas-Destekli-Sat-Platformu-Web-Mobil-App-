import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';

export default function ExploreScreen() {
  const categories = [
    { 
      id: '1', 
      name: 'Telefonlar', 
      description: 'En son model akıllı telefonlar ve aksesuarlar',
      itemCount: 128
    },
    { 
      id: '2', 
      name: 'Bilgisayarlar', 
      description: 'Laptop, masaüstü ve tablet bilgisayarlar',
      itemCount: 96
    },
    { 
      id: '3', 
      name: 'Oyuncak', 
      description: 'Çocuklar için eğitici ve eğlenceli oyuncaklar',
      itemCount: 64
    },
    { 
      id: '4', 
      name: 'Kitap', 
      description: 'Her yaş için romanlar, ders kitapları ve dergiler',
      itemCount: 178
    },
    { 
      id: '5', 
      name: 'Oyun', 
      description: 'Dijital ve fiziksel oyunlar',
      itemCount: 85
    },
    { 
      id: '6', 
      name: 'Oyun Konsolu', 
      description: 'Konsol ve aksesuarları',
      itemCount: 42
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kategoriler</Text>
        <Text style={styles.subtitle}>Tüm kategorilere göz atın</Text>
      </View>

      <ScrollView style={styles.categoriesContainer}>
        {categories.map(category => (
          <TouchableOpacity key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryImage}>
              <Text style={styles.categoryEmoji}>
                {category.name === 'Telefonlar' ? '📱' :
                 category.name === 'Bilgisayarlar' ? '💻' :
                 category.name === 'Oyuncak' ? '🧸' :
                 category.name === 'Kitap' ? '📚' :
                 category.name === 'Oyun' ? '🎮' :
                 category.name === 'Oyun Konsolu' ? '🎮' : '📦'}
              </Text>
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
              <View style={styles.categoryMeta}>
                <Text style={styles.categoryCount}>{category.itemCount} ürün</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  categoriesContainer: {
    flex: 1,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 36,
  },
  categoryInfo: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 12,
    color: '#4169E1',
    fontWeight: 'bold',
  },
}); 