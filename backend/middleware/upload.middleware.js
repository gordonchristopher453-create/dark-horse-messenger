/**
 * Dark Horse Messenger - Upload Middleware
 */

const { uploadToCloudinary } = require('../config/cloudinary');
const upload = require('../config/multer');

/**
 * Process and upload file to Cloudinary
 */
const processUpload = async (req, res, next) => {
  try {
    if (!req.file) return next();

    // Convert buffer to base64
    const fileStr = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Determine folder based on file type
    let folder = 'dark-horse/misc';
    if (req.file.mimetype.startsWith('image/')) folder = 'dark-horse/images';
    else if (req.file.mimetype.startsWith('video/')) folder = 'dark-horse/videos';
    else if (req.file.mimetype.startsWith('audio/')) folder = 'dark-horse/audio';
    else folder = 'dark-horse/documents';

    // Upload to Cloudinary
    const result = await uploadToCloudinary(fileStr, folder);

    // Attach upload result to request
    req.uploadedFile = {
      url: result.url,
      publicId: result.publicId,
      size: result.size,
      format: result.format,
      width: result.width,
      height: result.height,
      mimeType: req.file.mimetype
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `File upload failed: ${error.message}`
    });
  }
};

module.exports = { upload, processUpload };
