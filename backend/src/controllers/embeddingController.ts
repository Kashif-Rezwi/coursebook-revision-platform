import { Request, Response } from 'express';
import aiService from '../services/aiService';
import { chromaHelper } from '../utils/chromaHelper';
import { success } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { getParam } from '../utils/requestHelpers';

export const embeddingController = {
  /**
   * Get embedding service status
   */
  getStatus: asyncHandler(async (_req: Request, res: Response) => {
    const healthStatus = aiService.getHealthStatus();
    
    return success(res, {
      status: healthStatus.status,
      models: healthStatus.details.models,
      circuitBreaker: healthStatus.details.circuitBreakers.huggingFace,
      timestamp: new Date().toISOString()
    }, 'Embedding service status retrieved successfully');
  }),

  /**
   * Test embedding generation
   */
  testEmbedding: asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    const testText = text || 'This is a test sentence for embedding generation.';
    
    try {
      const embedding = await aiService.generateEmbedding(testText);
      
      return success(res, {
        text: testText,
        embeddingLength: embedding.length,
        success: true,
        timestamp: new Date().toISOString()
      }, 'Embedding test completed successfully');
    } catch (error) {
      return success(res, {
        text: testText,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }, 'Embedding test failed');
    }
  }),

  /**
   * Get embedding count for a PDF
   */
  getEmbeddingCount: asyncHandler(async (req: Request, res: Response) => {
    const pdfId = getParam(req, 'pdfId');
    
    const count = await chromaHelper.getEmbeddingCount(pdfId);
    
    return success(res, {
      pdfId,
      count,
      timestamp: new Date().toISOString()
    }, 'Embedding count retrieved successfully');
  })
};

export default embeddingController;
