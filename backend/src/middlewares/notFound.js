const ApiError = require('../utils/apiError');

/**
 * 404 handler for undefined routes.
 */
const notFound = (req, res, next) => {
  const error = ApiError.notFound(`Route ${req.originalUrl} not found`, 'ROUTE_NOT_FOUND');
  next(error);
};

module.exports = notFound;


