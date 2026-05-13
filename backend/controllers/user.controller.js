/**
 * Dark Horse Messenger - User Controller
 */

const User = require('../models/user.model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * @desc    Get all users (for search)
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {
      _id: { $ne: req.user._id },
      blockedUsers: { $nin: [req.user._id] }
    };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username displayName avatar bio isOnline lastSeen')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ isOnline: -1, displayName: 1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
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
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username displayName avatar bio isOnline lastSeen status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { displayName, bio, status } = req.body;
    const updateData = {};

    if (displayName) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (status !== undefined) updateData.status = status;

    // Handle avatar upload
    if (req.uploadedFile) {
      // Delete old avatar if exists
      const currentUser = await User.findById(req.user._id);
      if (currentUser.avatar) {
        // Extract public ID from URL if needed
      }
      updateData.avatar = req.uploadedFile.url;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update user settings
 * @route   PUT /api/users/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const { notifications, readReceipts, lastSeenVisible, theme } = req.body;
    const settings = {};

    if (notifications !== undefined) settings['settings.notifications'] = notifications;
    if (readReceipts !== undefined) settings['settings.readReceipts'] = readReceipts;
    if (lastSeenVisible !== undefined) settings['settings.lastSeenVisible'] = lastSeenVisible;
    if (theme !== undefined) settings['settings.theme'] = theme;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      settings,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Block a user
 * @route   POST /api/users/block/:id
 * @access  Private
 */
const blockUser = async (req, res) => {
  try {
    const userToBlock = req.params.id;

    if (userToBlock === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userToBlock }
    });

    res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Unblock a user
 * @route   POST /api/users/unblock/:id
 * @access  Private
 */
const unblockUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: req.params.id }
    });

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update FCM token for push notifications
 * @route   PUT /api/users/fcm-token
 * @access  Private
 */
const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    await User.findByIdAndUpdate(req.user._id, { fcmToken });

    res.status(200).json({
      success: true,
      message: 'FCM token updated'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateProfile,
  updateSettings,
  blockUser,
  unblockUser,
  updateFcmToken
};
