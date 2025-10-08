import { Response } from 'express';
import { SuccessResponse, ErrorResponse } from '../types';

/**
 * Send a standardized success response.
 */
export const success = (
  res: Response,
  data: any,
  message: string,
  statusCode: number = 200
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
export const error = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode: string,
  details?: any
): Response<ErrorResponse> => {
  const response: ErrorResponse = {
    success: false,
    message,
    errorCode,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(response);
};



