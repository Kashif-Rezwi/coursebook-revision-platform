import { Request, Response } from 'express';
import chatService from '../services/chatService';
import ragService from '../services/ragService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { extractCitations } from '../utils/citationExtractor';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

/**
 * Chat Controller for handling chat-related HTTP requests
 * Provides endpoints for chat management and messaging
 */
class ChatController {
  /**
   * Create a new chat session
   */
  createChat = asyncHandler(async (req: Request, res: Response) => {
    const { title, pdfIds } = req.body;
    const authReq = req as AuthenticatedRequest;

    const chat = await chatService.createChat(authReq.user.userId, title, pdfIds);

    return successResponse(
      res,
      201,
      'Chat created successfully',
      { chat }
    );
  });

  /**
   * Get user's chat sessions with pagination
   */
  getUserChats = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const filters: any = {};
    if (req.query['limit']) {
      filters.limit = parseInt(req.query['limit'] as string);
    }
    if (req.query['skip']) {
      filters.skip = parseInt(req.query['skip'] as string);
    }
    if (req.query['sortBy']) {
      filters.sortBy = req.query['sortBy'] as string;
    }

    const result = await chatService.getUserChats(authReq.user.userId, filters);

    return successResponse(
      res,
      200,
      'Chats retrieved successfully',
      result
    );
  });

  /**
   * Get a single chat with full message history
   */
  getChat = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = req.params['chatId'] as string;

    const chat = await chatService.getChatById(chatId, authReq.user.userId);

    return successResponse(
      res,
      200,
      'Chat retrieved successfully',
      { chat }
    );
  });

  /**
   * Send a message and get AI response
   */
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { chatId } = req.params;
    const { message, streaming } = req.body;

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    // Get chat
    const chat = await chatService.getChatById(chatId, authReq.user.userId);

    // Add user message to chat
    await chatService.addMessage(chatId, authReq.user.userId, 'user', message);

    // Process query with RAG
    const result = await ragService.processQuery(
      message,
      chat.pdfIds.map((pdf: any) => pdf._id.toString()),
      chat.messages as any,
      { streaming }
    );

    // Handle streaming response
    if (streaming && result.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      try {
        for await (const chunk of result.stream) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        // Extract citations after streaming completes
        const citations = extractCitations(fullResponse, (result as any).contextChunks || []);

        // Save assistant message with citations
        await chatService.addMessage(
          chatId,
          authReq.user.userId,
          'assistant',
          fullResponse,
          citations as any
        );

        // Send final done event including citations for client parity
        res.write(`data: ${JSON.stringify({ done: true, citations })}\n\n`);
        res.end();
      } catch (error) {
        logger.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        res.end();
      }

      return;
    }

    // Non-streaming response
    // Add assistant message to chat
    await chatService.addMessage(
      chatId,
      authReq.user.userId,
      'assistant',
      result.answer!,
      result.citations as any
    );

    return successResponse(
      res,
      200,
      'Message sent successfully',
      {
        answer: result.answer,
        citations: result.citations
      }
    );
  });

  /**
   * Delete a chat session
   */
  deleteChat = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = req.params['chatId'] as string;

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    const result = await chatService.deleteChat(chatId, authReq.user.userId);

    return successResponse(
      res,
      200,
      'Chat deleted successfully',
      result
    );
  });

  /**
   * Update chat title
   */
  updateChatTitle = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = req.params['chatId'] as string;

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    const chat = await chatService.updateChatTitle(
      chatId,
      authReq.user.userId,
      req.body.title
    );

    return successResponse(
      res,
      200,
      'Chat title updated successfully',
      { chat }
    );
  });
}

export default new ChatController();