/**
 * Dark Horse Messenger - Message Routes
 */

const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  deleteMessage,
  editMessage,
  reactToMessage,
  markAsRead
} = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, processUpload } = require('../middleware/upload.middleware');
const { validateMessage } = require('../middleware/validation.middleware');

// All routes are protected
router.use(protect);

router.get('/:chatId', getMessages);
router.post('/:chatId', upload.single('media'), processUpload, validateMessage, sendMessage);
router.put('/:chatId/read', markAsRead);
router.put('/:messageId', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/react', reactToMessage);

module.exports = router;

// Search messages
router.get('/search/:chatId', protect, async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.status(400).json({ success: false, message: 'Search query required' })

    const messages = await require('../models/message.model').find({
      chat: req.params.chatId,
      $text: { $search: q },
      isDeleted: false,
      deletedFor: { $nin: [req.user._id] }
    })
    .populate('sender', 'username displayName avatar')
    .limit(20)
    .sort({ createdAt: -1 })

    res.status(200).json({ success: true, data: { messages } })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})
