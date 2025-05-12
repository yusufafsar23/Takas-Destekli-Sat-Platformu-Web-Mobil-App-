import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/api';
import ConversationList from '../components/messages/ConversationList';
import ChatBox from '../components/messages/ChatBox';
import '../styles/Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Konuşmaları yükleme
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const result = await messageService.getConversations();
        setConversations(result);
        setLoading(false);
      } catch (error) {
        console.error('Konuşmalar yüklenirken hata oluştu:', error);
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Aktif konuşma mesajlarını yükleme
  useEffect(() => {
    if (activeConversation) {
      const fetchMessages = async () => {
        try {
          const result = await messageService.getMessages(activeConversation._id);
          setMessages(result);
          
          // Mesajları okundu olarak işaretle
          await messageService.markAsRead(activeConversation._id);
          
          // Konuşmaların okunmamış sayılarını güncelle
          const updatedConversations = [...conversations];
          const index = updatedConversations.findIndex(
            conv => conv._id === activeConversation._id
          );
          
          if (index !== -1) {
            updatedConversations[index] = {
              ...updatedConversations[index],
              unreadCount: 0
            };
            setConversations(updatedConversations);
          }
        } catch (error) {
          console.error('Mesajlar yüklenirken hata oluştu:', error);
        }
      };

      fetchMessages();
    }
  }, [activeConversation, conversations]);

  // Socket.io ile gelen mesajları dinleme
  useEffect(() => {
    if (socket) {
      // Yeni mesaj dinleme
      socket.on('newMessage', (messageData) => {
        // Mesaj aktif konuşmaya aitse, direkt ekle
        if (activeConversation && messageData.conversationId === activeConversation._id) {
          setMessages(prevMessages => [...prevMessages, messageData]);
          
          // Mesajı okundu olarak işaretle
          messageService.markAsRead(activeConversation._id);
        } 
        
        // Konuşma listesini güncelle
        updateConversationList();
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, activeConversation]);

  // Konuşma listesini güncelleme
  const updateConversationList = async () => {
    try {
      const result = await messageService.getConversations();
      setConversations(result);
    } catch (error) {
      console.error('Konuşma listesi güncellenirken hata oluştu:', error);
    }
  };

  // Mesaj gönderme
  const sendMessage = async (content) => {
    if (!activeConversation || !content.trim()) return;

    try {
      // API ile mesaj gönder
      const newMessage = await messageService.sendMessage(activeConversation._id, content);
      
      // Mesajı lokal state'e ekle
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // Socket aracılığıyla karşı tarafa bildirim gönder
      const receiverId = activeConversation.participants.find(
        participant => participant._id !== user._id
      )._id;
      
      socket.emit('sendMessage', {
        ...newMessage,
        receiverId
      });
      
      // Konuşma listesini güncelle
      updateConversationList();
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
    }
  };

  // Bir konuşmayı aktif olarak ayarlama
  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  return (
    <div className="messages-container">
      <div className="sidebar">
        <h2>Mesajlar</h2>
        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <ConversationList 
            conversations={conversations} 
            activeConversation={activeConversation}
            onSelect={selectConversation}
            currentUserId={user?._id}
          />
        )}
      </div>
      
      <div className="chat-area">
        {activeConversation ? (
          <ChatBox 
            conversation={activeConversation} 
            messages={messages} 
            onSendMessage={sendMessage}
            currentUserId={user?._id}
          />
        ) : (
          <div className="no-conversation">
            <p>Mesajlaşmak için bir konuşma seçin veya yeni bir konuşma başlatın.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 