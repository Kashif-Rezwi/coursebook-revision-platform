import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { errorResponse } from '../utils/apiResponse';
import config from '../config/env';
import { ErrorHandler, ValidationErrorDetail, MulterError } from '../types';

/**
 * Global error handling middleware.
 */
const errorHandler: ErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  let statusCode: number = err.statusCode || 500;
  let message: string = err.message || 'Internal Server Error';
  let errorCode: string = err.errorCode || 'INTERNAL_ERROR';
  let details: ValidationErrorDetail[] | undefined = undefined;

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
    details = Object.values(err.errors || {}).map((e: any) => ({
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
    const multerError = err as MulterError;
    statusCode = 400;
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'UPLOAD_FILE_TOO_LARGE';
      message = 'File too large';
    } else if (multerError.code === 'LIMIT_FILE_COUNT') {
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
    details = undefined;
  }

  return errorResponse(res, statusCode, message, errorCode, details);
};

export default errorHandler;


