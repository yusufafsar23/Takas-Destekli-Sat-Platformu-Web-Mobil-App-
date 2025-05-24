import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { messageService } from '../services/api';
import ConversationList from '../components/messages/ConversationList';
import ChatBox from '../components/messages/ChatBox';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket, markMessageNotificationsAsRead, fetchUnreadMessageCount } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sayfa yüklendiğinde tüm mesaj bildirimlerini okundu olarak işaretle
  useEffect(() => {
    if (user && user._id && markMessageNotificationsAsRead) {
      console.log('Marking all message notifications as read on Messages page load');
      
      // İlk olarak hemen işaretle
      markMessageNotificationsAsRead();
      
      // Veri alış verişi için kısa bir süre sonra tekrar işaretle
      const markAsReadTimer = setTimeout(() => {
        markMessageNotificationsAsRead();
        // Son durumu almak için sayaçları güncelle
        fetchUnreadMessageCount();
      }, 1000);
      
      return () => clearTimeout(markAsReadTimer);
    }
  }, [user, markMessageNotificationsAsRead, fetchUnreadMessageCount]);

  // Yeni konuşma oluşturma (state'ten gelen bilgilerle)
  useEffect(() => {
    const createNewConversation = async () => {
      if (location.state?.newConversation) {
        const { participantId, productId, tradeOfferId } = location.state;
        
        if (!participantId) {
          setError("Mesaj göndermek için kullanıcı bilgisi eksik");
          return;
        }
        
        try {
          setLoading(true);
          console.log("Yeni konuşma oluşturuluyor:", { participantId, productId, tradeOfferId });
          
          const response = await messageService.createConversation(participantId, productId, tradeOfferId);
          
          // Handle different response formats
          let newConversation = response;
          if (response && response.data) {
            newConversation = response.data;
          }
          
          console.log("Yeni konuşma oluşturuldu:", newConversation);
          
          // Konuşma listesini güncelle ve yeni konuşmayı aktif yap
          if (newConversation) {
            await updateConversationList();
            // Yeni konuşmayı bul ve aktif yap
            const foundConversation = conversations.find(c => 
              c.participants.some(p => p._id === participantId) &&
              (c.product?._id === productId || !productId)
            );
            
            if (foundConversation) {
              setActiveConversation(foundConversation);
            }
          }

          // URL'den state'i temizle
          navigate('/messages', { replace: true });
        } catch (error) {
          console.error('Yeni konuşma oluşturulurken hata:', error);
          setError("Konuşma başlatılamadı. Lütfen tekrar deneyin.");
        } finally {
          setLoading(false);
        }
      }
    };

    if (user && location.state?.newConversation) {
      createNewConversation();
    }
  }, [location.state, user, navigate, conversations]);

  // Konuşmaları yükleme
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await messageService.getConversations();
        
        // Handle both response formats (direct or nested in data.data)
        let conversationsData = response;
        
        // If response has a data property that contains data array
        if (response && response.data && Array.isArray(response.data)) {
          conversationsData = response.data;
        } 
        // If response has a nested data.data array
        else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
          conversationsData = response.data.data;
        }
        
        // Mükerrer konuşmaları filtrele
        const filteredConversations = Array.isArray(conversationsData) 
          ? conversationsData.filter((conversation, index, self) => {
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
        
        console.log('Filtrelenmiş konuşmalar:', filteredConversations.length);
        setConversations(filteredConversations);
        setLoading(false);
        
        // Okunmamış mesaj sayacını güncelle
        fetchUnreadMessageCount();
      } catch (error) {
        console.error('Konuşmalar yüklenirken hata oluştu:', error);
        setLoading(false);
        // Set empty array on error to prevent map errors
        setConversations([]);
      }
    };

    fetchConversations();
  }, [fetchUnreadMessageCount]);

  // Aktif konuşma mesajlarını yükleme
  useEffect(() => {
    if (activeConversation) {
      const fetchMessages = async () => {
        try {
          const response = await messageService.getMessages(activeConversation._id);
          
          // Handle both response formats (direct or nested in data.data)
          let messagesData = response;
          
          // If response has a data property that contains data array
          if (response && response.data && Array.isArray(response.data)) {
            messagesData = response.data;
          } 
          // If response has a nested data.data array
          else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
            messagesData = response.data.data;
          }
          
          // Ensure we're setting an array to state
          setMessages(Array.isArray(messagesData) ? messagesData : []);
          
          // Mesajları okundu olarak işaretle
          await messageService.markAsRead(activeConversation._id);
          
          // Mesaj bildirimlerini de işaretle ve unread count'u güncelle
          markMessageNotificationsAsRead();
          
          // Konuşmaların okunmamış sayılarını güncelle
          updateConversationList();
        } catch (error) {
          console.error('Mesajlar yüklenirken hata oluştu:', error);
          // Set empty array on error to prevent map errors
          setMessages([]);
        }
      };

      fetchMessages();
    }
  }, [activeConversation, markMessageNotificationsAsRead]);

  // Socket.io ile gelen mesajları dinleme
  useEffect(() => {
    if (socket) {
      // Yeni mesaj dinleme
      const handleNewMessage = (messageData) => {
        // Validate messageData is a proper object
        if (!messageData || typeof messageData !== 'object') return;
        
        // Mesaj aktif konuşmaya aitse, direkt ekle
        if (activeConversation && messageData.conversationId === activeConversation._id) {
          setMessages(prevMessages => [...prevMessages, messageData]);
          
          // Mesajı okundu olarak işaretle
          messageService.markAsRead(activeConversation._id);
          
          // Sayfada olduğumuz için bildirim sayacını güncelle
          fetchUnreadMessageCount();
        } 
        
        // Konuşma listesini güncelle
        updateConversationList();
      };
      
      // Event listener'ı ekle
      socket.on('newMessage', handleNewMessage);

      // Cleanup fonksiyonu
      return () => {
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [socket, activeConversation, fetchUnreadMessageCount]);

  // Konuşma listesini güncelleme
  const updateConversationList = async () => {
    try {
      const response = await messageService.getConversations();
      
      // Handle both response formats (direct or nested in data.data)
      let conversationsData = response;
      
      // If response has a data property that contains data array
      if (response && response.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      } 
      // If response has a nested data.data array
      else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        conversationsData = response.data.data;
      }
      
      // Mükerrer konuşmaları filtrele
      const filteredConversations = Array.isArray(conversationsData) 
        ? conversationsData.filter((conversation, index, self) => {
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
      
      // Ensure we're setting an array to state
      setConversations(filteredConversations);
      return filteredConversations;
    } catch (error) {
      console.error('Konuşma listesi güncellenirken hata oluştu:', error);
      // Set empty array on error to prevent map errors
      setConversations([]);
      return [];
    }
  };

  // Mesaj gönderme
  const sendMessage = async (content) => {
    if (!activeConversation || !content.trim()) return;

    try {
      // API ile mesaj gönder
      const response = await messageService.sendMessage(activeConversation._id, content);
      
      // Handle both response formats for new message
      let newMessage = response;
      
      // If response has a data property
      if (response && response.data) {
        newMessage = response.data;
      }
      
      // Mesajı lokal state'e ekle (only if we got a valid message object)
      if (newMessage && typeof newMessage === 'object') {
        setMessages(prevMessages => [...prevMessages, newMessage]);
        
        // Socket aracılığıyla karşı tarafa bildirim gönder
        const receiverId = activeConversation.participants.find(
          participant => participant._id !== user._id
        )?._id;
        
        if (receiverId && socket) {
          socket.emit('sendMessage', {
            ...newMessage,
            receiverId
          });
        }
      }
      
      // Konuşma listesini güncelle
      const updatedConversations = await updateConversationList();
      
      // Aktif konuşmayı güncelle
      if (updatedConversations.length > 0 && activeConversation) {
        const updatedActiveConversation = updatedConversations.find(c => c._id === activeConversation._id);
        if (updatedActiveConversation) {
          setActiveConversation(updatedActiveConversation);
        }
      }
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
    }
  };

  // Bir konuşmayı aktif olarak ayarlama
  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  // Sayfa açıldığında tüm mesajları okundu olarak işaretle
  useEffect(() => {
    // Sayfa yüklendiğinde okunmamış mesaj sayacını sıfırla
    if (markMessageNotificationsAsRead) {
      console.log('Messages page loaded, marking all messages as read');
      markMessageNotificationsAsRead();
    }
  }, [markMessageNotificationsAsRead]);

  return (
    <div className="messages-container">
      {error && <div className="error-message">{error}</div>}
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