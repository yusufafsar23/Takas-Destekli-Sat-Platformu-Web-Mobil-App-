import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Simplified mock user data
const userData = {
  name: 'Ayşe Yılmaz',
  location: 'İstanbul, Türkiye',
  joinDate: 'Nisan 2023',
  listings: 12,
  trades: 8,
  rating: 4.8,
};

// Simplified menu items
const menuItems = [
  { id: 1, title: 'İlanlarım', icon: 'list-outline', color: '#FF6B6B' },
  { id: 2, title: 'Takaslarım', icon: 'swap-horizontal-outline', color: '#4ECDC4' },
];

// Simplified settings items
const settingsItems = [
  { id: 1, title: 'Hesap Ayarları', icon: 'person-outline' },
  { id: 2, title: 'Çıkış Yap', icon: 'log-out-outline', color: '#FF6B6B' },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Profil</Text>
          </View>
        </View>
        
        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userData.name.charAt(0)}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userLocation}>{userData.location}</Text>
              <Text style={styles.joinDate}>Üyelik: {userData.joinDate}</Text>
            </View>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.listings}</Text>
              <Text style={styles.statLabel}>İlan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.trades}</Text>
              <Text style={styles.statLabel}>Takas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userData.rating}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
          </View>
        </View>
        
        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>İşlemlerim</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuItem}>
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={24} color="#fff" />
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          {settingsItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <Ionicons 
                  name={item.icon} 
                  size={22} 
                  color={item.color || '#555'} 
                />
              </View>
              <Text style={[
                styles.settingTitle, 
                item.color && { color: item.color }
              ]}>
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.version}>Takas App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingBottom: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 14,
    color: '#888',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
  },
  menuSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#888',
  },
}); 