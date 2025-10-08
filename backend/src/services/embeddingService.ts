import { HfInference } from '@huggingface/inference';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import config from '../config/env';

class EmbeddingService {
  private hf: HfInference | null = null;
  private readonly MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

  constructor() {
    // Initialize Hugging Face client if API key is provided
    if (config.llm.apiKey) {
      this.hf = new HfInference(config.llm.apiKey);
      logger.info('LLM embeddings enabled with Hugging Face');
    } else {
      throw new Error('Hugging Face API key is required for embeddings');
    }
  }

  /**
   * Generate embedding vector for text using Hugging Face API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      if (!this.hf) {
        throw new Error('Hugging Face client not initialized');
      }

      const response = await this.hf.featureExtraction({
        model: this.MODEL,
        inputs: text,
      });

      // Convert to number array
      const embedding = Array.isArray(response) ? response : (response as any)[0];
      
      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      logger.debug(`Generated embedding for text (${text.length} chars)`);
      return embedding as number[];
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      throw ApiError.internal('Failed to generate embedding', 'EMBEDDING_ERROR');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      // Filter empty texts
      const validTexts = texts.filter(t => t && t.trim().length > 0);

      if (validTexts.length === 0) {
        return [];
      }

      if (!this.hf) {
        throw new Error('Hugging Face client not initialized');
      }

      const response = await this.hf.featureExtraction({
        model: this.MODEL,
        inputs: validTexts,
      });

      // Convert to number array
      const embeddings = Array.isArray(response) ? response : [response as any];
      
      logger.info(`Generated ${embeddings.length} embeddings in batch`);
      return embeddings as number[][];
    } catch (error) {
      logger.error('Batch embedding generation failed:', error);
      throw ApiError.internal('Failed to generate batch embeddings', 'BATCH_EMBEDDING_ERROR');
    }
  }

  /**
   * Get current embedding method
   */
  getCurrentMethod(): string {
    return 'LLM (Hugging Face)';
  }

  /**
   * Test embedding generation with a sample text
   */
  async testEmbedding(text: string = 'This is a test sentence for embedding generation.'): Promise<{
    method: string;
    dimensions: number;
    embedding: number[];
  }> {
    const embedding = await this.generateEmbedding(text);
    return {
      method: this.getCurrentMethod(),
      dimensions: embedding.length,
      embedding: embedding.slice(0, 10) // Return first 10 values for preview
    };
  }
}

export default new EmbeddingService();
