const logger = require('../utils/logger');
const { errorResponse } = require('../utils/apiResponse');
const config = require('../config/env');

/**
 * Global error handling middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let details = null;

  logger.error(`${message}`, {
    statusCode,
    errorCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid or expired token';
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'UPLOAD_FILE_TOO_LARGE';
      message = 'File too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorCode = 'UPLOAD_TOO_MANY_FILES';
      message = 'Too many files';
    } else {
      errorCode = 'UPLOAD_ERROR';
      message = 'File upload error';
    }
  }

  // Use details from ApiError if available
  if (err.details) {
    details = err.details;
  }

  if (config.env === 'production' && statusCode === 500) {
    message = 'Something went wrong';
    details = null;
  }

  return errorResponse(res, statusCode, message, errorCode, details);
};

module.exports = errorHandler;


