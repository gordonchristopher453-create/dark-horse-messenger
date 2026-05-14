const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const groupRoutes = require('./routes/group.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const initSocket = require('./sockets/socket.handler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://dark-horse-frontend-three.vercel.app';

// Socket.IO
const io = socketio(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Rate limiters
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.'
});

// Security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    connectSrc: ["'self'", FRONTEND_URL, "https://dark-horse-messenger.onrender.com"],
    fontSrc: ["'self'", "https://fonts.googleapis.com"],
  }
}));

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Audit logging middleware
app.use((req, res, next) => {
  if (req.path !== '/') {
    logger.info({
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  next();
});

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
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);

app.use(notFound);
app.use(errorHandler);

initSocket(io);

connectDB().then(() => {
  server.listen(process.env.PORT || 5000, () => {
    console.log('================================');
    console.log('🐴 Dark Horse Messenger Backend');
    console.log('================================');
    console.log(`🚀 Server    : http://localhost:${process.env.PORT || 5000}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📡 Socket.IO : Active`);
    console.log(`🔒 CORS      : ${FRONTEND_URL}`);
    console.log(`🛡️  Security  : Enhanced`);
    console.log('================================');
  });
});

module.exports = { app, io };
