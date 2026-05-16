/**
 * Dark Horse Messenger - Group Controller
 */

const Chat = require('../models/chat.model');
const Message = require('../models/message.model');

/**
 * @desc    Create a group chat
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = async (req, res) => {
  try {
    const { groupName, groupDescription, members } = req.body;
    const currentUserId = req.user._id;

    // Add creator to members if not included
    const allMembers = [...new Set([...members, currentUserId.toString()])];

    const groupData = {
      isGroup: true,
      groupName,
      groupDescription: groupDescription || '',
      members: allMembers,
      admins: [currentUserId],
      createdBy: currentUserId
    };

    // Handle group image
    if (req.uploadedFile) {
      groupData.groupImage = req.uploadedFile.url;
    }

    const group = await Chat.create(groupData);

    // Create system message
    await Message.create({
      sender: currentUserId,
      chat: group._id,
      type: 'system',
      content: `${req.user.displayName} created this group`
    });

    const populatedGroup = await Chat.findById(group._id)
      .populate('members', 'username displayName avatar isOnline')
      .populate('admins', 'username displayName avatar')
      .populate('createdBy', 'username displayName avatar');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: populatedGroup }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update group info
 * @route   PUT /api/groups/:groupId
 * @access  Private (Admin only)
 */
const updateGroup = async (req, res) => {
  try {
    const { groupName, groupDescription } = req.body;
    const group = await Chat.findById(req.params.groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is admin
    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group info'
      });
    }

    const updateData = {};
    if (groupName) updateData.groupName = groupName;
    if (groupDescription !== undefined) updateData.groupDescription = groupDescription;
    if (req.uploadedFile) updateData.groupImage = req.uploadedFile.url;

    const updatedGroup = await Chat.findByIdAndUpdate(
      req.params.groupId,
      updateData,
      { new: true }
    ).populate('members', 'username displayName avatar isOnline')
     .populate('admins', 'username displayName avatar');

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: { group: updatedGroup }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Add member to group
 * @route   POST /api/groups/:groupId/members
 * @access  Private (Admin only)
 */
const addMembers = async (req, res) => {
  try {
    const { members } = req.body;
    const group = await Chat.findById(req.params.groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    await Chat.findByIdAndUpdate(req.params.groupId, {
      $addToSet: { members: { $each: members } }
    });

    // System message
    await Message.create({
      sender: req.user._id,
      chat: group._id,
      type: 'system',
      content: `${req.user.displayName} added new members`
    });

    res.status(200).json({
      success: true,
      message: 'Members added successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove member from group
 * @route   DELETE /api/groups/:groupId/members/:userId
 * @access  Private (Admin only)
 */
const removeMember = async (req, res) => {
  try {
    const group = await Chat.findById(req.params.groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    await Chat.findByIdAndUpdate(req.params.groupId, {
      $pull: { members: req.params.userId, admins: req.params.userId }
    });

    await Message.create({
      sender: req.user._id,
      chat: group._id,
      type: 'system',
      content: `A member was removed from the group`
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Leave group
 * @route   POST /api/groups/:groupId/leave
 * @access  Private
 */
const leaveGroup = async (req, res) => {
  try {
    const group = await Chat.findById(req.params.groupId);

    if (!group || !group.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    await Chat.findByIdAndUpdate(req.params.groupId, {
      $pull: { members: req.user._id, admins: req.user._id }
    });

    await Message.create({
      sender: req.user._id,
      chat: group._id,
      type: 'system',
      content: `${req.user.displayName} left the group`
    });

    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Make member admin
 * @route   POST /api/groups/:groupId/admin/:userId
 * @access  Private (Admin only)
 */
const makeAdmin = async (req, res) => {
  try {
    const group = await Chat.findById(req.params.groupId);

    if (!group.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can promote members' });
    }

    await Chat.findByIdAndUpdate(req.params.groupId, {
      $addToSet: { admins: req.params.userId }
    });

    res.status(200).json({
      success: true,
      message: 'Member promoted to admin'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createGroup,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  makeAdmin
};

exports.generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Chat.findOne({ _id: groupId, isGroup: true, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    const inviteCode = require('crypto').randomBytes(8).toString('hex');
    group.inviteCode = inviteCode;
    await group.save();
    res.json({ success: true, data: { inviteCode, inviteLink: process.env.FRONTEND_URL + '/join/' + inviteCode } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.joinViaInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const group = await Chat.findOne({ inviteCode, isGroup: true });
    if (!group) return res.status(404).json({ success: false, message: 'Invalid or expired invite link' });
    if (group.members.includes(req.user._id)) {
      const populated = await Chat.findById(group._id).populate('members', 'username displayName avatar isOnline publicKey').populate('lastMessage');
      return res.json({ success: true, message: 'Already a member', data: { group: populated } });
    }
    group.members.push(req.user._id);
    await group.save();
    const populated = await Chat.findById(group._id).populate('members', 'username displayName avatar isOnline publicKey').populate('lastMessage');
    res.json({ success: true, message: 'Joined group!', data: { group: populated } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
