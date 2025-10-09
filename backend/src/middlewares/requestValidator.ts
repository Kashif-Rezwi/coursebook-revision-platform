import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { RequestValidator, ValidationSchema, ValidationErrorDetail } from '../types';
import { validationOptions } from '../validators/common';

/**
 * Validate request body, query, and params against a Joi schema.
 * The schema should validate an object: { body, query, params }.
 * Uses standardized validation options for consistency.
 */
const validate: RequestValidator = (schema: Joi.ObjectSchema<ValidationSchema>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const dataToValidate = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    const { error, value } = schema.validate(dataToValidate, validationOptions);

    if (error) {
      const details: ValidationErrorDetail[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', true, '', details);
    }

    // Assign validated parts to request object
    if (value.body !== undefined) {
      req.body = value.body as any;
    }
    if (value.query !== undefined) {
      Object.assign(req.query, value.query);
    }
    if (value.params !== undefined) {
      req.params = value.params as any;
    }
    return next();
  };
};

export default validate;


