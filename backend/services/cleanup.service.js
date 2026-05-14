/**
 * Dark Horse Messenger - Cleanup Service
 * Runs periodic cleanup jobs
 */
const Message = require('../models/message.model')
const logger = require('../utils/logger')

const cleanupExpiredMessages = async () => {
  try {
    const result = await Message.deleteMany({
      expiresAt: { $lt: new Date(), $ne: null }
    })
    if (result.deletedCount > 0) {
      logger.info({ event: 'CLEANUP', deletedMessages: result.deletedCount })
    }
  } catch (error) {
    logger.error({ event: 'CLEANUP_ERROR', error: error.message })
  }
}

const startCleanupJobs = () => {
  // Run every hour
  setInterval(cleanupExpiredMessages, 60 * 60 * 1000)
  // Run once on startup
  cleanupExpiredMessages()
  console.log('✅ Cleanup jobs started')
}

module.exports = { startCleanupJobs, cleanupExpiredMessages }
