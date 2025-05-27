/**
 * Tarayıcı bildirimlerini yönetmek için servis
 */

// Bildirim izni kontrolü
export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    console.log('Bu tarayıcı bildirim desteğine sahip değil');
    return false;
  }
  
  return Notification.permission;
};

// Bildirim izni isteme
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Bu tarayıcı bildirim desteğine sahip değil');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Bildirim gösterme
export const showNotification = (title, options = {}) => {
  // İzin kontrolü
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Bildirim göstermek için izin yok');
    return null;
  }
  
  try {
    // Varsayılan seçenekler
    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false
    };
    
    // Bildirim oluştur
    const notification = new Notification(title, { ...defaultOptions, ...options });
    
    // Bildirime tıklandığında
    notification.onclick = options.onClick || (() => {
      window.focus();
      notification.close();
    });
    
    // Bildirim kapandığında
    notification.onclose = options.onClose || (() => {
      console.log('Bildirim kapatıldı');
    });
    
    return notification;
  } catch (error) {
    console.error('Bildirim gösterilirken hata oluştu:', error);
    return null;
  }
};

// Yeni mesaj bildirimi gösterme
export const showMessageNotification = (sender, messageText, conversationId = null) => {
  const senderName = typeof sender === 'string' ? sender : (sender?.username || 'Bilinmeyen Kullanıcı');
  const message = messageText.length > 60 ? messageText.substring(0, 60) + '...' : messageText;
  
  return showNotification(senderName, {
    body: message,
    data: { conversationId },
    onClick: function() {
      window.focus();
      if (conversationId) {
        window.location.href = `/messages?conversation=${conversationId}`;
      } else {
        window.location.href = '/messages';
      }
      this.close();
    }
  });
};

export default {
  checkNotificationPermission,
  requestNotificationPermission,
  showNotification,
  showMessageNotification
}; 