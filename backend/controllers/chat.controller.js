/**
 * Dark Horse Messenger - Chat Controller
 */

const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');

/**
 * @desc    Get or create one-to-one chat
 * @route   POST /api/chats/direct/:userId
 * @access  Private
 */
const getOrCreateDirectChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if direct chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [currentUserId, userId], $size: 2 }
    })
    .populate('members', 'username displayName avatar isOnline lastSeen')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username displayName avatar' }
    });

    if (chat) {
      return res.status(200).json({
        success: true,
        data: { chat }
      });
    }

    // Create new direct chat
    chat = await Chat.create({
      isGroup: false,
      members: [currentUserId, userId]
    });

    chat = await Chat.findById(chat._id)
      .populate('members', 'username displayName avatar isOnline lastSeen');

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: { chat }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get all user chats
 * @route   GET /api/chats
 * @access  Private
 */
const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: req.user._id,
      archivedBy: { $nin: [req.user._id] }
    })
    .populate('members', 'username displayName avatar isOnline lastSeen status')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username displayName avatar' }
    })
    .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: { chats }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get chat by ID
 * @route   GET /api/chats/:chatId
 * @access  Private
 */
const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      members: req.user._id
    })
    .populate('members', 'username displayName avatar isOnline lastSeen status')
    .populate('admins', 'username displayName avatar')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username displayName avatar' }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { chat }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Mute chat
 * @route   POST /api/chats/:chatId/mute
 * @access  Private
 */
const muteChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, {
      $addToSet: { mutedBy: req.user._id }
    });

    res.status(200).json({
      success: true,
      message: 'Chat muted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Unmute chat
 * @route   POST /api/chats/:chatId/unmute
 * @access  Private
 */
const unmuteChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, {
      $pull: { mutedBy: req.user._id }
    });

    res.status(200).json({
      success: true,
      message: 'Chat unmuted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Archive chat
 * @route   POST /api/chats/:chatId/archive
 * @access  Private
 */
const archiveChat = async (req, res) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, {
      $addToSet: { archivedBy: req.user._id }
    });

    res.status(200).json({
      success: true,
      message: 'Chat archived successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete chat
 * @route   DELETE /api/chats/:chatId
 * @access  Private
 */
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      members: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Delete all messages in chat
    await Message.deleteMany({ chat: chat._id });

    // Delete chat
    await Chat.findByIdAndDelete(chat._id);

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getOrCreateDirectChat,
  getUserChats,
  getChatById,
  muteChat,
  unmuteChat,
  archiveChat,
  deleteChat
};
