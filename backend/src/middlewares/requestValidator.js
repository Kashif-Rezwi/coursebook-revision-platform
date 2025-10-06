const Joi = require('joi');
const ApiError = require('../utils/apiError');

/**
 * Validate request body, query, and params against a Joi schema.
 * The schema should validate an object: { body, query, params }.
 * @param {Joi.ObjectSchema} schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
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
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', true, '', details);
    }

    Object.assign(req, value);
    return next();
  };
};

module.exports = validate;


