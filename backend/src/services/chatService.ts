import { Chat } from '../models';
import { IChat, ICitation } from '../models/Chat';
import { BaseService } from './BaseService';
import chatRepository from '../repositories/ChatRepository';
import CacheService from './CacheService';
import logger from '../utils/logger';
import { ChatFilters, ChatListResult } from '../types/chat';

/**
 * Chat Service for managing chat sessions and messages
 * Simplified using BaseService and repository pattern
 */
class ChatService extends BaseService<IChat> {
  constructor() {
    super(Chat, 'Chat');
  }

  /**
   * Create a new chat session
   */
  async createChat(userId: string, title: string = 'New Chat', pdfIds: string[] = []): Promise<IChat> {
    const chat = await this.model.create({
      userId,
      title,
      pdfIds,
      messages: []
    });

    logger.info(`Chat created: ${chat._id} by user ${userId}`);
    return chat;
  }

  /**
   * Get user's chat sessions with pagination
   */
  async getUserChats(userId: string, filters: ChatFilters = {}): Promise<ChatListResult> {
    return chatRepository.getUserChats(userId, filters);
  }

  /**
   * Get a single chat by ID with full message history
   */
  override async findById(chatId: string, userId: string): Promise<IChat> {
    // Check cache first
    const cacheKey = `chat:${chatId}:${userId}`;
    const cachedChat = CacheService.get<IChat>(cacheKey);
    if (cachedChat) {
      logger.debug(`Chat ${chatId} retrieved from cache`);
      return cachedChat;
    }

    const chat = await chatRepository.getChatWithMessages(chatId, userId);
    if (!chat) {
      throw this.createNotFoundError();
    }

    // Cache the result for 30 minutes
    CacheService.set(cacheKey, chat, 1800);
    logger.debug(`Chat ${chatId} cached`);

    return chat;
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(
    chatId: string, 
    userId: string, 
    role: 'user' | 'assistant' | 'system', 
    content: string, 
    citations: ICitation[] = []
  ): Promise<IChat> {
    const chat = await chatRepository.addMessage(chatId, userId, role, content, citations);
    if (!chat) {
      throw this.createNotFoundError();
    }

    // Invalidate cache for this chat
    const cacheKey = `chat:${chatId}:${userId}`;
    CacheService.delete(cacheKey);
    logger.debug(`Cache invalidated for chat ${chatId}`);

    logger.info(`Message added to chat ${chatId} by ${role}`);
    return chat;
  }

  /**
   * Update chat title
   */
  async updateTitle(chatId: string, userId: string, title: string): Promise<IChat> {
    const chat = await chatRepository.updateTitle(chatId, userId, title);
    if (!chat) {
      throw this.createNotFoundError();
    }

    logger.info(`Chat title updated: ${chatId}`);
    return chat;
  }

  /**
   * Create standardized not found error
   */
  private createNotFoundError() {
    const ApiError = require('../utils/apiError').default;
    return ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
  }
}

export default new ChatService();
