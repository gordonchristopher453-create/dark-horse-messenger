const { body, validationResult } = require('express-validator');

const handleValidationErrors = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  return next();
};

const validateRegister = [
  body('username').trim().notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Only letters, numbers and underscores allowed'),
  body('displayName').trim().notEmpty().withMessage('Display name is required'),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateMessage = [
  body('content').optional().notEmpty().withMessage('Message cannot be empty'),
  handleValidationErrors
];

const validateGroup = [
  body('groupName').trim().notEmpty().withMessage('Group name is required'),
  body('members').isArray({ min: 1 }).withMessage('At least one member is required'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateMessage,
  validateGroup,
  handleValidationErrors
};
