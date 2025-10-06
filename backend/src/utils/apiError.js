class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {string} [errorCode='ERROR']
   * @param {boolean} [isOperational=true]
   * @param {string} [stack='']
   * @param {object} [details=null]
   */
  constructor(statusCode, message, errorCode = 'ERROR', isOperational = true, stack = '', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message, errorCode = 'BAD_REQUEST') {
    return new ApiError(400, message, errorCode);
  }

  static unauthorized(message, errorCode = 'UNAUTHORIZED') {
    return new ApiError(401, message, errorCode);
  }

  static forbidden(message, errorCode = 'FORBIDDEN') {
    return new ApiError(403, message, errorCode);
  }

  static notFound(message, errorCode = 'NOT_FOUND') {
    return new ApiError(404, message, errorCode);
  }

  static internal(message, errorCode = 'INTERNAL_ERROR') {
    return new ApiError(500, message, errorCode, false);
  }
}

module.exports = ApiError;


