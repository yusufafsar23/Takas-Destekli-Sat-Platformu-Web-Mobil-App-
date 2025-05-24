import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import messageService from '../../services/messageService';

const MessagesScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { socket, notifications } = useSocket();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  // Socket.io ile gelen yeni mesaj bildirimlerini dinleme
  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (message) => {
        // Konuşma listesini güncelle
        fetchConversations();
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await messageService.getConversations();
      
      // Mükerrer konuşmaları filtrele
      const filteredConversations = Array.isArray(data) 
        ? data.filter((conversation, index, self) => {
            // Aynı katılımcıya sahip ilk konuşmayı tut, diğerlerini filtrele
            return index === self.findIndex(c => {
              // Aynı kullanıcılar arasındaki konuşma mı kontrol et
              if (!conversation.participants || !c.participants) return false;
              
              const participantsA = conversation.participants.map(p => p._id).sort().join(',');
              const participantsB = c.participants.map(p => p._id).sort().join(',');
              
              return participantsA === participantsB;
            });
          })
        : [];
      
      setConversations(filteredConversations);
    } catch (error) {
      console.error('Konuşmalar yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const navigateToChat = (conversation) => {
    router.push({
      pathname: '/messages/chat',
      params: { 
        conversationId: conversation._id,
        title: getRecipientName(conversation),
      }
    });
  };

  const getRecipientName = (conversation) => {
    if (!conversation || !conversation.participants) return 'Kullanıcı';
    
    const recipient = conversation.participants.find(
      p => p._id !== user?._id
    );
    
    return recipient?.username || 'Kullanıcı';
  };

  const formatLastMessage = (conversation) => {
    if (!conversation.lastMessage) return 'Henüz mesaj yok';
    
    return conversation.lastMessage.text;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Bugün içindeyse saat göster
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Bu hafta içindeyse gün adı göster
    const dayDiff = (now - date) / (1000 * 60 * 60 * 24);
    if (dayDiff < 7) {
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      return days[date.getDay()];
    }
    
    // Diğer durumlar için tarih göster
    return date.toLocaleDateString('tr-TR');
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => navigateToChat(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {getRecipientName(item).charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.conversationDetails}>
        <View style={styles.conversationHeader}>
          <Text style={styles.username}>{getRecipientName(item)}</Text>
          <Text style={styles.time}>
            {formatTime(item.lastMessage?.createdAt || item.updatedAt)}
          </Text>
        </View>
        
        <View style={styles.messagePreview}>
          <Text 
            style={[
              styles.previewText, 
              item.unreadCount > 0 && styles.unreadText
            ]}
            numberOfLines={1}
          >
            {formatLastMessage(item)}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz mesajınız bulunmuyor.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  time: {
    color: '#999',
    fontSize: 12,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

export default MessagesScreen; 