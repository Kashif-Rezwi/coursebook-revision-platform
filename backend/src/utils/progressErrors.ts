import ApiError from './apiError';

// Specific error types for progress tracking
export class ProgressNotFoundError extends ApiError {
  constructor(userId: string) {
    super(404, `Progress data not found for user ${userId}`, 'PROGRESS_NOT_FOUND');
  }
}

export class ProgressCalculationError extends ApiError {
  constructor(operation: string, details?: string) {
    const message = `Failed to calculate progress metrics for ${operation}${details ? `: ${details}` : ''}`;
    super(500, message, 'PROGRESS_CALCULATION_ERROR');
  }
}

export class ProgressCacheError extends ApiError {
  constructor(operation: string, details?: string) {
    const message = `Cache operation failed for ${operation}${details ? `: ${details}` : ''}`;
    super(500, message, 'PROGRESS_CACHE_ERROR');
  }
}

export class ProgressValidationError extends ApiError {
  constructor(field: string, value: any, reason: string) {
    const message = `Invalid ${field}: ${value}. ${reason}`;
    super(400, message, 'PROGRESS_VALIDATION_ERROR');
  }
}

export class ProgressDataCorruptionError extends ApiError {
  constructor(userId: string, field: string) {
    const message = `Progress data corruption detected for user ${userId} in field: ${field}`;
    super(500, message, 'PROGRESS_DATA_CORRUPTION');
  }
}

// Error handling utilities
export const handleProgressError = (error: any, context: string, userId?: string): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  // Handle specific database errors
  if (error.name === 'CastError') {
    throw new ProgressValidationError('ID', error.value || 'unknown', 'Invalid ID format');
  }

  if (error.name === 'ValidationError') {
    const errors = error.errors || {};
    const field = Object.keys(errors)[0];
    const reason = field ? errors[field]?.message || 'Validation failed' : 'Validation failed';
    throw new ProgressValidationError(field || 'field', error.value || 'unknown', reason);
  }

  if (error.name === 'MongoError' && error.code === 11000) {
    throw new ProgressValidationError('userId', userId, 'User progress already exists');
  }

  // Handle network/timeout errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    throw ApiError.internal('Database connection failed', 'DATABASE_CONNECTION_ERROR');
  }

  // Generic error fallback
  throw ApiError.internal(`Unexpected error in ${context}`, 'UNEXPECTED_ERROR');
};

// Validation utilities
export const validateUserId = (userId: string): void => {
  if (!userId || typeof userId !== 'string') {
    throw new ProgressValidationError('userId', userId, 'User ID is required and must be a string');
  }
  
  if (userId.length < 10) {
    throw new ProgressValidationError('userId', userId, 'User ID must be at least 10 characters');
  }
};

export const validateDateRange = (fromDate?: string, toDate?: string): void => {
  if (fromDate && isNaN(Date.parse(fromDate))) {
    throw new ProgressValidationError('fromDate', fromDate, 'Invalid date format');
  }
  
  if (toDate && isNaN(Date.parse(toDate))) {
    throw new ProgressValidationError('toDate', toDate, 'Invalid date format');
  }
  
  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    throw new ProgressValidationError('dateRange', `${fromDate} to ${toDate}`, 'fromDate must be before toDate');
  }
};

export const validateScoreRange = (minScore?: number, maxScore?: number): void => {
  if (minScore !== undefined && (minScore < 0 || minScore > 100)) {
    throw new ProgressValidationError('minScore', minScore, 'Score must be between 0 and 100');
  }
  
  if (maxScore !== undefined && (maxScore < 0 || maxScore > 100)) {
    throw new ProgressValidationError('maxScore', maxScore, 'Score must be between 0 and 100');
  }
  
  if (minScore !== undefined && maxScore !== undefined && minScore > maxScore) {
    throw new ProgressValidationError('scoreRange', `${minScore} to ${maxScore}`, 'minScore must be less than or equal to maxScore');
  }
};

export const validatePagination = (limit?: number, skip?: number): void => {
  if (limit !== undefined && (limit < 1 || limit > 100)) {
    throw new ProgressValidationError('limit', limit, 'Limit must be between 1 and 100');
  }
  
  if (skip !== undefined && skip < 0) {
    throw new ProgressValidationError('skip', skip, 'Skip must be 0 or greater');
  }
};
