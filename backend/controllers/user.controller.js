const User = require('../models/user.model');

/**
 * @desc    Search users (only when search query provided)
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = async (req, res) => {
  try {
    const { search } = req.query;

    // Return empty if no search query
    if (!search || search.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { users: [] }
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      blockedUsers: { $nin: [req.user._id] },
      $or: [
        { username: { $regex: `^${search}`, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ]
    })
    .select('username displayName avatar bio isOnline lastSeen')
    .limit(20)
    .sort({ displayName: 1 });

    res.status(200).json({
      success: true,
      data: { users }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username displayName avatar bio isOnline lastSeen status');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { displayName, bio, status } = req.body;
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (status !== undefined) updateData.status = status;
    if (req.uploadedFile) updateData.avatar = req.uploadedFile.url;

    const user = await User.findByIdAndUpdate(
      req.user._id, updateData, { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, message: 'Profile updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { notifications, readReceipts, lastSeenVisible, theme } = req.body;
    const settings = {};
    if (notifications !== undefined) settings['settings.notifications'] = notifications;
    if (readReceipts !== undefined) settings['settings.readReceipts'] = readReceipts;
    if (lastSeenVisible !== undefined) settings['settings.lastSeenVisible'] = lastSeenVisible;
    if (theme !== undefined) settings['settings.theme'] = theme;
    const user = await User.findByIdAndUpdate(req.user._id, settings, { new: true });
    res.status(200).json({ success: true, message: 'Settings updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const blockUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: req.params.id }
    });
    res.status(200).json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id }
    });
    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update public key for E2E encryption
const updatePublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) return res.status(400).json({ success: false, message: 'Public key required' });
    await User.findByIdAndUpdate(req.user._id, { publicKey });
    res.json({ success: true, message: 'Public key updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers, getUserById, updateProfile,
  updateSettings, blockUser, unblockUser, updateFcmToken, updatePublicKey,
};
