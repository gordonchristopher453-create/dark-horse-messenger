/**
 * Dark Horse Messenger - Main Server Entry Point
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const groupRoutes = require('./routes/group.routes');

// Error middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Socket handler
const initSocket = require('./sockets/socket.handler');

// Initialize express
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🐴 Dark Horse Messenger API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Initialize sockets
initSocket(io);

// Connect DB then start server
connectDB().then(() => {
  server.listen(process.env.PORT || 5000, () => {
    console.log('================================');
    console.log('🐴 Dark Horse Messenger Backend');
    console.log('================================');
    console.log(`🚀 Server    : http://localhost:${process.env.PORT || 5000}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📡 Socket.IO : Active`);
    console.log('================================');
  });
});

module.exports = { app, io };
