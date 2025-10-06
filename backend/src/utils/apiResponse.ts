import { Response } from 'express';
import { SuccessResponse, ErrorResponse, ValidationErrorDetail } from '../types';

/**
 * Send a standardized success response.
 */
export const successResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
): Response<SuccessResponse> => {
  const response: SuccessResponse = {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized error response.
 */
export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode: string = 'ERROR',
  details?: ValidationErrorDetail[]
): Response<ErrorResponse> => {
  const response: ErrorResponse = {
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

export default { successResponse, errorResponse };


