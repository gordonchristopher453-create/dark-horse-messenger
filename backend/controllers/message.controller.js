/**
 * Dark Horse Messenger - Message Controller
 */

const Message = require('../models/message.model');
const Chat = require('../models/chat.model');

/**
 * @desc    Send a message
 * @route   POST /api/messages/:chatId
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const { content, type = 'text', replyTo } = req.body;
    const { chatId } = req.params;

    // Verify chat exists and user is a member
    const chat = await Chat.findOne({
      _id: chatId,
      members: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Build message data
    const messageData = {
      sender: req.user._id,
      chat: chatId,
      type,
      content: content || '',
      replyTo: replyTo || null
    };

    // Handle media upload
    if (req.uploadedFile) {
      messageData.mediaUrl = req.uploadedFile.url;
      messageData.mediaPublicId = req.uploadedFile.publicId;
      messageData.mediaMeta = {
        size: req.uploadedFile.size,
        mimeType: req.uploadedFile.mimeType,
        width: req.uploadedFile.width,
        height: req.uploadedFile.height
      };
    }

    // Create message
    let message = await Message.create(messageData);

    // Populate message
    message = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar')
      .populate('replyTo');

    // Update chat last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: Date.now()
    });

    res.status(201).json({
      success: true,
      data: { message }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get messages for a chat
 * @route   GET /api/messages/:chatId
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Verify chat membership
    const chat = await Chat.findOne({
      _id: chatId,
      members: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $nin: [req.user._id] }
    })
    .populate('sender', 'username displayName avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Message.countDocuments({ chat: chatId });

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          hasMore: skip + messages.length < total
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Delete a message
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res) => {
  try {
    const { deleteFor = 'me' } = req.query;

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (deleteFor === 'everyone' &&
        message.sender.toString() === req.user._id.toString()) {
      // Delete for everyone
      message.isDeleted = true;
      message.content = 'This message was deleted';
      message.mediaUrl = '';
      await message.save();
    } else {
      // Delete for me only
      await Message.findByIdAndUpdate(req.params.messageId, {
        $addToSet: { deletedFor: req.user._id }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Edit a message
 * @route   PUT /api/messages/:messageId
 * @access  Private
 */
const editMessage = async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findOne({
      _id: req.params.messageId,
      sender: req.user._id,
      type: 'text'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or cannot be edited'
      });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = Date.now();
    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar');

    res.status(200).json({
      success: true,
      data: { message: updatedMessage }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Add reaction to message
 * @route   POST /api/messages/:messageId/react
 * @access  Private
 */
const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove existing reaction from user
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.user._id.toString()
    );

    // Add new reaction
    if (emoji) {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    res.status(200).json({
      success: true,
      data: { reactions: message.reactions }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/:chatId/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: {
          readBy: { user: req.user._id, readAt: Date.now() }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
  editMessage,
  reactToMessage,
  markAsRead
};
