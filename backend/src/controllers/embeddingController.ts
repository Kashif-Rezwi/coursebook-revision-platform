import { Request, Response } from 'express';
import embeddingService from '../services/embeddingService';
import chromaHelper from '../utils/chromaHelper';
import { respondData } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import { getParam } from '../utils/requestHelpers';

export const embeddingController = {
  /**
   * Get embedding service status
   */
  getStatus: asyncHandler(async (_req: Request, res: Response) => {
    const method = embeddingService.getCurrentMethod();
    
    return respondData(res, {
      method,
      isLLMEnabled: method.includes('LLM'),
      timestamp: new Date().toISOString()
    }, 'Embedding service status retrieved successfully');
  }),

  /**
   * Test embedding generation
   */
  testEmbedding: asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    const testText = text || 'This is a test sentence for embedding generation.';
    
    const testResult = await embeddingService.testEmbedding(testText);
    
    return respondData(res, testResult, 'Embedding test completed successfully');
  }),

  /**
   * Get embedding count for a PDF
   */
  getEmbeddingCount: asyncHandler(async (req: Request, res: Response) => {
    const pdfId = getParam(req, 'pdfId');
    
    const count = await chromaHelper.getEmbeddingCount(pdfId);
    
    return respondData(res, {
      pdfId,
      count,
      timestamp: new Date().toISOString()
    }, 'Embedding count retrieved successfully');
  })
};

export default embeddingController;
