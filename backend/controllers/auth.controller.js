const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const register = async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    const user = await User.create({
      username, displayName, email, password,
      verificationToken: uuidv4(),
      lastLoginIP: req.ip
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info({ event: 'REGISTER', userId: user._id, ip: req.ip });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: user.toJSON(), accessToken, refreshToken }
    });
  } catch (error) {
    logger.error({ event: 'REGISTER_ERROR', error: error.message });
    return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn({ event: 'FAILED_LOGIN', email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Detect new device/IP login
    const isNewIP = user.lastLoginIP && user.lastLoginIP !== req.ip;

    user.refreshToken = refreshToken;
    user.isOnline = true;
    user.lastSeen = Date.now();
    user.lastLoginIP = req.ip;
    await user.save({ validateBeforeSave: false });

    logger.info({ event: 'LOGIN', userId: user._id, ip: req.ip, newIP: isNewIP });

    // Send login notification email for new IP
    if (isNewIP) {
      try {
        const { sendEmail } = require('../utils/email');
        await sendEmail({
          to: user.email,
          subject: 'New login detected - Dark Horse Messenger',
          html: `
            <div style="font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 30px; border-radius: 12px;">
              <h2 style="color: #7c3aed;">🐴 New Login Detected</h2>
              <p>Hi ${user.displayName},</p>
              <p>A new login was detected on your Dark Horse Messenger account.</p>
              <p><strong>IP Address:</strong> ${req.ip}</p>
              <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
              <p>If this wasn't you, please change your password immediately.</p>
            </div>
          `
        });
      } catch (emailError) {
        logger.error({ event: 'LOGIN_EMAIL_ERROR', error: emailError.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: user.toJSON(), accessToken, refreshToken }
    });
  } catch (error) {
    logger.error({ event: 'LOGIN_ERROR', error: error.message });
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
};

const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false, lastSeen: Date.now(), refreshToken: null
    });
    logger.info({ event: 'LOGOUT', userId: req.user._id });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, logout, refreshToken, getMe };
