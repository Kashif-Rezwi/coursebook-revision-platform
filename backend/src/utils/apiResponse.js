/**
 * Send a standardized success response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {object|null} [data=null]
 */
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {string} [errorCode='ERROR']
 * @param {object|null} [details=null]
 */
const errorResponse = (res, statusCode, message, errorCode = 'ERROR', details = null) => {
  const response = {
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details && { details })
    },
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};

module.exports = { successResponse, errorResponse };


