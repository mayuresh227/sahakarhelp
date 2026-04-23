const { body, param, query, validationResult } = require('express-validator');

/**
 * Generic validation middleware that returns errors if any.
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Return validation errors
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  };
};

/**
 * Sanitize and validate common input types.
 */
const sanitizeInput = (field) => [
  body(field).trim().escape(),
];

/**
 * Validate MongoDB ObjectId in params.
 */
const validateObjectId = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} ID format`),
];

/**
 * Validate pagination query parameters.
 */
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

/**
 * Validate email and password for auth routes.
 */
const validateAuth = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/**
 * Validate file upload fields (multer).
 */
const validateFileUpload = [
  body('name').optional().trim().escape(),
  // File validation is done via multer middleware; this is for metadata.
];

module.exports = {
  validate,
  sanitizeInput,
  validateObjectId,
  validatePagination,
  validateAuth,
  validateFileUpload,
};