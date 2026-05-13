/**
 * Dark Horse Messenger - Chat Routes
 */

const express = require('express');
const router = express.Router();
const {
  getOrCreateDirectChat,
  getUserChats,
  getChatById,
  muteChat,
  unmuteChat,
  archiveChat,
  deleteChat
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.get('/', getUserChats);
router.get('/:chatId', getChatById);
router.post('/direct/:userId', getOrCreateDirectChat);
router.post('/:chatId/mute', muteChat);
router.post('/:chatId/unmute', unmuteChat);
router.post('/:chatId/archive', archiveChat);
router.delete('/:chatId', deleteChat);

module.exports = router;
