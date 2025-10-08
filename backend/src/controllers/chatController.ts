import { Request, Response } from 'express';
import chatService from '../services/chatService';
import ragService from '../services/ragService';
import { respondCreated, respondData } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { extractCitations } from '../utils/citationExtractor';
import { AuthenticatedRequest } from '../types/auth';
import { getUserId, getParam, createFilters } from '../utils/requestHelpers';

/**
 * Chat Controller for handling chat-related HTTP requests
 * Provides endpoints for chat management and messaging
 */
export const chatController = {
  /**
   * Create a new chat session
   */
  createChat: asyncHandler(async (req: Request, res: Response) => {
    const { title, pdfIds } = req.body;
    const authReq = req as AuthenticatedRequest;

    const chat = await chatService.createChat(getUserId(authReq), title, pdfIds);

    return respondCreated(res, { chat }, 'Chat created successfully');
  }),

  /**
   * Get user's chat sessions with pagination
   */
  getUserChats: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const filters = createFilters(req);
    const result = await chatService.getUserChats(getUserId(authReq), filters);
    return respondData(res, result, 'Chats retrieved successfully');
  }),

  /**
   * Get a single chat with full message history
   */
  getChat: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = getParam(req, 'chatId');

    const chat = await chatService.findById(chatId, getUserId(authReq));

    return respondData(res, { chat }, 'Chat retrieved successfully');
  }),

  /**
   * Send a message and get AI response
   */
  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = getParam(req, 'chatId');
    const { message, streaming } = req.body;

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    // Get chat
    const chat = await chatService.findById(chatId, getUserId(authReq));

    // Add user message to chat
    await chatService.addMessage(chatId, getUserId(authReq), 'user', message);

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
          getUserId(authReq),
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
      getUserId(authReq),
      'assistant',
      result.answer!,
      result.citations as any
    );

    return respondData(res, {
      answer: result.answer,
      citations: result.citations
    }, 'Message sent successfully');
  }),

  /**
   * Delete a chat session
   */
  deleteChat: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = getParam(req, 'chatId');

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    const result = await chatService.remove(chatId, getUserId(authReq));

    return respondData(res, result, 'Chat deleted successfully');
  }),

  /**
   * Update chat title
   */
  updateChatTitle: asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const chatId = getParam(req, 'chatId');

    if (!chatId) {
      throw ApiError.badRequest('Chat ID is required', 'MISSING_CHAT_ID');
    }

    const chat = await chatService.updateTitle(
      chatId,
      getUserId(authReq),
      req.body.title
    );

    return respondData(res, { chat }, 'Chat title updated successfully');
  })
};

export default chatController;