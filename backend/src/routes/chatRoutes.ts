import express from 'express';
import chatController from '../controllers/chatController';
import authenticate from '../middlewares/authenticate';
import validate from '../middlewares/requestValidator';
import { standardLimiter } from '../middlewares/rateLimiter';
import {
  createChatSchema,
  sendMessageSchema,
  getChatsSchema,
  chatIdSchema,
  updateChatTitleSchema
} from '../validators/chatValidator';

const router = express.Router();

// All chat routes require authentication
router.use(authenticate);

// Chat management routes
router.post('/chats', standardLimiter, validate(createChatSchema), chatController.createChat);
router.get('/chats', validate(getChatsSchema), chatController.getUserChats);
router.get('/chats/:chatId', validate(chatIdSchema), chatController.getChat);
router.delete('/chats/:chatId', standardLimiter, validate(chatIdSchema), chatController.deleteChat);
router.put('/chats/:chatId/title', standardLimiter, validate(updateChatTitleSchema), chatController.updateChatTitle);

// Messaging routes
router.post('/chats/:chatId/messages', standardLimiter, validate(sendMessageSchema), chatController.sendMessage);

export default router;
