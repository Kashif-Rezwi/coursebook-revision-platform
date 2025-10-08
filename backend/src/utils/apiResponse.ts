import { Response } from 'express';
import { SuccessResponse } from '../types';

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
 * Helper function for common success responses
 */
export const respond = (res: Response, data: any, message: string, statusCode: number = 200) => 
  successResponse(res, statusCode, message, data);

/**
 * Helper for created responses
 */
export const respondCreated = (res: Response, data: any, message: string) => 
  successResponse(res, 201, message, data);

/**
 * Helper for simple data responses
 */
export const respondData = (res: Response, data: any, message: string) => 
  successResponse(res, 200, message, data);

export default { successResponse, respond, respondCreated, respondData };


