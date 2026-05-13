/**
 * Dark Horse Messenger - User Routes
 */

const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateProfile,
  updateSettings,
  blockUser,
  unblockUser,
  updateFcmToken
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, processUpload } = require('../middleware/upload.middleware');

// All routes are protected
router.use(protect);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/profile', upload.single('avatar'), processUpload, updateProfile);
router.put('/settings', updateSettings);
router.put('/fcm-token', updateFcmToken);
router.post('/block/:id', blockUser);
router.post('/unblock/:id', unblockUser);

module.exports = router;
