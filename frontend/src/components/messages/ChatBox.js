import React, { useState, useRef, useEffect } from 'react';
import '../../styles/Messages.css';

const ChatBox = ({ conversation, messages, onSendMessage, currentUserId }) => {
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Mesajlar yüklendiğinde ilk kez dibine kaydır, sonrasında otomatik scroll kapat
  useEffect(() => {
    // Sadece ilk mesaj yüklendiğinde aşağıya kaydır
    if (messagesContainerRef.current && messages.length > 0) {
      // İlk yükleme kontrolü - scrollTop === 0 ise sayfanın en üstünde demektir
      if (messagesContainerRef.current.scrollTop === 0) {
        // İlk kez yükleniyorsa aşağıya kaydır
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);
  
  // Manuel olarak aşağıya scroll yapma 
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };
  
  // Mesaj gönderme
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      setSendError(null);
      
      console.log('Sending message to conversation:', {
        conversationId: conversation._id,
        message: newMessage
      });
      
      await onSendMessage(newMessage);
      setNewMessage('');
      
      // Mesaj gönderildikten sonra manuel olarak alt kısma scroll yap
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Karşı tarafın adını alma
  const getRecipientName = () => {
    if (!conversation || !conversation.participants) return 'Kullanıcı';
    
    const recipient = conversation.participants.find(p => p._id !== currentUserId);
    return recipient ? recipient.username : 'Kullanıcı';
  };
  
  // Mesaj tarihini formatlama
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Mesaj gruplaması için tarih gösterimi
  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };
  
  // Mesajların tarih gruplarına ayrılması
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt);
      const dateString = date.toDateString();
      
      if (!groups[dateString]) {
        groups[dateString] = [];
      }
      
      groups[dateString].push(message);
    });
    
    return Object.entries(groups).map(([date, messagesGroup]) => ({
      date,
      formattedDate: formatMessageDate(date),
      messages: messagesGroup
    }));
  };
  
  const messageGroups = groupMessagesByDate();
  
  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>{getRecipientName()}</h3>
        <button 
          onClick={scrollToBottom}
          className="scroll-button"
          title="Mesajların sonuna git"
        >
          Sona Git
        </button>
      </div>
      
      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Henüz mesaj yok. Mesajlaşmaya başlayın!</p>
          </div>
        ) : (
          <div className="message-list">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="message-date-group">
                <div className="date-divider">
                  <span>{group.formattedDate}</span>
                </div>
                
                {group.messages.map((message, messageIndex) => {
                  const isCurrentUser = message.sender && (message.sender._id === currentUserId || message.sender === currentUserId);
                  return (
                    <div 
                      key={message._id || messageIndex} 
                      className={`message-item ${isCurrentUser ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        <p>{message.text}</p>
                        <span className="message-time">
                          {formatMessageTime(message.createdAt)}
                          {message.read && isCurrentUser && (
                            <span className="read-status">✓</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {sendError && (
        <div className="error-message">{sendError}</div>
      )}
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Bir mesaj yazın..."
          className="message-input"
          disabled={sendingMessage}
        />
        <button 
          type="submit" 
          className="send-button" 
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 