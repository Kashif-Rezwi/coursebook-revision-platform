import Joi from 'joi';

/**
 * Validation schema for GET /pdfs query parameters
 */
export const getPDFsSchema = Joi.object({
  query: Joi.object({
    status: Joi.string().valid('uploading', 'processing', 'ready', 'failed'),
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'originalName', '-originalName').default('-createdAt')
  })
});

/**
 * Validation schema for PDF ID parameter (MongoDB ObjectId format)
 */
export const pdfIdSchema = Joi.object({
  params: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid PDF ID format'
    })
  })
});
