import { ApiError } from './apiError';
import { logger } from './logger';

/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 */

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

export class ErrorHandler {
  /**
   * Handle and log service errors with consistent structure
   */
  static handleServiceError(
    error: Error,
    operation: string
  ): ApiError {
    logger.error(`Service error in ${operation}`, error);
    
    if (error instanceof ApiError) {
      return error;
    }
    
    return ApiError.internal(`Service error in ${operation}`, 'SERVICE_ERROR');
  }

  /**
   * Handle and log validation errors with consistent structure
   */
  static handleValidationError(
    message: string,
    errorCode: string
  ): ApiError {
    logger.error(`Validation error: ${message}`);
    return ApiError.badRequest(message, errorCode);
  }

}
