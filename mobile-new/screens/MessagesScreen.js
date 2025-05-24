import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '../components/Button';
import messageService from '../services/messageService';
import { useAuth } from '../context/AuthContext'; // Make sure this path is correct

const MessagesScreen = ({ route, navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConversationListVisible, setIsConversationListVisible] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const flatListRef = useRef(null);
  const { user } = useAuth(); // Get current user from auth context

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversations();
      console.log('Loaded conversations:', response);
      
      if (Array.isArray(response)) {
        // Konuşmaları kullanıcı bazında grupla
        const uniqueConversations = [];
        const seenUsers = new Set();
        
        // En son mesajı olan konuşmaları öncelikle al
        const sortedConversations = [...response].sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });

        // Her kullanıcı için en son konuşmayı al
        for (const conv of sortedConversations) {
          const otherParticipant = conv.participants?.find(p => p._id !== user?._id);
          if (otherParticipant && !seenUsers.has(otherParticipant._id)) {
            uniqueConversations.push(conv);
            seenUsers.add(otherParticipant._id);
          }
        }

        setConversations(uniqueConversations);
      } else {
        console.error('Invalid conversations response:', response);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      const response = await messageService.getConversationMessages(conversationId);
      console.log('Loaded messages:', response);
      if (Array.isArray(response)) {
        setMessages(response);
      } else {
        console.error('Invalid messages response:', response);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  // Initial load
  useEffect(() => {
    console.log('Initial load effect running');
    loadConversations();
  }, []);

  // Handle route params for direct message
  useEffect(() => {
    if (route.params) {
      const { recipientId, productId } = route.params;
      if (recipientId) {
        handleStartNewConversation(recipientId, productId);
      }
    }
  }, [route.params]);

  const handleStartNewConversation = async (recipientId, productId) => {
    try {
      const conversation = await messageService.createConversation(recipientId, productId);
      if (conversation) {
        handleConversationSelect(conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleConversationSelect = async (conversation) => {
    setActiveConversation(conversation);
    setIsConversationListVisible(false);
    setLoading(true);
    
    try {
      await loadMessages(conversation._id);
      await messageService.markAsRead(conversation._id);
    } catch (error) {
      console.error('Error in conversation selection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    setSendingMessage(true);
    try {
      const sentMessage = await messageService.sendMessage(activeConversation._id, newMessage.trim());
      setMessages(prevMessages => [...prevMessages, sentMessage]);
      setNewMessage('');
      
      // Scroll to bottom
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isConversationListVisible) {
      await loadConversations();
    } else if (activeConversation) {
      await loadMessages(activeConversation._id);
    }
    setRefreshing(false);
  };

  const formatMessageTime = (dateObj) => {
    const now = new Date();
    const messageDate = new Date(dateObj);
    
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 1) {
      // Bugünse saat formatında göster
      return format(messageDate, 'HH:mm');
    } else if (diffInDays < 7) {
      // Son 7 gün içindeyse gün adı göster
      return format(messageDate, 'EEEE', { locale: tr });
    } else {
      // Daha önceyse tarih göster
      return format(messageDate, 'd MMM', { locale: tr });
    }
  };

  const formatConversationTime = (dateObj) => {
    const now = new Date();
    const messageDate = new Date(dateObj);
    
    const diffInDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 1) {
      // Bugünse saat formatında göster
      return format(messageDate, 'HH:mm');
    } else if (diffInDays < 7) {
      // Son 7 gün içindeyse gün adı göster
      return format(messageDate, 'EEEE', { locale: tr });
    } else {
      // Daha önceyse tarih göster
      return format(messageDate, 'd MMM', { locale: tr });
    }
  };

  const renderConversationItem = ({ item }) => {
    // Karşı kullanıcıyı bul
    const otherParticipant = item.participants?.find(p => p._id !== user?._id) || {};
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationSelect(item)}
      >
        <Image
          source={{ uri: otherParticipant.profileImage || 'https://via.placeholder.com/50' }}
          style={styles.profileImage}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherParticipant.username || 'Kullanıcı'}</Text>
            <Text style={styles.timeText}>
              {item.lastMessage?.createdAt ? formatConversationTime(new Date(item.lastMessage.createdAt)) : formatConversationTime(new Date(item.createdAt))}
            </Text>
          </View>
          {item.relatedProduct && (
            <Text style={styles.productTitle} numberOfLines={1}>
              {item.relatedProduct.title}
            </Text>
          )}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.text || 'Yeni konuşma'}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessageItem = ({ item }) => {
    const isOwnMessage = item.senderId === user?._id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            !isOwnMessage && { color: '#000' }
          ]}>{item.text}</Text>
          <Text style={[
            styles.messageTime,
            !isOwnMessage && { color: 'rgba(0, 0, 0, 0.5)' }
          ]}>
            {formatMessageTime(new Date(item.createdAt))}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {isConversationListVisible ? (
        <>
          <View style={styles.mainHeader}>
            <Text style={styles.mainHeaderTitle}>Mesajlar</Text>
          </View>
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </>
      ) : (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => setIsConversationListVisible(true)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {activeConversation?.participants?.find(p => p._id !== user?._id)?.username || 'Kullanıcı'}
            </Text>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Mesajınızı yazın..."
              multiline
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              style={[
                styles.sendButton,
                (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
              ]}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  productTitle: {
    color: '#0066cc',
    fontSize: 14,
    marginBottom: 3,
  },
  lastMessage: {
    color: '#666',
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#0066cc',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  chatContainer: {
    flex: 1,
    paddingTop: 80,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  ownBubble: {
    backgroundColor: '#0066cc',
  },
  otherBubble: {
    backgroundColor: '#e9ecef',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  mainHeader: {
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  mainHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default MessagesScreen; 