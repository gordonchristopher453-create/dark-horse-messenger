const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { fieldEncryption } = require('mongoose-field-encryption');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, lowercase: true, minlength: 3, maxlength: 20
  },
  displayName: { type: String, required: true, trim: true, maxlength: 50 },
  email: {
    type: String, required: true, unique: true,
    trim: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: { type: String, required: true, minlength: 6, select: false },
  avatar: { type: String, default: '' },
  bio: { type: String, maxlength: 150, default: '' },
  status: { type: String, default: 'Hey there! I am using Dark Horse Messenger' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  refreshToken: String,
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  fcmToken: { type: String, default: '' },
  lastLoginIP: { type: String, default: '' },
  settings: {
    notifications: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true },
    lastSeenVisible: { type: Boolean, default: true },
    theme: { type: String, default: 'dark' }
  }
}, { timestamps: true });

// Field encryption for sensitive data
userSchema.plugin(fieldEncryption, {
  fields: ['fcmToken'],
  secret: process.env.DB_ENCRYPTION_SECRET || 'darkhorse_db_encryption_secret_32c',
  saltGenerator: (secret) => secret.slice(0, 16)
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.resetPasswordToken;
  delete user.refreshToken;
  delete user.fcmToken;
  delete user.lastLoginIP;
  return user;
};

module.exports = mongoose.model('User', userSchema);
