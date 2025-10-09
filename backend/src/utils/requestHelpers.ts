import { Request } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Extract common query parameters with type conversion
 */
export const extractQueryParams = (req: Request) => {
  const params: Record<string, any> = {};
  Object.entries(req.query).forEach(([key, value]) => {
    if (value !== undefined) {
      // Convert numeric strings to numbers, keep others as strings
      const numValue = Number(value);
      params[key] = isNaN(numValue) ? value : numValue;
    }
  });
  return params;
};

/**
 * Extract user ID from authenticated request
 */
export const getUserId = (req: AuthenticatedRequest): string => req.user!.userId;

/**
 * Extract parameter by name with type conversion
 */
export const getParam = (req: Request, name: string): string => req.params[name] as string;

/**
 * Extract query parameter by name with type conversion
 */
export const getQuery = (req: Request, name: string): string | undefined => 
  req.query[name] as string | undefined;

/**
 * Extract query parameter as number
 */
export const getQueryNumber = (req: Request, name: string, defaultValue?: number): number | undefined => {
  const value = req.query[name] as string;
  return value ? parseInt(value) : defaultValue;
};

/**
 * Create filter object from query parameters
 */
export const createFilters = (req: Request) => {
  const params = extractQueryParams(req);
  const filters: any = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      filters[key] = value;
    }
  });
  
  return filters;
};
