import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to check and refresh token if needed
const ensureValidToken = async () => {
  try {
    // Check if we have a token in AsyncStorage
    const authTokenKeys = ['authToken', 'token'];
    let token = null;
    
    for (const key of authTokenKeys) {
      const storedToken = await AsyncStorage.getItem(key);
      if (storedToken) {
        token = storedToken;
        console.log(`Token found with key: ${key}`);
        break;
      }
    }
    
    if (token) {
      // API instance ve headers kontrolü
      if (!api) {
        console.error('API instance initialized incorrectly');
        return false;
      }
      
      // Ensure API headers structure exists
      if (!api.defaults) api.defaults = {};
      if (!api.defaults.headers) api.defaults.headers = {};
      if (!api.defaults.headers.common) api.defaults.headers.common = {};
      
      // Set the token
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Token successfully set in API headers');
        return true;
      } catch (headerError) {
        console.error('Error setting Authorization header:', headerError);
        return false;
      }
    }
    
    console.log('No token found in AsyncStorage');
    return false;
  } catch (error) {
    console.error('Error checking token:', error);
    return false;
  }
};

const messageService = {
  // Tüm konuşmaları getirme
  async getConversations() {
    try {
      // Ensure we have a valid token
      const tokenValid = await ensureValidToken();
      if (!tokenValid) {
        console.log('Token bulunamadı, konuşmalar yüklenemedi');
        return [];
      }
      
      console.log('Token doğrulandı, konuşmalar yükleniyor...');
      const response = await api.get('/messages/conversations');
      console.log('Conversations response:', response);
      // API direkt olarak array dönüyor
      return response || [];
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  },

  // Arşivlenmiş konuşmaları getirme
  async getArchivedConversations() {
    try {
      await ensureValidToken();
      const response = await api.get('/messages/conversations/archived');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bir konuşmanın mesajlarını getirme
  async getConversationMessages(conversationId, params = {}) {
    try {
      await ensureValidToken();
      const response = await api.get(`/messages/conversations/${conversationId}/messages`, { params });
      console.log('Messages response:', response);
      // API direkt olarak array dönüyor
      return response || [];
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      return [];
    }
  },

  // Kullanıcı ile olan konuşmayı getirme veya oluşturma
  async createConversation(participantId, productId, tradeOfferId) {
    try {
      await ensureValidToken();
      const response = await api.post('/messages/conversations', { 
        participantId, 
        ...(productId && { productId }),
        ...(tradeOfferId && { tradeOfferId })
      });
      return response || {};
    } catch (error) {
      console.error('Error in createConversation:', error);
      return null;
    }
  },

  // Kullanıcı ile mevcut konuşmayı bul veya yeni konuşma oluştur
  async getOrCreateConversation(participantId, productId, tradeOfferId) {
    try {
      console.log(`getOrCreateConversation çağrıldı: participantId=${participantId}, productId=${productId}`);
      await ensureValidToken();
      
      // Önce bu kullanıcı ile olan tüm konuşmaları al
      const allConversations = await this.getConversations();
      console.log(`${allConversations.length} konuşma bulundu, kullanıcı kontrolü yapılıyor...`);
      
      // Kullanıcı bazında konuşmaları filtrele
      const userConversations = [];
      
      if (Array.isArray(allConversations) && allConversations.length > 0) {
        // Bu kullanıcı ile olan tüm konuşmaları bul
        for (const conv of allConversations) {
          // Katılımcıları kontrol et
          const hasParticipant = conv.participants && 
                               Array.isArray(conv.participants) && 
                               conv.participants.some(p => p._id === participantId || p.id === participantId);
          
          if (hasParticipant) {
            console.log(`Kullanıcı ${participantId} ile mevcut konuşma bulundu: ${conv._id}`);
            if (conv.productId) {
              console.log(`Bu konuşma ürün ID=${conv.productId} için oluşturulmuş`);
            }
            userConversations.push(conv);
          }
        }
      }
      
      console.log(`Bu kullanıcı ile toplam ${userConversations.length} konuşma bulundu`);
      
      let primaryConversation = null;
      
      // Kullanıcı ile konuşma var mı?
      if (userConversations.length > 0) {
        // ÖNEMLİ: Ürün ID'si aramayı devre dışı bırak, her zaman en son konuşmayı kullan
        // Bu şekilde tüm mesajlar tek bir konuşmada görünecek
        
        // Konuşmaları tarihe göre sırala, en yenisi ilk sırada
        userConversations.sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });
        
        // En son konuşmayı al
        primaryConversation = userConversations[0];
        console.log(`En son konuşma seçildi: ${primaryConversation._id}`);
        
        // Konuşma ID'lerini ekle
        primaryConversation.allConversationIds = userConversations.map(c => c._id);
        console.log(`Mevcut konuşma kullanılacak: ${primaryConversation._id}, toplam ${primaryConversation.allConversationIds.length} konuşma entegre edildi`);
        
        return primaryConversation;
      }
      
      // Mevcut konuşma yoksa yeni oluştur
      console.log(`Mevcut konuşma bulunamadı, yeni konuşma oluşturuluyor...`);
      const newConversation = await this.createConversation(participantId, productId, tradeOfferId);
      
      if (newConversation) {
        console.log(`Yeni konuşma oluşturuldu: ${newConversation._id}`);
        // Yeni konuşmaya allConversationIds özelliğini ekle
        newConversation.allConversationIds = [newConversation._id];
      } else {
        console.error("Konuşma oluşturulamadı");
      }
      
      return newConversation;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return null;
    }
  },

  // Mesaj gönderme
  async sendMessage(conversationId, text, attachments) {
    try {
      await ensureValidToken();
      const payload = { text };
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
      }
      const response = await api.post(`/messages/conversations/${conversationId}`, payload);
      return response || {};
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  },

  // Mesajları okundu olarak işaretleme
  async markAsRead(conversationId) {
    try {
      await ensureValidToken();
      const response = await api.put(`/messages/conversations/${conversationId}/read`);
      return response || {};
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return null;
    }
  },

  // Konuşmayı arşivleme
  async archiveConversation(conversationId) {
    try {
      await ensureValidToken();
      const response = await api.put(`/messages/conversations/${conversationId}/archive`);
      return response || {};
    } catch (error) {
      console.error('Error in archiveConversation:', error);
      return null;
    }
  },

  // Konuşmayı arşivden çıkarma
  async unarchiveConversation(conversationId) {
    try {
      await ensureValidToken();
      const response = await api.put(`/messages/conversations/${conversationId}/unarchive`);
      return response || {};
    } catch (error) {
      console.error('Error in unarchiveConversation:', error);
      return null;
    }
  },

  // Okunmamış mesaj sayısını getirme
  async getUnreadCount() {
    try {
      await ensureValidToken();
      const response = await api.get('/messages/unread/count');
      return response || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  },

  // Mesaj arama
  async searchMessages(query) {
    try {
      await ensureValidToken();
      const response = await api.get('/messages/search', { params: { q: query } });
      return response || [];
    } catch (error) {
      console.error('Error in searchMessages:', error);
      return [];
    }
  }
};

export default messageService; 