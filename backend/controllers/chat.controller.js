const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');

const getOrCreateDirectChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [currentUserId, userId], $size: 2 }
    })
    .populate('members', 'username displayName avatar isOnline lastSeen')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName avatar' } });

    if (chat) {
      return res.status(200).json({ success: true, data: { chat } });
    }

    chat = await Chat.create({ isGroup: false, members: [currentUserId, userId] });
    chat = await Chat.findById(chat._id)
      .populate('members', 'username displayName avatar isOnline lastSeen');

    res.status(201).json({ success: true, message: 'Chat created successfully', data: { chat } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      members: userId,
      archivedBy: { $nin: [userId] }
    })
    .populate('members', 'username displayName avatar isOnline lastSeen status')
    .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName avatar' } })
    .sort({ updatedAt: -1 });

    // Get unread count for each chat
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
        isDeleted: false,
        deletedFor: { $nin: [userId] }
      });

      return {
        ...chat.toObject(),
        unreadCount
      };
    }));

    res.status(200).json({ success: true, data: { chats: chatsWithUnread } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id })
      .populate('members', 'username displayName avatar isOnline lastSeen status')
      .populate('admins', 'username displayName avatar')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName avatar' } });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    res.status(200).json({ success: true, data: { chat } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const muteChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, { $addToSet: { mutedBy: req.user._id } });
    res.status(200).json({ success: true, message: 'Chat muted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unmuteChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, { $pull: { mutedBy: req.user._id } });
    res.status(200).json({ success: true, message: 'Chat unmuted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const archiveChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, { $addToSet: { archivedBy: req.user._id } });
    res.status(200).json({ success: true, message: 'Chat archived successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    await Message.deleteMany({ chat: chat._id });
    await Chat.findByIdAndDelete(chat._id);
    res.status(200).json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOrCreateDirectChat, getUserChats, getChatById,
  muteChat, unmuteChat, archiveChat, deleteChat
};
