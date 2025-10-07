import Joi from 'joi';
import { MAX_PDFS_PER_CHAT, MIN_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH } from '../types/chat';

/**
 * Joi validation schema for creating a new chat
 */
const createChatSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().min(1).max(100).default('New Chat').messages({
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 100 characters'
    }),
    pdfIds: Joi.array().items(
      Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
        'string.pattern.base': 'Invalid PDF ID format'
      })
    ).min(1).max(MAX_PDFS_PER_CHAT).messages({
      'array.min': 'At least one PDF must be selected',
      'array.max': `Maximum ${MAX_PDFS_PER_CHAT} PDFs allowed per chat`
    })
  }),
  query: Joi.object({}).optional(),
  params: Joi.object({}).optional()
});

/**
 * Joi validation schema for sending a message
 */
const sendMessageSchema = Joi.object({
  body: Joi.object({
    message: Joi.string().trim().required().min(MIN_MESSAGE_LENGTH).max(MAX_MESSAGE_LENGTH).messages({
      'any.required': 'Message is required',
      'string.empty': 'Message cannot be empty',
      'string.min': `Message must be at least ${MIN_MESSAGE_LENGTH} characters`,
      'string.max': `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`
    }),
    streaming: Joi.boolean().default(false)
  }),
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid chat ID format'
    })
  }),
  query: Joi.object({}).optional()
});

/**
 * Joi validation schema for getting user chats with pagination
 */
const getChatsSchema = Joi.object({
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    skip: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt').default('-updatedAt')
  }),
  body: Joi.object({}).optional(),
  params: Joi.object({}).optional()
});

/**
 * Joi validation schema for chat ID parameter validation
 */
const chatIdSchema = Joi.object({
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid chat ID format'
    })
  }),
  body: Joi.object({}).optional(),
  query: Joi.object({}).optional()
});

/**
 * Joi validation schema for updating chat title
 */
const updateChatTitleSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim().required().min(1).max(100).messages({
      'any.required': 'Title is required',
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title cannot be empty',
      'string.max': 'Title cannot exceed 100 characters'
    })
  }),
  params: Joi.object({
    chatId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid chat ID format'
    })
  }),
  query: Joi.object({}).optional()
});

export {
  createChatSchema,
  sendMessageSchema,
  getChatsSchema,
  chatIdSchema,
  updateChatTitleSchema
};
