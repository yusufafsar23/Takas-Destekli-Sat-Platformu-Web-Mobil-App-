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
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import messageService from '../services/messageService';
import { useAuth } from '../context/AuthContext';

const MessagesScreen = ({ route, navigation }) => {
  // State tanımlamaları
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConversationListVisible, setIsConversationListVisible] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);

  // Referanslar
  const flatListRef = useRef(null);
  const { user, refreshUserData, authState } = useAuth();

  // Konuşmaları yükle
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Konuşmalar yükleniyor...");
      console.log("Mevcut kullanıcı ID:", user?._id);
      
      // Kullanıcı bilgisi yoksa yenilemeyi dene
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
      
      // Konuşmaları yükle
      let response;
      try {
        console.log("MessageService.getConversations() çağrılıyor...");
        response = await messageService.getConversations();
        console.log("API yanıtı:", response ? "Başarılı" : "Başarısız");
      } catch (apiError) {
        console.error("API çağrısı sırasında hata:", apiError);
        setError('Konuşmalar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        setLoading(false);
        return;
      }
      
      if (response && Array.isArray(response) && response.length > 0) {
        console.log(`${response.length} konuşma yüklendi`);
        
        // Konuşma verilerini göster (debug)
        response.forEach((conv, index) => {
          const otherUser = conv.participants?.find(p => p._id !== user?._id);
          console.log(`Konuşma ${index+1}: ${otherUser?.username || 'Bilinmeyen kullanıcı'} ile`);
        });
        
        // Tarih bazlı sıralama
        const sortedConversations = [...response].sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });

        // Kullanıcı bazında grupla - her kullanıcının sadece en son konuşmasını göster
        const userGroups = {};
        console.log(`Kullanıcı bazında gruplandırma yapılıyor. Toplam: ${sortedConversations.length} konuşma`);
        
        // Her diğer kullanıcı için sadece en son konuşmayı sakla
        sortedConversations.forEach(conv => {
          if (!conv.participants || !Array.isArray(conv.participants)) {
            console.log("Geçersiz konuşma verisi, katılımcılar bulunamadı", conv);
            return;
          }
          
          const otherUser = conv.participants.find(p => p._id !== user?._id);
          if (!otherUser || !otherUser._id) {
            console.log("Geçersiz konuşma verisi, diğer kullanıcı bulunamadı", conv);
            return;
          }
          
          const otherUserId = otherUser._id;
          
          // Bu kullanıcı için daha önce bir konuşma saklanmış mı?
          if (!userGroups[otherUserId]) {
            // İlk kez bu kullanıcıyla bir konuşma görüyoruz, direkt ekle
            userGroups[otherUserId] = {
              ...conv,
              // Her kullanıcı için tüm konuşmaları toplayacağımız bir dizi
              allConversationIds: [conv._id]
            };
          } else {
            // Bu kullanıcıyla daha önce bir konuşma saklanmış
            // Hangisi daha yeni, onu saklayalım
            const existingDate = new Date(userGroups[otherUserId].lastMessage?.createdAt || userGroups[otherUserId].createdAt);
            const newDate = new Date(conv.lastMessage?.createdAt || conv.createdAt);
            
            // Bu konuşma ID'sini konuşma ID'leri listesine ekle
            userGroups[otherUserId].allConversationIds.push(conv._id);
            
            if (newDate > existingDate) {
              // Yeni konuşma daha güncel, onu kullanalım ama ID listesini koru
              const allConversationIds = userGroups[otherUserId].allConversationIds;
              userGroups[otherUserId] = {
                ...conv,
                allConversationIds
              };
            }
          }
        });

        // Grupları array'e çevir ve tekrar tarihe göre sırala
        const groupedConversations = Object.values(userGroups).sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });
        
        console.log(`Gruplandırma sonrası: ${groupedConversations.length} benzersiz kullanıcı konuşması`);
        
        setConversations(groupedConversations);
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

  // Mesajları yükle
  const loadMessages = async (conversationId) => {
    try {
      setMessages([]);
      setLoading(true);
      setError(null);
      console.log(`${conversationId} ID'li konuşmanın mesajları yükleniyor...`);
      
      // Kullanıcı bilgisi kontrol et
      if (!user || !user._id) {
        console.log("Mesajları yüklerken kullanıcı bilgisi eksik, yenileme denenecek...");
        try {
          await refreshUserData();
        } catch (refreshError) {
          console.error("Mesajları yüklerken kullanıcı bilgisi yenilenirken hata:", refreshError);
          setError('Kullanıcı oturumu doğrulanamadı. Lütfen yeniden giriş yapın.');
          setLoading(false);
          return;
        }
      }
      
      let allMessages = [];
      
      // Aktif konuşmanın tüm konuşma ID'lerini al
      let conversationIds = activeConversation?.allConversationIds || [conversationId];
      console.log(`Bu kullanıcı ile toplam ${conversationIds.length} konuşma bulundu: ${JSON.stringify(conversationIds)}`);
      
      // Eğer hiç ID yoksa, sadece mevcut ID'yi kullan
      if (!conversationIds || conversationIds.length === 0) {
        console.log("Konuşma ID'leri bulunamadı, mevcut ID kullanılacak");
        conversationIds = [conversationId];
      }
      
      // Her konuşma için mesajları al ve birleştir
      for (const convId of conversationIds) {
        // ID geçerli mi kontrol et
        if (!convId) {
          console.error("Geçersiz konuşma ID'si, atlanıyor");
          continue;
        }
        
        try {
          const timestamp = new Date().getTime();
          console.log(`${convId} ID'li konuşmanın mesajları alınıyor...`);
          
          const convMessages = await messageService.getConversationMessages(convId, { _t: timestamp });
          
          if (Array.isArray(convMessages) && convMessages.length > 0) {
            console.log(`${convMessages.length} mesaj alındı (konuşma: ${convId})`);
            
            // Mesajları işle ve birleştir
            const processedMessages = convMessages.map(message => ({
              ...message,
              isSentByCurrentUser: checkIfMessageFromCurrentUser(message),
              conversationId: convId
            }));
            
            allMessages = [...allMessages, ...processedMessages];
          } else {
            console.log(`${convId} ID'li konuşma için mesaj bulunamadı`);
          }
        } catch (error) {
          console.error(`${convId} ID'li konuşmanın mesajları alınırken hata:`, error);
          // Bir hata olsa bile diğer konuşmaları yüklemeye devam et
        }
      }
      
      // Tüm mesajları tarihe göre sırala
      allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      console.log(`Toplam ${allMessages.length} mesaj yüklendi ve sıralandı`);
      
      setMessages(allMessages);
    } catch (error) {
      console.error('Mesajları yüklerken hata:', error);
      setError('Mesajlar yüklenirken bir hata oluştu.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Mesaj sahibini kontrol et - basit ve güvenilir
  const checkIfMessageFromCurrentUser = (message) => {
    if (!user || !user._id) {
      console.log('Mesaj sahibi kontrol edilirken kullanıcı bilgisi yok');
      return false;
    }
    
    // 1. senderId kontrolü
    if (message.senderId === user._id) {
      return true;
    }
    
    // 2. sender obje kontrolü
    if (message.sender && typeof message.sender === 'object' && message.sender._id === user._id) {
      return true;
    }
    
    // 3. sender string kontrolü
    if (message.sender && typeof message.sender === 'string' && message.sender === user._id) {
      return true;
    }
    
    return false;
  };

  // Konuşma seçimi
  const handleSelectConversation = async (conversation) => {
    console.log(`Konuşma seçildi: ${conversation._id}, allConversationIds:`, 
      conversation.allConversationIds ? `${conversation.allConversationIds.length} adet` : "bulunamadı");
    
    // Eğer allConversationIds yoksa, boş bir dizi olarak başlat
    if (!conversation.allConversationIds) {
      console.log("Konuşma için allConversationIds oluşturuluyor");
      conversation.allConversationIds = [conversation._id];
    }
    
    // Konuşmanın tüm mesajlarını yüklemeden önce aktif konuşmayı ayarla
    setActiveConversation(conversation);
    setIsConversationListVisible(false);
    
    // Konuşmanın mesajlarını yükle
    await loadMessages(conversation._id);
  };

  // Yeni konuşma başlatma
  const handleStartNewConversation = async (userId, productId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Konuşma başlatılıyor: ${userId} kullanıcısı ile ${productId} ürünü hakkında`);
      
      // Önce kullanıcı ile mevcut tüm konuşmaları bul
      console.log("Önce tüm konuşmaları kontrol edelim...");
      const allConversations = await messageService.getConversations();
      
      // Bu kullanıcı ile olan tüm konuşmaları filtrele
      const existingConversations = allConversations.filter(conv => 
        conv.participants && 
        Array.isArray(conv.participants) && 
        conv.participants.some(p => p._id === userId || p.id === userId)
      );
      
      console.log(`Bu kullanıcı ile ${existingConversations.length} mevcut konuşma bulundu`);
      
      // Eğer mevcut konuşmalar varsa, onları kullan ve yeni oluşturma
      if (existingConversations.length > 0) {
        console.log("Mevcut konuşmalar bulundu, yeni konuşma oluşturulmayacak");
        
        // Konuşmaları tarih sırasına göre sırala
        existingConversations.sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
          return new Date(dateB) - new Date(dateA);
        });
        
        // En son konuşmayı al
        const conversation = existingConversations[0];
        console.log(`En son konuşma seçildi: ${conversation._id}`);
        
        // ID'lerini ekle
        conversation.allConversationIds = existingConversations.map(c => c._id);
        console.log(`Toplam ${conversation.allConversationIds.length} konuşma ID'si eklendi`);
        
        setActiveConversation(conversation);
        setIsConversationListVisible(false);
        
        await loadMessages(conversation._id);
        return;
      }
      
      // Mevcut konuşma yoksa yeni oluştur
      console.log("Mevcut konuşma bulunamadı, yeni konuşma oluşturuluyor...");
      const conversation = await messageService.createConversation(userId, productId);
      
      if (conversation) {
        console.log(`Yeni konuşma oluşturuldu: ${conversation._id}`);
        conversation.allConversationIds = [conversation._id];
        
        setActiveConversation(conversation);
        setIsConversationListVisible(false);
        
        if (conversation._id) {
          await loadMessages(conversation._id);
        }
      } else {
        console.error("Konuşma oluşturulamadı");
        setError("Konuşma başlatılamadı. Lütfen tekrar deneyiniz.");
      }
    } catch (error) {
      console.error('Konuşma başlatırken hata:', error);
      setError('Konuşma başlatılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Uygulama başlatma - authState değiştiğinde konuşmaları yükle
  useEffect(() => {
    const checkAndLoadConversations = async () => {
      if (authState === 'authenticated' && user && user._id) {
        console.log("Kullanıcı oturumu doğrulandı:", user._id);
        await loadConversations();
      } else if (authState === 'authenticated' && (!user || !user._id)) {
        console.log("Oturum doğrulandı ama kullanıcı bilgisi eksik, yenileme deneniyor");
        try {
          const refreshedUser = await refreshUserData();
          if (refreshedUser) {
            await loadConversations();
          } else {
            setError('Kullanıcı bilgisi alınamadı. Lütfen yeniden giriş yapın.');
            setLoading(false);
          }
        } catch (error) {
          console.error("Kullanıcı bilgisi yenilenirken hata:", error);
          setError('Kullanıcı oturumu doğrulanamadı. Lütfen yeniden giriş yapın.');
          setLoading(false);
        }
      } else if (authState === 'unauthenticated') {
        console.log("Kullanıcı oturumu doğrulanmadı");
        setError('Oturum açmanız gerekiyor.');
        setLoading(false);
      } else if (authState === 'initializing') {
        console.log("Oturum durumu başlatılıyor, bekleyin...");
      }
    };
    
    checkAndLoadConversations();
  }, [authState, user]);

  // Route params handling
  useEffect(() => {
    if (route.params && authState === 'authenticated' && user && user._id) {
      const { recipientId, productId } = route.params;
      console.log('Route parametreleri:', { recipientId, productId });
      
      if (recipientId) {
        handleStartNewConversation(recipientId, productId);
      }
    }
  }, [route.params, authState, user]);

  // Component mount olduğunda konuşmaları otomatik yükle
  useEffect(() => {
    const autoLoadConversations = async () => {
      console.log("Component mount: Otomatik yükleme başlatılıyor");
      if (user && user._id) {
        console.log("Konuşmalar otomatik olarak yükleniyor");
        loadConversations();
      } else if (authState === 'authenticated') {
        console.log("Kullanıcı bilgisi eksik, yenileme deneniyor");
        const refreshResult = await refreshUserData();
        if (refreshResult) {
          loadConversations();
        }
      }
    };

    autoLoadConversations();
    
    // Ekrana her dönüşte konuşmaları yenile
    const unsubscribe = navigation.addListener('focus', () => {
      console.log("MessagesScreen odaklandı - konuşmaları yeniliyorum");
      if (isConversationListVisible) {
        autoLoadConversations();
      } else if (activeConversation?._id) {
        loadMessages(activeConversation._id);
      }
    });
    
    return unsubscribe;
  }, [navigation, isConversationListVisible, activeConversation]);

  // Mesaj gönderme
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    setSendingMessage(true);
    setError(null);
    try {
      // Ana konuşma ID'sini kullan (ilk konuşma ID'si)
      const primaryConversationId = activeConversation._id;
      console.log(`Mesaj gönderiliyor: "${newMessage}" - Konuşma ID: ${primaryConversationId}`);
      
      const sentMessage = await messageService.sendMessage(primaryConversationId, newMessage.trim());
      
      // Gönderilen mesajı ekle
      const enhancedMessage = {
        ...sentMessage,
        senderId: sentMessage.senderId || user?._id,
        sender: sentMessage.sender || { _id: user?._id },
        isSentByCurrentUser: true,
        conversationId: primaryConversationId
      };
      
      setMessages(prevMessages => [...prevMessages, enhancedMessage]);
      setNewMessage('');
      
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    } catch (error) {
      console.error('Mesaj gönderirken hata:', error);
      setError('Mesaj gönderilirken bir hata oluştu.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Yenileme işlemi
  const onRefresh = async () => {
    setRefreshing(true);
    
    if (activeConversation) {
      await loadMessages(activeConversation._id);
    } else {
      await loadConversations();
    }
    
    setRefreshing(false);
  };

  // Saati formatla
  const formatTime = (dateString) => {
    return format(new Date(dateString), 'HH:mm');
  };

  // Tarihi formatla
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

  // Kullanıcı adına göre sabit bir renk üret
  const getColorFromUsername = (username) => {
    if (!username) return '#0066cc'; // Varsayılan renk
    
    // Kullanıcı adının karakterlerinin ASCII değerlerini topla
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Hash değerini renk koduna dönüştür
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#6A67CE', '#CC0E74', 
      '#5D6DBE', '#F9DC5C', '#3BCEAC', '#0074E4', '#EE274C'
    ];
    
    // Pozitif bir sayı elde etmek için mutlak değer al
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Yükleniyor ekranı
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {isConversationListVisible ? (
        // KONUŞMA LİSTESİ GÖRÜNÜMÜ
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
                  if (user && user._id) {
                    loadConversations();
                  } else {
                    refreshUserData().then(userData => {
                      if (userData) loadConversations();
                    });
                  }
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
                onPress={() => {
                  if (activeConversation?._id) {
                    loadMessages(activeConversation._id);
                  }
                }}
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
                // Veri doğrulama ve koruma
                if (!item || !item.participants) {
                  console.log("Hatalı konuşma verisi, atlanıyor:", item);
                  return null;
                }
                
                const otherParticipant = item.participants?.find(p => p._id !== user?._id);
                if (!otherParticipant) {
                  console.log("Diğer kullanıcı bulunamadı, atlanıyor:", item);
                  return null;
                }
                
                const lastMessageText = item.lastMessage?.text || '';
                const lastMessageTime = item.lastMessage?.createdAt ? formatTime(item.lastMessage.createdAt) : '';
                const lastMessageDate = item.lastMessage?.createdAt ? formatDate(item.lastMessage.createdAt) : '';
                
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
                    {/* Avatar/Initial Circle */}
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: getColorFromUsername(otherParticipant?.username),
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 10
                    }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                        {otherParticipant?.username ? otherParticipant.username.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    
                    {/* Message Content */}
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
                          style={{ 
                            fontSize: 14, 
                            color: item.unreadCount > 0 ? '#0066cc' : '#666', 
                            fontWeight: item.unreadCount > 0 ? 'bold' : 'normal',
                            flex: 1 
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.unreadCount > 0 ? 'Yeni mesaj' : lastMessageText}
                        </Text>
                        
                        <Text style={{ fontSize: 12, color: '#666', marginLeft: 10 }}>
                          {lastMessageTime}
                        </Text>
                      </View>
                    </View>
                    
                    {item.unreadCount > 0 && (
                      <View style={{
                        position: 'absolute',
                        right: 15,
                        top: 15,
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
        // MESAJLAŞMA GÖRÜNÜMÜ
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: '#f5f5f5' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Mesajlaşma Başlığı */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 15,
            paddingTop: Platform.OS === 'android' ? 30 : 15,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: '#e1e4e8',
          }}>
            <TouchableOpacity
              onPress={() => {
                setIsConversationListVisible(true);
                setActiveConversation(null);
                // Konuşma listesine geri dönerken konuşmaları yenile
                loadConversations();
              }}
              style={{ padding: 5, marginRight: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {activeConversation?.participants?.find(p => p._id !== user?._id)?.username || 'Kullanıcı'}
            </Text>
            
            <TouchableOpacity 
              onPress={() => {
                if (activeConversation?._id) {
                  // activeConversation._id yerine, tüm konuşma ID'lerini yükle
                  loadMessages(activeConversation._id);
                }
              }}
              style={{ padding: 5, marginLeft: 'auto' }}
            >
              <Ionicons name="refresh" size={20} color="#0066cc" />
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
                  if (user && user._id) {
                    loadConversations();
                  } else {
                    refreshUserData().then(userData => {
                      if (userData) loadConversations();
                    });
                  }
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
          
          {/* Mesaj Alanı */}
          {messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>Henüz mesaj yok.</Text>
              <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Mesajlaşmaya başlayın!</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  if (activeConversation?._id) {
                    loadMessages(activeConversation._id);
                  }
                }}
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
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item._id || `msg-${index}`}
              contentContainerStyle={{ padding: 10 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                // Mesaj sahibini belirle - isSentByCurrentUser özelliğini kullan
                const isMine = item.isSentByCurrentUser;
                
                return (
                  <View style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    marginLeft: isMine ? '20%' : 0,
                    marginRight: isMine ? 0 : '20%',
                    marginVertical: 4
                  }}>
                    <View style={{
                      backgroundColor: isMine ? '#0066cc' : '#e9e9eb',
                      borderRadius: 18,
                      borderBottomRightRadius: isMine ? 5 : 18,
                      borderBottomLeftRadius: isMine ? 18 : 5,
                      padding: 12
                    }}>
                      <Text style={{ 
                        color: isMine ? 'white' : 'black', 
                        fontSize: 16 
                      }}>
                        {item.text}
                      </Text>
                      <Text style={{ 
                        color: isMine ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', 
                        fontSize: 10, 
                        alignSelf: 'flex-end',
                        marginTop: 2 
                      }}>
                        {formatTime(item.createdAt)}
                        {isMine && item.read && <Text style={{ color: '#8ee0ff' }}> ✓</Text>}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
          
          {/* Mesaj Girişi */}
          <View style={{
            flexDirection: 'row',
            padding: 10,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e1e4e8',
            alignItems: 'center',
          }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: '#f0f2f5',
                borderRadius: 20,
                paddingHorizontal: 15,
                paddingVertical: 8,
                maxHeight: 100,
                fontSize: 15,
                marginRight: 10,
              }}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Mesajınızı yazın..."
              multiline
            />
            
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: !newMessage.trim() || sendingMessage ? '#ccc' : '#0066cc',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen; 
