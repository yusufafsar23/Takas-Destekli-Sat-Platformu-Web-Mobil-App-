import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import messageService from '../../services/messageService';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [conversation, setConversation] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();
  const { conversationId, title } = useLocalSearchParams();
  const flatListRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetchMessages();
    markAsRead();
  }, [conversationId]);

  useEffect(() => {
    if (socket) {
      // Gelen yeni mesajları dinle
      socket.on('newMessage', (messageData) => {
        if (messageData.conversationId === conversationId) {
          setMessages(prev => [...prev, messageData]);
          markAsRead();
        }
      });

      // Okundu bilgisini dinle
      socket.on('messagesRead', (data) => {
        if (data.conversationId === conversationId) {
          // Kendi mesajlarımızın okundu durumunu güncelle
          setMessages(prev => 
            prev.map(msg => 
              msg.sender._id === user?._id ? { ...msg, read: true } : msg
            )
          );
        }
      });

      return () => {
        socket.off('newMessage');
        socket.off('messagesRead');
      };
    }
  }, [socket, conversationId]);

  const fetchMessages = async (before = null) => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (before) {
        params.before = before;
        setIsLoadingMore(true);
      }

      const data = await messageService.getConversationMessages(conversationId, params);
      
      if (data.length < params.limit) {
        setHasMoreMessages(false);
      }

      if (before) {
        setMessages(prev => [...data, ...prev]);
        setIsLoadingMore(false);
      } else {
        setMessages(data);
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await messageService.markAsRead(conversationId);
    } catch (error) {
      console.error('Mesajlar okundu olarak işaretlenirken hata oluştu:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!text.trim()) return;

    try {
      const newMessage = await messageService.sendMessage(conversationId, text.trim());
      setMessages(prev => [...prev, newMessage]);
      setText('');

      // Socket ile karşı tarafa bildirim gönder
      if (socket && conversation) {
        const receiverId = conversation.participants.find(
          p => p._id !== user?._id
        )?._id;

        if (receiverId) {
          socket.emit('sendMessage', {
            ...newMessage,
            receiverId
          });
        }
      }
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
    }
  };

  const loadMoreMessages = () => {
    if (!hasMoreMessages || isLoadingMore || messages.length === 0) return;
    
    const oldestMessage = messages[0];
    if (oldestMessage) {
      fetchMessages(oldestMessage.createdAt);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  const renderMessageItem = ({ item, index }) => {
    const isCurrentUser = item.sender._id === user?._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showDateSeparator = !prevMessage || 
      new Date(item.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.sentMessage : styles.receivedMessage
        ]}>
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.sentBubble : styles.receivedBubble
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
              {isCurrentUser && item.read && (
                <Text style={styles.readStatus}>✓</Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (loading && !isLoadingMore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        inverted={false}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#0000ff" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz mesaj yok. Mesajlaşmaya başlayın!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Mesajınızı yazın..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.disabledButton]}
          onPress={handleSendMessage}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    flex: 1,
    padding: 10,
  },
  loadingMoreContainer: {
    padding: 10,
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  sentBubble: {
    backgroundColor: '#dcf8c6',
    borderTopRightRadius: 5,
  },
  receivedBubble: {
    backgroundColor: 'white',
    borderTopLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  readStatus: {
    fontSize: 14,
    color: '#34b7f1',
    marginLeft: 5,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateSeparatorText: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: '#666',
    fontSize: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ChatScreen;