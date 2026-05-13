/**
 * Dark Horse Messenger - Socket.IO Handler
 * Handles all realtime events
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const Chat = require('../models/chat.model');

// Store online users: userId -> socketId
const onlineUsers = new Map();

const initSocket = (io) => {

  // ==========================================
  // AUTHENTICATION MIDDLEWARE
  // ==========================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select('username displayName avatar isOnline');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();

    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // ==========================================
  // CONNECTION
  // ==========================================
  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (${socket.id})`);

    const userId = socket.user._id.toString();

    // Store socket mapping
    onlineUsers.set(userId, socket.id);

    // Update user online status
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: Date.now()
    });

    // Join personal room
    socket.join(userId);

    // Notify others that user is online
    socket.broadcast.emit('user:online', {
      userId,
      isOnline: true
    });

    // Send current online users to newly connected user
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    // ==========================================
    // JOIN CHAT ROOMS
    // ==========================================
    socket.on('chat:join', async (chatId) => {
      try {
        // Verify user is member of chat
        const chat = await Chat.findOne({
          _id: chatId,
          members: userId
        });

        if (chat) {
          socket.join(chatId);
          console.log(`👥 ${socket.user.username} joined chat: ${chatId}`);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // LEAVE CHAT ROOM
    // ==========================================
    socket.on('chat:leave', (chatId) => {
      socket.leave(chatId);
      console.log(`👋 ${socket.user.username} left chat: ${chatId}`);
    });

    // ==========================================
    // SEND MESSAGE
    // ==========================================
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text', replyTo } = data;

        // Verify chat membership
        const chat = await Chat.findOne({
          _id: chatId,
          members: userId
        }).populate('members', '_id');

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Create message
        let message = await Message.create({
          sender: userId,
          chat: chatId,
          type,
          content: content || '',
          replyTo: replyTo || null,
          deliveredTo: [userId]
        });

        // Populate message
        message = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar')
          .populate('replyTo');

        // Update chat last message
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          updatedAt: Date.now()
        });

        // Emit to all members in the chat room
        io.to(chatId).emit('message:receive', { message, chatId });

        // Send delivery receipts to offline members
        chat.members.forEach((member) => {
          const memberId = member._id.toString();
          if (memberId !== userId) {
            const memberSocketId = onlineUsers.get(memberId);
            if (memberSocketId) {
              // Member is online — mark as delivered
              io.to(memberId).emit('message:delivered', {
                messageId: message._id,
                chatId
              });
            }
          }
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // TYPING INDICATORS
    // ==========================================
    socket.on('typing:start', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('typing:start', {
        userId,
        username: socket.user.username,
        displayName: socket.user.displayName,
        chatId
      });
    });

    socket.on('typing:stop', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('typing:stop', {
        userId,
        chatId
      });
    });

    // ==========================================
    // READ RECEIPTS
    // ==========================================
    socket.on('message:read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        // Update messages as read
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            chat: chatId,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId }
          },
          {
            $push: {
              readBy: { user: userId, readAt: Date.now() }
            }
          }
        );

        // Notify sender that messages were read
        socket.to(chatId).emit('message:read', {
          chatId,
          messageIds,
          readBy: userId,
          readAt: Date.now()
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // MESSAGE REACTIONS
    // ==========================================
    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) return;

        // Remove existing reaction
        message.reactions = message.reactions.filter(
          r => r.user.toString() !== userId
        );

        // Add new reaction
        if (emoji) {
          message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        // Broadcast reaction to chat room
        io.to(chatId).emit('message:reacted', {
          messageId,
          reactions: message.reactions,
          chatId
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // MESSAGE DELETED
    // ==========================================
    socket.on('message:delete', async (data) => {
      try {
        const { messageId, chatId, deleteFor } = data;

        const message = await Message.findOne({
          _id: messageId,
          sender: userId
        });

        if (!message) return;

        if (deleteFor === 'everyone') {
          message.isDeleted = true;
          message.content = 'This message was deleted';
          message.mediaUrl = '';
          await message.save();

          // Notify all members
          io.to(chatId).emit('message:deleted', {
            messageId,
            chatId,
            deleteFor: 'everyone'
          });
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // MESSAGE EDITED
    // ==========================================
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content, chatId } = data;

        const message = await Message.findOneAndUpdate(
          { _id: messageId, sender: userId, type: 'text' },
          { content, isEdited: true, editedAt: Date.now() },
          { new: true }
        ).populate('sender', 'username displayName avatar');

        if (!message) return;

        // Notify all members
        io.to(chatId).emit('message:edited', {
          message,
          chatId
        });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // ==========================================
    // GROUP EVENTS
    // ==========================================
    socket.on('group:join', (groupId) => {
      socket.join(groupId);
    });

    socket.on('group:leave', (groupId) => {
      socket.leave(groupId);
      io.to(groupId).emit('group:member_left', {
        userId,
        groupId
      });
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);

      // Remove from online users
      onlineUsers.delete(userId);

      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: Date.now()
      });

      // Notify others
      socket.broadcast.emit('user:offline', {
        userId,
        lastSeen: Date.now()
      });
    });

    // ==========================================
    // ERROR HANDLING
    // ==========================================
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.user.username}:`, error);
    });

  });

  return io;
};

// Helper to get socket ID by user ID
const getUserSocketId = (userId) => {
  return onlineUsers.get(userId);
};

// Helper to check if user is online
const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

module.exports = initSocket;
module.exports.getUserSocketId = getUserSocketId;
module.exports.isUserOnline = isUserOnline;
