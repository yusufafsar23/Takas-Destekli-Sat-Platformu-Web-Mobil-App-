import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_SERVER_URL, checkAPIStatus } from '../services/api';

const ApiStatusScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    checkApiStatus();
    loadOfflineMode();
  }, []);

  const loadOfflineMode = async () => {
    try {
      const offlineModeValue = await AsyncStorage.getItem('offlineMode');
      setOfflineMode(offlineModeValue === 'true');
    } catch (error) {
      console.error('Offline modu yüklerken hata:', error);
    }
  };

  const checkApiStatus = async () => {
    setLoading(true);
    try {
      const status = await checkAPIStatus();
      setApiStatus(status);
      setLastChecked(new Date().toLocaleString('tr-TR'));
    } catch (error) {
      console.error('API durum kontrolü hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfflineMode = async () => {
    try {
      const newOfflineMode = !offlineMode;
      await AsyncStorage.setItem('offlineMode', newOfflineMode ? 'true' : 'false');
      setOfflineMode(newOfflineMode);
      Alert.alert(
        'Offline Mod',
        newOfflineMode 
          ? 'Offline mod etkinleştirildi. Uygulama simülasyon verileri kullanacak.' 
          : 'Offline mod devre dışı bırakıldı. Uygulama gerçek API verilerini kullanacak.'
      );
    } catch (error) {
      console.error('Offline mod değiştirme hatası:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>API Durum Kontrolü</Text>
        <Text style={styles.subtitle}>API bağlantılarınızı kontrol edin ve sorun giderin</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>API Sunucu Durumu</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#4169E1" />
        ) : (
          <>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: apiStatus?.online ? '#4CAF50' : '#F44336' }
              ]} />
              <Text style={styles.statusText}>
                {apiStatus?.online ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
            </View>
            
            <Text style={styles.statusMessage}>
              {apiStatus?.message || 'Durum bilgisi yok'}
            </Text>
            
            {apiStatus?.detailedMessage && (
              <Text style={styles.detailedMessage}>
                {apiStatus.detailedMessage}
              </Text>
            )}
            
            {lastChecked && (
              <Text style={styles.timestamp}>
                Son kontrol: {lastChecked}
              </Text>
            )}
          </>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>API Bilgileri</Text>
        <Text style={styles.infoLabel}>Sunucu URL:</Text>
        <Text style={styles.infoValue}>{API_SERVER_URL}</Text>
        
        <Text style={styles.infoLabel}>Offline Mod:</Text>
        <Text style={[styles.infoValue, { color: offlineMode ? '#F44336' : '#4CAF50' }]}>
          {offlineMode ? 'Etkin (Simüle edilmiş veriler kullanılıyor)' : 'Devre Dışı (API verileri kullanılıyor)'}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={checkApiStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Durumu Yenile</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, offlineMode ? styles.onlineButton : styles.offlineButton]}
          onPress={toggleOfflineMode}
        >
          <Text style={styles.buttonText}>
            {offlineMode ? 'Çevrimiçi Moda Geç' : 'Çevrimdışı Moda Geç'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.troubleshootingSection}>
        <Text style={styles.sectionTitle}>Sorun Giderme İpuçları</Text>
        <Text style={styles.tipText}>• API sunucusunun çalışır durumda olduğundan emin olun</Text>
        <Text style={styles.tipText}>• İnternet bağlantınızı kontrol edin</Text>
        <Text style={styles.tipText}>• Doğru API URL'inin yapılandırıldığından emin olun</Text>
        <Text style={styles.tipText}>• Timeout hatası: Sunucu yanıt vermiyor (30s)</Text>
        <Text style={styles.tipText}>• Geliştirme araçlarında API isteklerini izleyin</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#4169E1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    marginTop: 5,
  },
  statusCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
  },
  detailedMessage: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 5,
  },
  infoCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 10,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  refreshButton: {
    backgroundColor: '#4169E1',
  },
  offlineButton: {
    backgroundColor: '#FF9800',
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  troubleshootingSection: {
    margin: 15,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  tipText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default ApiStatusScreen; 