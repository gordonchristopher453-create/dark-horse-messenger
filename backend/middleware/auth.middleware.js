const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    // IP change detection - flag suspicious activity
    const currentIP = req.ip
    if (user.lastLoginIP && user.lastLoginIP !== currentIP) {
      logger.warn({
        event: 'IP_CHANGE_DETECTED',
        userId: user._id,
        oldIP: user.lastLoginIP,
        newIP: currentIP
      });
      // Update IP but don't block - just log for now
      await User.findByIdAndUpdate(user._id, { lastLoginIP: currentIP });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
};

module.exports = { protect };
