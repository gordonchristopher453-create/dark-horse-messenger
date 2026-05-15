/**
 * Dark Horse Messenger - Socket.IO Handler
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const { sendPushNotification } = require('../services/notification.service');

const onlineUsers = new Map();

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication token required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('username displayName avatar isOnline fcmToken');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ User connected: ${socket.user.username}`);
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() });
    socket.join(userId);
    socket.broadcast.emit('user:online', { userId, isOnline: true });
    socket.emit('users:online', Array.from(onlineUsers.keys()));

    socket.on('chat:join', async (chatId) => {
      try {
        const chat = await Chat.findOne({ _id: chatId, members: userId });
        if (chat) socket.join(chatId);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('chat:leave', (chatId) => socket.leave(chatId));

    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text', replyTo, messageId } = data;

        const chat = await Chat.findOne({ _id: chatId, members: userId })
          .populate('members', '_id fcmToken username displayName isOnline');

        if (!chat) return socket.emit('error', { message: 'Chat not found' });

        // Primary path: REST already saved the message, just broadcast it
        if (messageId) {
          const message = await Message.findById(messageId)
            .populate('sender', 'username displayName avatar')
            .populate('replyTo');

          if (message) {
            socket.to(chatId).emit('message:receive', { message, chatId });

            // Send push notifications to offline members
            for (const member of chat.members) {
              const memberId = member._id.toString();
              if (memberId !== userId && !onlineUsers.has(memberId) && member.fcmToken) {
                await sendPushNotification({
                  token: member.fcmToken,
                  title: socket.user.displayName,
                  body: type === 'text' ? content : `Sent a ${type}`,
                  data: { chatId, type: 'message' }
                });
              }
            }
          }
          return;
        }

        // Fallback: only create if no duplicate exists in the last 3 seconds
        const recentDuplicate = await Message.findOne({
          sender: userId,
          chat: chatId,
          content: content || '',
          type,
          createdAt: { $gte: new Date(Date.now() - 3000) }
        });

        if (recentDuplicate) {
          // Message already saved via REST — just broadcast it
          const populated = await Message.findById(recentDuplicate._id)
            .populate('sender', 'username displayName avatar')
            .populate('replyTo');
          socket.to(chatId).emit('message:receive', { message: populated, chatId });
          return;
        }

        let message = await Message.create({
          sender: userId, chat: chatId, type,
          content: content || '', replyTo: replyTo || null,
          deliveredTo: [userId]
        });

        message = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar')
          .populate('replyTo');

        await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: Date.now() });
        io.to(chatId).emit('message:receive', { message, chatId });

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('typing:start', (data) => {
      socket.to(data.chatId).emit('typing:start', {
        userId, username: socket.user.username,
        displayName: socket.user.displayName, chatId: data.chatId
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.chatId).emit('typing:stop', { userId, chatId: data.chatId });
    });

    socket.on('message:read', async (data) => {
      try {
        const { chatId, messageIds } = data;
        await Message.updateMany(
          { _id: { $in: messageIds }, chat: chatId, sender: { $ne: userId }, 'readBy.user': { $ne: userId } },
          { $push: { readBy: { user: userId, readAt: Date.now() } } }
        );
        socket.to(chatId).emit('message:read', { chatId, messageIds, readBy: userId, readAt: Date.now() });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji, chatId } = data;
        const message = await Message.findById(messageId);
        if (!message) return;
        message.reactions = message.reactions.filter(r => r.user.toString() !== userId);
        if (emoji) message.reactions.push({ user: userId, emoji });
        await message.save();
        io.to(chatId).emit('message:reacted', { messageId, reactions: message.reactions, chatId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const { messageId, chatId, deleteFor } = data;
        const message = await Message.findOne({ _id: messageId, sender: userId });
        if (!message) return;
        if (deleteFor === 'everyone') {
          message.isDeleted = true;
          message.content = 'This message was deleted';
          message.mediaUrl = '';
          await message.save();
          io.to(chatId).emit('message:deleted', { messageId, chatId, deleteFor: 'everyone' });
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('group:join', (groupId) => socket.join(groupId));
    socket.on('group:leave', (groupId) => {
      socket.leave(groupId);
      io.to(groupId).emit('group:member_left', { userId, groupId });
    });

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: Date.now() });
      socket.broadcast.emit('user:offline', { userId, lastSeen: Date.now() });
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.user.username}:`, error);
    });
  });

  return io;
};

const getUserSocketId = (userId) => onlineUsers.get(userId);
const isUserOnline = (userId) => onlineUsers.has(userId);

module.exports = initSocket;
module.exports.getUserSocketId = getUserSocketId;
module.exports.isUserOnline = isUserOnline;
