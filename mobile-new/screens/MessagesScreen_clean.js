import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import messageService from '../services/messageService';
import { useAuth } from '../context/AuthContext';

const MessagesScreen = ({ route, navigation }) => {
  // State definitions
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConversationListVisible, setIsConversationListVisible] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);

  // References
  const flatListRef = useRef(null);
  const { user, refreshUserData, authState } = useAuth();

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Konuşmalar yükleniyor...");
      console.log("Mevcut kullanıcı ID:", user?._id);
      
      // Try to refresh user data if missing
      if (!user || !user._id) {
        console.log("Kullanıcı bilgisi eksik, yenileme denenecek...");
        try {
          const refreshedUser = await refreshUserData();
          console.log("Kullanıcı bilgisi yenilendi:", refreshedUser ? "Başarılı" : "Başarısız");
          
          if (!refreshedUser) {
            setError('Kullanıcı bilgisi alınamadı. Lütfen yeniden giriş yapın.');
            setLoading(false);
            return;
          }
        } catch (refreshError) {
          console.error("Kullanıcı bilgisi yenilenirken hata:", refreshError);
          setError('Kullanıcı oturumu doğrulanamadı. Lütfen yeniden giriş yapın.');
          setLoading(false);
          return;
        }
      }
      
      const response = await messageService.getConversations();
      
      console.log("API yanıtı:", response ? "Başarılı" : "Başarısız");
      
      if (Array.isArray(response) && response.length > 0) {
        console.log(`${response.length} konuşma yüklendi`);
        
        // Filter duplicate conversations with the same user
        const uniqueUserConversations = [];
        const uniqueUserIds = new Set();
        
        response.forEach(conv => {
          const otherUser = conv.participants?.find(p => p._id !== user?._id);
          if (otherUser && otherUser._id) {
            // If no conversation with this user has been added yet
            if (!uniqueUserIds.has(otherUser._id)) {
              uniqueUserIds.add(otherUser._id);
              uniqueUserConversations.push(conv);
            } else {
              // If a conversation with this user has been added, prefer the newer one
              const existingIndex = uniqueUserConversations.findIndex(
                c => c.participants.some(p => p._id === otherUser._id)
              );
              
              if (existingIndex !== -1) {
                const existingDate = uniqueUserConversations[existingIndex].lastMessage?.createdAt || 
                                     uniqueUserConversations[existingIndex].createdAt;
                const currentDate = conv.lastMessage?.createdAt || conv.createdAt;
                
                // Prefer the newer conversation
                if (new Date(currentDate) > new Date(existingDate)) {
                  uniqueUserConversations[existingIndex] = conv;
                }
              }
            }
          } else {
            // Also add conversations without another user
            uniqueUserConversations.push(conv);
          }
        });
        
        console.log(`${uniqueUserConversations.length} benzersiz kullanıcı konuşması bulundu`);
        
        // Sort by date
        const sortedConversations = [...uniqueUserConversations].sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });

        setConversations(sortedConversations);
      } else {
        console.log('Konuşma bulunamadı veya geçersiz yanıt:', response);
        setConversations([]);
      }
    } catch (error) {
      console.error('Konuşmaları yüklerken hata:', error);
      setError('Konuşmalar yüklenirken bir hata oluştu.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Get user initials
  const getUserInitials = (name) => {
    if (!name) return '?';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    } else {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
  };
  
  // Get consistent color for user
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', 
      '#7E57C2', '#EC407A', '#66BB6A', '#5C6BC0'
    ];
    
    if (!userId) return colors[0];
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Pick from color array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Format time
  const formatTime = (dateString) => {
    return format(new Date(dateString), 'HH:mm');
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return format(date, 'dd MMM yyyy', { locale: tr });
    }
  };

  // Refresh action
  const onRefresh = async () => {
    setRefreshing(true);
    
    if (activeConversation) {
      await loadMessages(activeConversation._id);
    } else {
      await loadConversations();
    }
    
    setRefreshing(false);
  };

  // Initialize on auth state change
  useEffect(() => {
    if (authState === 'authenticated' && user && user._id) {
      loadConversations();
    }
  }, [authState, user]);

  // Loading indicator
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  // Only rendering the conversations list part for this example
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {isConversationListVisible ? (
        // CONVERSATION LIST VIEW
        <>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingTop: Platform.OS === 'android' ? 30 : 15,
            paddingBottom: 15,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#e1e4e8',
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Mesajlar</Text>
            
            <TouchableOpacity 
              onPress={onRefresh}
              style={{ padding: 5 }}
            >
              <Ionicons name="refresh" size={24} color="#0066cc" />
            </TouchableOpacity>
          </View>
          
          {error && (
            <View style={{ 
              backgroundColor: '#ffebee', 
              padding: 10, 
              margin: 10, 
              borderRadius: 5,
              borderLeftWidth: 4,
              borderLeftColor: '#f44336' 
            }}>
              <Text style={{ color: '#d32f2f' }}>{error}</Text>
              <TouchableOpacity
                onPress={() => {
                  setError(null);
                  loadConversations();
                }}
                style={{
                  backgroundColor: '#d32f2f',
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 8,
                  alignSelf: 'flex-end'
                }}
              >
                <Text style={{ color: 'white' }}>Yeniden Dene</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {conversations.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#ccc" />
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>
                Henüz mesajınız yok
              </Text>
              <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 5 }}>
                Ürün sayfalarından satıcılarla iletişime geçebilirsiniz.
              </Text>
              
              <TouchableOpacity 
                onPress={onRefresh}
                style={{ 
                  marginTop: 20,
                  padding: 10,
                  backgroundColor: '#0066cc',
                  borderRadius: 8
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Yenile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              renderItem={({ item }) => {
                const otherParticipant = item.participants?.find(p => p._id !== user?._id);
                const lastMessageText = item.lastMessage?.text || '';
                const lastMessageTime = item.lastMessage?.createdAt ? formatTime(item.lastMessage.createdAt) : '';
                const lastMessageDate = item.lastMessage?.createdAt ? formatDate(item.lastMessage.createdAt) : '';
                
                // Get user initials and color
                const userInitial = getUserInitials(otherParticipant?.username || 'Kullanıcı');
                const userColor = getUserColor(otherParticipant?._id || '');
                
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectConversation(item)}
                    style={{
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: '#e1e4e8',
                      backgroundColor: '#fff',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    {/* User initial avatar */}
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: userColor,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12
                    }}>
                      <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                        {userInitial}
                      </Text>
                    </View>
                    
                    {/* Conversation details */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                          {otherParticipant?.username || 'Kullanıcı'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>
                          {lastMessageDate}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                        <Text 
                          style={{ fontSize: 14, color: '#666', flex: 1 }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {lastMessageText}
                        </Text>
                        
                        <Text style={{ fontSize: 12, color: '#666', marginLeft: 10 }}>
                          {lastMessageTime}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Unread badge */}
                    {item.unreadCount > 0 && (
                      <View style={{
                        position: 'absolute',
                        right: 15,
                        top: 20,
                        backgroundColor: '#0066cc',
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Mesaj detayları buraya gelecek</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen; 