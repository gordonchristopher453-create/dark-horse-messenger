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
