const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');

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
app.use(helmet());

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
    }
  });
  
  // Mesaj gönderme olayı
  socket.on('sendMessage', (messageData) => {
    if (messageData.receiverId) {
      io.to(`user:${messageData.receiverId}`).emit('newMessage', messageData);
    }
  });
  
  // Takas teklifi bildirimi
  socket.on('tradeOfferNotification', (notification) => {
    if (notification.receiverId) {
      io.to(`user:${notification.receiverId}`).emit('newTradeOffer', notification);
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