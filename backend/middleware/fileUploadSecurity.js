const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Allowed MIME types for safe file uploads
const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-rar-compressed': 'rar',
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure multer storage (memory storage for scanning)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const mime = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase().substring(1);

  // Check MIME type
  if (!ALLOWED_MIME_TYPES[mime]) {
    return cb(new Error(`File type ${mime} is not allowed.`), false);
  }

  // Optional: check extension matches MIME
  const expectedExt = ALLOWED_MIME_TYPES[mime];
  if (expectedExt && ext !== expectedExt) {
    return cb(new Error(`File extension .${ext} does not match MIME type ${mime}.`), false);
  }

  // Check file size (multer limits are set separately)
  if (file.size > MAX_FILE_SIZE) {
    return cb(new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`), false);
  }

  // Accept file
  cb(null, true);
};

// Create multer instance with limits and filter
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Middleware to validate uploaded files (single file)
 */
const validateSingleFile = (fieldName) => upload.single(fieldName);

/**
 * Middleware to validate multiple files
 */
const validateMultipleFiles = (fieldName, maxCount = 5) => upload.array(fieldName, maxCount);

/**
 * Middleware to validate file fields (mixed)
 */
const validateFileFields = (fields) => upload.fields(fields);

/**
 * Validate base64 file (for JSON‑based uploads)
 * @param {string} base64Data - base64 encoded file
 * @param {string} expectedMime - expected MIME type (optional)
 * @returns {Object} { isValid, error, size, mime }
 */
const validateBase64File = (base64Data, expectedMime = null) => {
  try {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const size = buffer.length;

    if (size > MAX_FILE_SIZE) {
      return { isValid: false, error: `File size ${size} exceeds limit.` };
    }

    // Simple MIME detection based on magic bytes (basic)
    let detectedMime = 'application/octet-stream';
    if (buffer.length >= 4) {
      const hex = buffer.slice(0, 4).toString('hex');
      if (hex === '89504e47') detectedMime = 'image/png';
      else if (hex.startsWith('ffd8')) detectedMime = 'image/jpeg';
      else if (hex === '25504446') detectedMime = 'application/pdf';
      else if (hex === '47494638') detectedMime = 'image/gif';
      else if (hex === '52494646') detectedMime = 'image/webp';
    }

    if (expectedMime && detectedMime !== expectedMime) {
      return { isValid: false, error: `File MIME type ${detectedMime} does not match expected ${expectedMime}.` };
    }

    if (!ALLOWED_MIME_TYPES[detectedMime]) {
      return { isValid: false, error: `File type ${detectedMime} is not allowed.` };
    }

    return {
      isValid: true,
      size,
      mime: detectedMime,
      extension: ALLOWED_MIME_TYPES[detectedMime] || 'bin',
    };
  } catch (err) {
    return { isValid: false, error: `Invalid base64 data: ${err.message}` };
  }
};

/**
 * Middleware to validate JSON‑based file uploads in request body
 * Scans for fields that contain base64 strings and validates them.
 */
const validateJsonFileUpload = (req, res, next) => {
  // Recursively scan object for base64 strings
  const scanObject = (obj, path = '') => {
    for (const key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === 'string' && value.startsWith('data:')) {
        const result = validateBase64File(value);
        if (!result.isValid) {
          return res.status(400).json({
            error: 'File validation failed',
            field: currentPath,
            details: result.error,
          });
        }
        // Optionally replace with buffer for downstream processing
        // obj[key] = Buffer.from(value.replace(/^data:[^;]+;base64,/, ''), 'base64');
      } else if (typeof value === 'object' && value !== null) {
        const error = scanObject(value, currentPath);
        if (error) return error;
      }
    }
    return null;
  };

  const error = scanObject(req.body);
  if (error) return error;
  next();
};

module.exports = {
  upload,
  validateSingleFile,
  validateMultipleFiles,
  validateFileFields,
  validateBase64File,
  validateJsonFileUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};