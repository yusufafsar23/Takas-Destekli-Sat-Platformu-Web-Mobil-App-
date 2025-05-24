import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export const OfflineIndicator = () => {
  const { isOfflineMode, checkNetworkConnectivity, isNetworkChecking, forceOnlineMode } = useApp();

  // Çevrimiçi modda ise hiçbir şey gösterme
  if (!isOfflineMode) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
        <Text style={styles.text}>Çevrimdışı mod aktif</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={forceOnlineMode}
          disabled={isNetworkChecking}
        >
          {isNetworkChecking ? (
            <Text style={styles.buttonText}>Kontrol ediliyor...</Text>
          ) : (
            <Text style={styles.buttonText}>Online Moda Geç</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    marginRight: 10,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
  }
}); 