import { Chat } from '../models';
import { IChat, ICitation } from '../models/Chat';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';
import { ChatFilters, ChatListResult } from '../types/chat';
import cache from '../utils/cache';

/**
 * Chat Service for managing chat sessions and messages
 * Handles CRUD operations for chats and message management
 */
class ChatService {
  /**
   * Create a new chat session
   * @param userId - User ID who owns the chat
   * @param title - Chat title (optional)
   * @param pdfIds - Array of PDF IDs associated with the chat
   * @returns Created chat document
   */
  async createChat(userId: string, title: string = 'New Chat', pdfIds: string[] = []): Promise<IChat> {
    try {
      const chat = await Chat.create({
        userId,
        title,
        pdfIds,
        messages: []
      });

      logger.info(`Chat created: ${chat._id} by user ${userId}`);

      return chat;
    } catch (error) {
      logger.error('Chat creation failed:', error);
      throw ApiError.internal('Failed to create chat', 'CHAT_CREATE_ERROR');
    }
  }

  /**
   * Get user's chat sessions with pagination
   * @param userId - User ID
   * @param filters - Pagination and sorting filters
   * @returns Paginated list of chats
   */
  async getUserChats(userId: string, filters: ChatFilters = {}): Promise<ChatListResult> {
    try {
      const { limit = 50, skip = 0, sortBy = '-updatedAt' } = filters;

      const chats = await Chat.find({ userId })
        .sort(sortBy)
        .limit(parseInt(limit.toString()))
        .skip(parseInt(skip.toString()))
        .select('-messages') // Don't include full message history in list
        .populate('pdfIds', 'originalName pageCount status');

      const total = await Chat.countDocuments({ userId });

      return {
        chats,
        total,
        limit: parseInt(limit.toString()),
        skip: parseInt(skip.toString())
      };
    } catch (error) {
      logger.error('Failed to get user chats:', error);
      throw ApiError.internal('Failed to retrieve chats', 'CHAT_RETRIEVAL_ERROR');
    }
  }

  /**
   * Get a single chat by ID with full message history
   * @param chatId - Chat ID
   * @param userId - User ID (for ownership validation)
   * @returns Chat document with populated PDFs
   */
  async getChatById(chatId: string, userId: string): Promise<IChat> {
    try {
      // Check cache first
      const cacheKey = `chat:${chatId}:${userId}`;
      const cachedChat = cache.getChat(cacheKey);
      if (cachedChat) {
        logger.debug(`Chat ${chatId} retrieved from cache`);
        return cachedChat;
      }

      const chat = await Chat.findOne({ _id: chatId, userId })
        .populate('pdfIds', 'originalName pageCount status metadata');

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      // Cache the result for 30 minutes
      cache.setChat(cacheKey, chat, 1800);
      logger.debug(`Chat ${chatId} cached`);

      return chat;
    } catch (error) {
      if ((error as any).name === 'CastError') {
        throw ApiError.badRequest('Invalid chat ID', 'INVALID_CHAT_ID');
      }
      throw error;
    }
  }

  /**
   * Add a message to a chat session
   * @param chatId - Chat ID
   * @param userId - User ID (for ownership validation)
   * @param role - Message role (user, assistant, system)
   * @param content - Message content
   * @param citations - Array of citations (optional)
   * @returns Updated chat document
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

      await chat.addMessage(role, content, citations);

      // Invalidate cache for this chat
      const cacheKey = `chat:${chatId}:${userId}`;
      cache.delete(cacheKey);
      logger.debug(`Cache invalidated for chat ${chatId}`);

      logger.info(`Message added to chat ${chatId} by ${role}`);

      return chat;
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Delete a chat session
   * @param chatId - Chat ID
   * @param userId - User ID (for ownership validation)
   * @returns Deletion result
   */
  async deleteChat(chatId: string, userId: string): Promise<{ message: string; chatId: string }> {
    try {
      const chat = await Chat.findOneAndDelete({ _id: chatId, userId });

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info(`Chat deleted: ${chatId} by user ${userId}`);

      return {
        message: 'Chat deleted successfully',
        chatId
      };
    } catch (error) {
      logger.error('Chat deletion failed:', error);
      throw error;
    }
  }

  /**
   * Update chat title
   * @param chatId - Chat ID
   * @param userId - User ID (for ownership validation)
   * @param title - New chat title
   * @returns Updated chat document
   */
  async updateChatTitle(chatId: string, userId: string, title: string): Promise<IChat> {
    try {
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId },
        { title },
        { new: true }
      );

      if (!chat) {
        throw ApiError.notFound('Chat not found', 'CHAT_NOT_FOUND');
      }

      logger.info(`Chat title updated: ${chatId}`);

      return chat;
    } catch (error) {
      logger.error('Chat title update failed:', error);
      throw error;
    }
  }
}

export default new ChatService();
