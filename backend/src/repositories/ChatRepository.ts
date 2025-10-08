import { Chat, IChat } from '../models';
import { BaseRepository } from './BaseRepository';

export interface ChatFilters {
  limit?: number;
  skip?: number;
  sortBy?: string;
  status?: string;
}

export interface ChatListResult {
  chats: IChat[];
  total: number;
  limit: number;
  skip: number;
}

class ChatRepository extends BaseRepository<IChat> {
  constructor() {
    super(Chat, 'Chat');
  }

  /**
   * Get user's chats with pagination
   */
  async getUserChats(userId: string, filters: ChatFilters = {}): Promise<ChatListResult> {
    const result = await this.findMany(userId, {
      ...filters,
      select: '-messages' // Don't include full message history in list
    });

    // Populate PDF references
    const chats = await Chat.populate(result.items, {
      path: 'pdfIds',
      select: 'originalName pageCount status'
    });

    return {
      chats,
      total: result.total,
      limit: result.limit,
      skip: result.skip
    };
  }

  /**
   * Get chat by ID with full message history
   */
  async getChatWithMessages(chatId: string, userId: string): Promise<IChat | null> {
    try {
      const chat = await Chat.findOne({ _id: chatId, userId })
        .populate('pdfIds', 'originalName pageCount status metadata');

      return chat;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw new Error('Invalid chat ID');
      }
      throw error;
    }
  }

  /**
   * Add message to chat
   */
  async addMessage(chatId: string, userId: string, role: 'user' | 'assistant' | 'system', content: string, citations: any[] = []): Promise<IChat | null> {
    try {
      const chat = await Chat.findOne({ _id: chatId, userId });
      if (!chat) return null;

      await chat.addMessage(role, content, citations);
      return chat;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update chat title
   */
  async updateTitle(chatId: string, userId: string, title: string): Promise<IChat | null> {
    return this.updateById(chatId, userId, { title });
  }
}

export default new ChatRepository();
