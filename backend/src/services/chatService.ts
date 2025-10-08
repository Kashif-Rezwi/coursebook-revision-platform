import { Chat } from '../models';
import { IChat, ICitation } from '../models/Chat';
import CacheService from './CacheService';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { ChatFilters, ChatListResult } from '../types/chat';

/**
 * Chat Service for managing chat sessions and messages
 * Simplified to work directly with models
 */
class ChatService {

  /**
   * Create a new chat session
   */
  async createChat(userId: string, title: string = 'New Chat', pdfIds: string[] = []): Promise<IChat> {
    const chat = await Chat.create({
      userId,
      title,
      pdfIds,
      messages: []
    });

    logger.info('Service: createChat - Chat created', { userId, chatId: chat._id });
    return chat;
  }

  /**
   * Get user's chat sessions with pagination
   */
  async getUserChats(userId: string, filters: ChatFilters = {}): Promise<ChatListResult> {
    const { limit = 50, skip = 0, sortBy = '-updatedAt', ...otherFilters } = filters;

    // Optimized field selection for list view
    const selectFields = 'title pdfIds createdAt updatedAt';
    
    const [chats, total] = await Promise.all([
      Chat.find({ userId, ...otherFilters })
        .select(selectFields)
        .sort(sortBy)
        .limit(limit)
        .skip(skip)
        .populate('pdfIds', 'originalName pageCount status')
        .lean(), // Use lean() for better performance
      Chat.countDocuments({ userId, ...otherFilters })
    ]);

    return {
      chats,
      total,
      limit,
      skip
    };
  }

  /**
   * Get a single chat by ID with full message history
   */
  async findById(chatId: string, userId: string): Promise<IChat> {
    // Check cache first
    const cacheKey = `chat:${chatId}:${userId}`;
    const cachedChat = CacheService.get<IChat>(cacheKey);
    if (cachedChat) {
      logger.info('Cache: hit', { cacheKey, userId, chatId });
      return cachedChat;
    }

    try {
      const chat = await Chat.findOne({ _id: chatId, userId })
        .populate('pdfIds', 'originalName pageCount status metadata');

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      // Cache the result for 30 minutes
      CacheService.set(cacheKey, chat, 1800);
      logger.info('Cache: set', { cacheKey, userId, chatId });

      return chat;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_ID');
      }
      throw error;
    }
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
    try {
      const chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      // Add message directly to the chat document
      chat.messages.push({
        role,
        content,
        citations,
        timestamp: new Date()
      });

      // Save the updated chat
      await chat.save();

      // Invalidate cache for this chat
      const cacheKey = `chat:${chatId}:${userId}`;
      CacheService.delete(cacheKey);
      logger.info('Cache: delete', { cacheKey, userId, chatId });

      logger.info('Service: addMessage - Message added to chat', { userId, chatId, role });
      return chat;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_ID');
      }
      logger.error('Service error in addMessage', error);
      throw ApiError.internal('Failed to add message', 'MESSAGE_ADD_ERROR');
    }
  }

  /**
   * Update chat title
   */
  async updateTitle(chatId: string, userId: string, title: string): Promise<IChat> {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        { $set: { title } },
        { new: true, runValidators: true }
      );

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info('Service: updateTitle - Chat title updated', { userId, chatId });
      return chat;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Delete chat session
   */
  async remove(chatId: string, userId: string): Promise<{message: string, id: string}> {
    try {
      const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info('Service: deleteChat - Chat deleted', { userId, chatId });
      return { message: 'Chat deleted successfully', id: chatId };
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_ID');
      }
      throw error;
    }
  }
}

export default new ChatService();
