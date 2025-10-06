import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { RequestValidator, ValidationSchema, ValidationErrorDetail } from '../types';

/**
 * Validate request body, query, and params against a Joi schema.
 * The schema should validate an object: { body, query, params }.
 */
const validate: RequestValidator = (schema: Joi.ObjectSchema<ValidationSchema>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    };

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

    Object.assign(req, value);
    return next();
  };
};

export default validate;


