import { Request, Response } from 'express';
import embeddingService from '../services/embeddingService';
import chromaHelper from '../utils/chromaHelper';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';

class EmbeddingController {
  /**
   * Get embedding service status
   */
  getStatus = asyncHandler(async (_req: Request, res: Response) => {
    const method = embeddingService.getCurrentMethod();
    
    return successResponse(
      res,
      200,
      'Embedding service status retrieved successfully',
      {
        method,
        isLLMEnabled: method.includes('LLM'),
        timestamp: new Date().toISOString()
      }
    );
  });

  /**
   * Test embedding generation
   */
  testEmbedding = asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    const testText = text || 'This is a test sentence for embedding generation.';
    
    const testResult = await embeddingService.testEmbedding(testText);
    
    return successResponse(
      res,
      200,
      'Embedding test completed successfully',
      testResult
    );
  });

  /**
   * Get embedding count for a PDF
   */
  getEmbeddingCount = asyncHandler(async (req: Request, res: Response) => {
    const pdfId = String(req.params['pdfId']);
    
    const count = await chromaHelper.getEmbeddingCount(pdfId);
    
    return successResponse(
      res,
      200,
      'Embedding count retrieved successfully',
      {
        pdfId,
        count,
        timestamp: new Date().toISOString()
      }
    );
  });
}

export default new EmbeddingController();
