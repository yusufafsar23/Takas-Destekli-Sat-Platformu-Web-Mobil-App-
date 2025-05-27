const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const tradeOfferRoutes = require('./routes/tradeOfferRoutes');
const messageRoutes = require('./routes/messageRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Middlewares
const { errorHandler, notFound } = require('./middleware/errorHandler');

// API Dokümantasyonu
const { swaggerDocs } = require('./docs/swagger');

// Config
dotenv.config();

// Express App
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Helmet yapılandırması - statik içerikler için izin ver
app.use(helmet({
  contentSecurityPolicy: false, // Geliştirme için kapatıldı, production'da özelleştirin
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Farklı kaynaklardan resim yüklenmesine izin ver
  crossOriginEmbedderPolicy: false // Gömülü içerikler için kısıtlamayı kaldır
}));

// Statik dosya sunucusu ayarları
// Uploaded files directory
app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));
console.log('Statik dosya dizini:', path.join(__dirname, '../frontend/public/uploads'));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/takas-platform')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Documentation Setup
swaggerDocs(app);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/trade-offers', tradeOfferRoutes);
app.use('/api/tradeoffers', tradeOfferRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/categories', categoryRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('Takas Platformu API çalışıyor!');
});

// 404 Not Found Route
app.use(notFound);

// Error Handling Middleware
app.use(errorHandler);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Kullanıcı kimliğini al ve sakla
  socket.on('authenticate', (userId) => {
    if (userId) {
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      socket.userId = userId;
      socket.join(`user:${userId}`); // kullanıcı özel odası
      
      // Kullanıcı bağlandığında bildirim sayısını güncellemesini iste
      setTimeout(() => {
        io.to(`user:${userId}`).emit('refreshUnreadCount');
      }, 1000);
    }
  });
  
  // Mesaj gönderme olayı
  socket.on('sendMessage', (messageData) => {
    if (messageData.receiverId) {
      console.log(`Sending message to user ${messageData.receiverId}`, messageData);
      
      // Alıcıya mesaj bildirimini gönder
      io.to(`user:${messageData.receiverId}`).emit('newMessage', messageData);
      
      // Alıcıya bildirim tetikle
      io.to(`user:${messageData.receiverId}`).emit('messageCountUpdated');
    }
  });
  
  // Takas teklifi bildirimi
  socket.on('tradeOfferNotification', (notification) => {
    if (notification.receiverId) {
      io.to(`user:${notification.receiverId}`).emit('newTradeOffer', notification);
    }
  });
  
  // Test için yeni mesaj simülasyonu
  socket.on('simulateNewMessage', (data) => {
    console.log('Simulating new message for test purposes:', data);
    
    // Test mesajı oluştur
    const testMessageData = {
      id: Date.now().toString(),
      _id: Date.now().toString(),
      sender: {
        _id: 'system',
        username: 'Sistem',
        avatar: '/avatar.png'
      },
      text: 'Bu bir test mesajıdır. Bildirim sistemi çalışıyor!',
      createdAt: new Date().toISOString(),
      conversationId: 'test-conversation'
    };
    
    // Kullanıcıya bildirim gönder (kendine)
    if (socket.userId) {
      console.log(`Test mesajı gönderiliyor: user:${socket.userId}`);
      io.to(`user:${socket.userId}`).emit('newMessage', testMessageData);
      
      // Bildirim sayısını da güncellemesini iste
      setTimeout(() => {
        io.to(`user:${socket.userId}`).emit('messageCountUpdated');
      }, 1000);
    }
  });
  
  // Test amaçlı doğrudan test mesajı gönderme
  socket.on('test:newMessage', (data) => {
    console.log('Test message event received:', data);
    
    // Test mesajı oluştur
    const testMessageData = {
      id: Date.now().toString(),
      _id: Date.now().toString(),
      sender: {
        _id: 'system',
        username: 'Sistem Test',
        avatar: '/avatar.png'
      },
      text: data.text || 'Test mesajı ' + new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString(),
      conversationId: 'test-conversation'
    };
    
    // Kullanıcıya bildirim gönder
    if (socket.userId) {
      console.log(`Doğrudan test mesajı gönderiliyor: user:${socket.userId}`);
      io.to(`user:${socket.userId}`).emit('newMessage', testMessageData);
    }
  });
  
  // Kullanıcının okunmamış mesaj sayısını güncellemesini isteme
  socket.on('requestUnreadCount', () => {
    if (socket.userId) {
      console.log(`User ${socket.userId} requested unread count update`);
      io.to(`user:${socket.userId}`).emit('refreshUnreadCount');
    }
  });
  
  // Bağlantı kesildiğinde
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Soket bağlantısını diğer modüllerde kullanabilmek için
app.set('io', io);

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Dokümantasyonu: http://localhost:${PORT}/api-docs`);
}); 