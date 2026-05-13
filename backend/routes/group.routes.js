/**
 * Dark Horse Messenger - Group Routes
 */

const express = require('express');
const router = express.Router();
const {
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  makeAdmin
} = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload, processUpload } = require('../middleware/upload.middleware');
const { validateGroup } = require('../middleware/validation.middleware');

// All routes are protected
router.use(protect);

router.post('/', upload.single('groupImage'), processUpload, validateGroup, createGroup);
router.put('/:groupId', upload.single('groupImage'), processUpload, updateGroup);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:userId', removeMember);
router.post('/:groupId/leave', leaveGroup);
router.post('/:groupId/admin/:userId', makeAdmin);

module.exports = router;
