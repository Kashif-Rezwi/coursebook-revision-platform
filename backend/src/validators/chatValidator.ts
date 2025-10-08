import Joi from 'joi';
import { 
  createRequestSchema, 
  createIdParamSchema, 
  createPaginationSchema, 
  objectIdSchema,
  titleSchema,
  messageSchema,
  objectIdArraySchema,
  sortBySchema
} from './common';

/**
 * Simplified chat validation schemas
 * Uses common validation utilities for consistency
 */

const createChatSchema = createRequestSchema({
  body: Joi.object({
    title: titleSchema.max(100).default('New Chat').messages({
      'string.max': 'Title cannot exceed 100 characters'
    }),
    pdfIds: objectIdArraySchema(1, 5).messages({
      'array.min': 'At least one PDF must be selected',
      'array.max': 'Maximum 5 PDFs allowed per chat'
    })
  })
});

const sendMessageSchema = createRequestSchema({
  body: Joi.object({
    message: messageSchema.max(5000).messages({
      'string.max': 'Message cannot exceed 5000 characters'
    }),
    streaming: Joi.boolean().default(false)
  }),
  params: Joi.object({
    chatId: objectIdSchema
  })
});

const getChatsSchema = createPaginationSchema(
  Joi.object({
    sortBy: sortBySchema(['createdAt', 'updatedAt'])
  })
);

const chatIdSchema = createIdParamSchema('chatId');

const updateChatTitleSchema = createRequestSchema({
  body: Joi.object({
    title: titleSchema.max(100).required().messages({
      'any.required': 'Title is required',
      'string.max': 'Title cannot exceed 100 characters'
    })
  }),
  params: Joi.object({
    chatId: objectIdSchema
  })
});

export {
  createChatSchema,
  sendMessageSchema,
  getChatsSchema,
  chatIdSchema,
  updateChatTitleSchema
};
