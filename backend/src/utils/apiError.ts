import { ApiErrorInterface, ValidationErrorDetail } from '../types';

export class ApiError extends Error implements ApiErrorInterface {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: ValidationErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    message: string,
    errorCode: string = 'ERROR',
    isOperational: boolean = true,
    stack: string = '',
    details?: ValidationErrorDetail[] | undefined
  ) {
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

  static badRequest(message: string, errorCode: string = 'BAD_REQUEST'): ApiError {
    return new ApiError(400, message, errorCode);
  }

  static unauthorized(message: string, errorCode: string = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, errorCode);
  }

  static forbidden(message: string, errorCode: string = 'FORBIDDEN'): ApiError {
    return new ApiError(403, message, errorCode);
  }

  static notFound(message: string, errorCode: string = 'NOT_FOUND'): ApiError {
    return new ApiError(404, message, errorCode);
  }

  static internal(message: string, errorCode: string = 'INTERNAL_ERROR'): ApiError {
    return new ApiError(500, message, errorCode, false);
  }
}

export default ApiError;


