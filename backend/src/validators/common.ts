import Joi from 'joi';

/**
 * Common validation schemas and utilities
 * Centralized validation patterns to reduce duplication and ensure consistency
 */

// ============================================================================
// COMMON FIELD SCHEMAS
// ============================================================================

/**
 * MongoDB ObjectId validation pattern
 */
export const objectIdSchema = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required'
  });

/**
 * Optional MongoDB ObjectId validation pattern
 */
export const optionalObjectIdSchema = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .optional()
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

/**
 * Email validation with consistent error messages
 */
export const emailSchema = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

/**
 * Password validation with consistent error messages
 */
export const passwordSchema = Joi.string()
  .min(8)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
  });

/**
 * Name validation with consistent error messages
 */
export const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.min': 'Name cannot be empty',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  });

/**
 * Title validation with consistent error messages
 */
export const titleSchema = Joi.string()
  .trim()
  .min(1)
  .max(200)
  .messages({
    'string.min': 'Title cannot be empty',
    'string.max': 'Title cannot exceed 200 characters'
  });

/**
 * Message content validation
 */
export const messageSchema = Joi.string()
  .trim()
  .min(1)
  .max(5000)
  .required()
  .messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message cannot exceed 5000 characters',
    'any.required': 'Message is required'
  });

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Standard pagination query parameters
 */
export const paginationQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  skip: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Skip must be at least 0'
    })
});

/**
 * Standard sort options for common fields
 */
export const sortBySchema = (validFields: string[]) => Joi.string()
  .valid(...validFields, ...validFields.map(field => `-${field}`))
  .default('-createdAt')
  .messages({
    'any.only': `Sort field must be one of: ${validFields.join(', ')}`
  });

// ============================================================================
// COMMON SCHEMA BUILDERS
// ============================================================================

/**
 * Create a standard request schema with body, query, and params
 */
export const createRequestSchema = (config: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return Joi.object({
    body: config.body || Joi.object({}).optional(),
    query: config.query || Joi.object({}).optional(),
    params: config.params || Joi.object({}).optional()
  });
};

/**
 * Create a schema for ID parameter validation
 */
export const createIdParamSchema = (paramName: string = 'id') => {
  return createRequestSchema({
    params: Joi.object({
      [paramName]: objectIdSchema
    })
  });
};

/**
 * Create a schema for pagination with optional filters
 */
export const createPaginationSchema = (filters: Joi.ObjectSchema = Joi.object({})) => {
  return createRequestSchema({
    query: paginationQuerySchema.concat(filters)
  });
};

// ============================================================================
// COMMON VALIDATION OPTIONS
// ============================================================================

/**
 * Standard Joi validation options
 */
export const validationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: true
};

// ============================================================================
// ENUM VALIDATIONS
// ============================================================================

/**
 * User roles
 */
export const userRoleSchema = Joi.string()
  .valid('student', 'admin')
  .default('student')
  .messages({
    'any.only': 'Role must be either student or admin'
  });

/**
 * PDF status values
 */
export const pdfStatusSchema = Joi.string()
  .valid('uploading', 'processing', 'ready', 'failed')
  .messages({
    'any.only': 'Status must be one of: uploading, processing, ready, failed'
  });

/**
 * Quiz status values
 */
export const quizStatusSchema = Joi.string()
  .valid('generating', 'ready', 'failed')
  .messages({
    'any.only': 'Status must be one of: generating, ready, failed'
  });

/**
 * Quiz difficulty levels
 */
export const difficultySchema = Joi.string()
  .valid('easy', 'medium', 'hard')
  .default('medium')
  .messages({
    'any.only': 'Difficulty must be one of: easy, medium, hard'
  });

/**
 * Question types
 */
export const questionTypeSchema = Joi.string()
  .valid('MCQ', 'SAQ', 'LAQ')
  .messages({
    'any.only': 'Question type must be one of: MCQ, SAQ, LAQ'
  });

// ============================================================================
// ARRAY VALIDATIONS
// ============================================================================

/**
 * Array of ObjectIds validation
 */
export const objectIdArraySchema = (minItems: number = 1, maxItems: number = 10) => 
  Joi.array()
    .items(objectIdSchema)
    .min(minItems)
    .max(maxItems)
    .messages({
      'array.min': `At least ${minItems} item(s) required`,
      'array.max': `Maximum ${maxItems} items allowed`
    });

/**
 * Array of strings validation
 */
export const stringArraySchema = (minItems: number = 1, maxItems: number = 50) =>
  Joi.array()
    .items(Joi.string().required())
    .min(minItems)
    .max(maxItems)
    .messages({
      'array.min': `At least ${minItems} item(s) required`,
      'array.max': `Maximum ${maxItems} items allowed`
    });

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a schema that validates an object with common fields
 */
export const createEntitySchema = (fields: Record<string, Joi.Schema>) => {
  return Joi.object(fields);
};

/**
 * Create a schema for updating an entity (all fields optional)
 */
export const createUpdateSchema = (fields: Record<string, Joi.Schema>) => {
  const updateFields: Record<string, Joi.Schema> = {};
  Object.keys(fields).forEach(key => {
    const field = fields[key];
    if (field) {
      updateFields[key] = field.optional();
    }
  });
  return Joi.object(updateFields);
};

/**
 * Validate and transform common request data
 */
export const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  return schema.validate(data, validationOptions);
};
