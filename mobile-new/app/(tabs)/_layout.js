import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import HomeScreen from './home';
import CategoriesScreen from './categories';

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    if (activeTab === 'home') return <HomeScreen />;
    if (activeTab === 'categories') return <CategoriesScreen />;
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'home' && styles.activeTab]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
            Ana Sayfa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            Kategoriler
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  screenContainer: {
    flex: 1,
  },
}); 