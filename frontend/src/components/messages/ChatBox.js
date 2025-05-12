import React, { useState, useRef, useEffect } from 'react';
import '../../styles/Messages.css';

const ChatBox = ({ conversation, messages, onSendMessage, currentUserId }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Mesajlar yüklendiğinde ve yeni mesaj geldiğinde otomatik scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Mesaj gönderme
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
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
      </div>
      
      <div className="messages-container">
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
                  const isCurrentUser = message.sender === currentUserId;
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
      
      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Bir mesaj yazın..."
          className="message-input"
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim()}>
          Gönder
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 