const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'voice', 'system'],
    default: 'text'
  },
  content: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaPublicId: { type: String, default: '' },
  mediaMeta: {
    size: Number, duration: Number,
    width: Number, height: Number, mimeType: String
  },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [reactionSchema],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

// Text index for message search
messageSchema.index({ content: 'text' });
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', messageSchema);
