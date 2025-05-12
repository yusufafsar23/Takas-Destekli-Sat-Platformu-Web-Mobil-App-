import React from 'react';
import '../../styles/Messages.css';

const ConversationList = ({ conversations, activeConversation, onSelect, currentUserId }) => {
  // Son mesajı kısaltma
  const truncateMessage = (text, maxLength = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Kullanıcı adını alma (aktif kullanıcı olmayan)
  const getOtherUserName = (conversation) => {
    if (!conversation || !conversation.participants) return 'Kullanıcı';
    
    const otherUser = conversation.participants.find(p => p._id !== currentUserId);
    return otherUser ? otherUser.username : 'Kullanıcı';
  };

  // Tarih formatı
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Bugün içindeyse saat göster
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } 
    
    // Dün ise "Dün" göster
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    }
    
    // Bu hafta içindeyse gün adı göster
    const daysOfWeek = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayDiff = (now - date) / (1000 * 60 * 60 * 24);
    
    if (dayDiff < 7) {
      return daysOfWeek[date.getDay()];
    }
    
    // Diğer durumlar için tarih göster
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-conversations">
          <p>Henüz bir mesajlaşmanız bulunmuyor.</p>
        </div>
      ) : (
        <ul>
          {conversations.map(conversation => (
            <li 
              key={conversation._id}
              className={`conversation-item ${activeConversation && activeConversation._id === conversation._id ? 'active' : ''}`}
              onClick={() => onSelect(conversation)}
            >
              <div className="conversation-avatar">
                {/* Avatar için ilk harf */}
                {getOtherUserName(conversation).charAt(0).toUpperCase()}
              </div>
              
              <div className="conversation-details">
                <div className="conversation-header">
                  <span className="conversation-name">{getOtherUserName(conversation)}</span>
                  <span className="conversation-time">
                    {conversation.lastMessage?.createdAt && formatDate(conversation.lastMessage.createdAt)}
                  </span>
                </div>
                
                <div className="conversation-preview">
                  <p className="preview-text">
                    {conversation.lastMessage 
                      ? truncateMessage(conversation.lastMessage.text) 
                      : 'Henüz mesaj yok'}
                  </p>
                  
                  {conversation.unreadCount > 0 && (
                    <span className="unread-badge">{conversation.unreadCount}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationList; 