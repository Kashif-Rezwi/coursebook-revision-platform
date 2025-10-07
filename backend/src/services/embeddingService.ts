import { HfInference } from '@huggingface/inference';
import * as natural from 'natural';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import config from '../config/env';

class EmbeddingService {
  private hf: HfInference | null = null;
  private tokenizer: natural.WordTokenizer;
  private stemmer: any;
  private useLLMEmbeddings: boolean = false;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = (natural as any).PorterStemmer;
    
    // Initialize Hugging Face client if API key is provided
    if (config.llm.apiKey) {
      this.hf = new HfInference(config.llm.apiKey);
      this.useLLMEmbeddings = true;
      logger.info('LLM embeddings enabled with Hugging Face');
    } else {
      logger.info('Using local embeddings (no API key provided)');
    }
  }

  /**
   * Generate embedding vector for text using LLM or fallback to local approach
   * @param text - Text to generate embedding for
   * @returns Promise<number[]> - Embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      // Try LLM embeddings first if available
      if (this.useLLMEmbeddings && this.hf) {
        try {
          return await this.generateLLMEmbedding(text);
        } catch (error) {
          logger.warn('LLM embedding failed, falling back to local approach:', error);
          // Fallback to local approach
        }
      }

      // Use local embedding approach
      return this.generateLocalEmbedding(text);
    } catch (error) {
      logger.error('Embedding generation failed:', error);
      throw ApiError.internal('Failed to generate embedding', 'EMBEDDING_ERROR');
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise<number[][]> - Array of embedding vectors
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

      // Try batch LLM embeddings first if available
      if (this.useLLMEmbeddings && this.hf) {
        try {
          return await this.generateBatchLLMEmbeddings(validTexts);
        } catch (error) {
          logger.warn('Batch LLM embedding failed, falling back to local approach:', error);
          // Fallback to local approach
        }
      }

      // Use local embedding approach
      const embeddings: number[][] = [];
      for (const text of validTexts) {
        const embedding = await this.generateLocalEmbedding(text);
        embeddings.push(embedding);
      }

      logger.info(`Generated ${embeddings.length} embeddings in batch (local approach)`);
      return embeddings;
    } catch (error) {
      logger.error('Batch embedding generation failed:', error);
      throw ApiError.internal('Failed to generate batch embeddings', 'BATCH_EMBEDDING_ERROR');
    }
  }

  /**
   * Generate LLM embedding using Hugging Face Inference API
   * @param text - Text to generate embedding for
   * @returns Promise<number[]> - LLM embedding vector
   */
  private async generateLLMEmbedding(text: string): Promise<number[]> {
    if (!this.hf) {
      throw new Error('Hugging Face client not initialized');
    }

    try {
      const response = await this.hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2', // 384 dimensions
        inputs: text,
      });

      // Convert to number array
      const embedding = Array.isArray(response) ? response : (response as any)[0];
      
      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      logger.debug(`Generated LLM embedding for text (${text.length} chars)`);
      return embedding as number[];
    } catch (error) {
      logger.error('LLM embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate batch LLM embeddings using Hugging Face Inference API
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise<number[][]> - Array of LLM embedding vectors
   */
  private async generateBatchLLMEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.hf) {
      throw new Error('Hugging Face client not initialized');
    }

    try {
      const response = await this.hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: texts,
      });

      // Convert to number array
      const embeddings = Array.isArray(response) ? response : [response as any];
      
      logger.info(`Generated ${embeddings.length} LLM embeddings in batch`);
      return embeddings as number[][];
    } catch (error) {
      logger.error('Batch LLM embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate local embedding using TF-IDF approach (fallback)
   * @param text - Text to generate embedding for
   * @returns number[] - Local embedding vector
   */
  private generateLocalEmbedding(text: string): number[] {
    // Tokenize and stem the text
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

    // Create a simple embedding based on character frequencies and word patterns
    const embedding = this.createSimpleEmbedding(stemmedTokens, text);

    logger.debug(`Generated local embedding for text (${text.length} chars)`);
    return embedding;
  }

  /**
   * Create a simple embedding vector based on text characteristics
   * @param tokens - Stemmed tokens from the text
   * @param originalText - Original text
   * @returns number[] - Embedding vector
   */
  private createSimpleEmbedding(tokens: string[], originalText: string): number[] {
    const embeddingSize = 384; // Match LLM embedding size
    const embedding = new Array(embeddingSize).fill(0);

    // Character-level features
    const charCount = originalText.length;
    const wordCount = tokens.length;
    const sentenceCount = (originalText.match(/[.!?]+/g) || []).length;
    const paragraphCount = (originalText.match(/\n\s*\n/g) || []).length + 1;

    // Normalize features
    const normalizedCharCount = Math.min(charCount / 1000, 1);
    const normalizedWordCount = Math.min(wordCount / 100, 1);
    const normalizedSentenceCount = Math.min(sentenceCount / 10, 1);
    const normalizedParagraphCount = Math.min(paragraphCount / 5, 1);

    // Set basic features
    embedding[0] = normalizedCharCount;
    embedding[1] = normalizedWordCount;
    embedding[2] = normalizedSentenceCount;
    embedding[3] = normalizedParagraphCount;

    // Word frequency features
    const wordFreq: { [key: string]: number } = {};
    tokens.forEach(token => {
      wordFreq[token] = (wordFreq[token] || 0) + 1;
    });

    // Create hash-based features for word patterns
    let hashIndex = 4;
    const uniqueWords = Object.keys(wordFreq);
    
    for (let i = 0; i < uniqueWords.length && hashIndex < embeddingSize; i++) {
      const word = uniqueWords[i] || '';
      const frequency = wordFreq[word] || 0;
      
      // Create multiple hash features for each word
      for (let j = 0; j < 3 && hashIndex < embeddingSize; j++) {
        const hash = this.simpleHash(word + j.toString()) % 1000;
        embedding[hashIndex] = (hash / 1000) * (frequency / wordCount);
        hashIndex++;
      }
    }

    // Fill remaining dimensions with zeros for simplicity
    // (Character n-grams removed for simplicity)

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  }


  /**
   * Simple hash function for creating hash-based features
   * @param str - String to hash
   * @returns number - Hash value
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get current embedding method being used
   * @returns string - Current method
   */
  getCurrentMethod(): string {
    return this.useLLMEmbeddings ? 'LLM (Hugging Face)' : 'Local (TF-IDF)';
  }

  /**
   * Test embedding generation with a sample text
   * @param text - Sample text to test
   * @returns Promise<{method: string, dimensions: number, embedding: number[]}>
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
