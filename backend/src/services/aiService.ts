import config from '../config/env';
import { logger } from '../utils/logger';
import { ContextChunk, ChatMessage, GenerationOptions, MAX_CHAT_HISTORY } from '../types/chat';
import SharedHttpClient from './httpClient';
import { huggingFaceCircuitBreaker } from '../utils/circuitBreaker';
import { AI_LIMITS } from '../utils/constants';

/**
 * Unified AI Service for all Hugging Face API operations
 * Consolidates text generation and embedding functionality
 */
class AIService {
  private textModel: string;
  private embeddingModel: string;
  private defaultParams: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };

  constructor() {
    this.textModel = config.ai.textGeneration.model;
    this.embeddingModel = config.ai.embeddings.model;
    this.defaultParams = {
      temperature: config.ai.textGeneration.temperature,
      max_tokens: config.ai.textGeneration.maxTokens,
      top_p: config.ai.textGeneration.topP
    };

    if (!config.ai.apiKey) {
      logger.error('AI API key not configured');
      return;
    }

    try {
      SharedHttpClient.getInstance(); // Initialize shared client
      logger.info('Service: initialize - AI Service initialized', { 
        textModel: this.textModel, 
        embeddingModel: this.embeddingModel 
      });
    } catch (error) {
      logger.error('AI service initialized without client', error);
    }
  }

  /**
   * Generate text response using Hugging Face API
   * @param prompt - Input prompt for generation
   * @param options - Generation parameters
   * @returns Generated text response
   */
  async generateText(prompt: string, options: GenerationOptions = {}): Promise<string> {
    return huggingFaceCircuitBreaker.execute(async () => {
      const client = SharedHttpClient.getInstance();
      const params = {
        ...this.defaultParams,
        ...options
      };

      const response = await client.textGeneration({
        model: this.textModel,
        inputs: prompt,
        parameters: {
          temperature: params.temperature,
          max_new_tokens: params.max_tokens,
          top_p: params.top_p,
          return_full_text: false
        }
      });

      logger.info('Service: generateText - Text generated', { 
        textLength: response.generated_text.length 
      });
      return response.generated_text.trim();
    }, 'text generation');
  }

  /**
   * Generate streaming text response using Hugging Face API
   * @param prompt - Input prompt for generation
   * @param options - Generation parameters
   * @returns Async generator yielding text chunks
   */
  async *generateStreamingText(prompt: string, options: GenerationOptions = {}): AsyncGenerator<string, void, unknown> {
    try {
      const client = SharedHttpClient.getInstance();
      const params = {
        ...this.defaultParams,
        ...options
      };

      const stream = await client.textGenerationStream({
        model: this.textModel,
        inputs: prompt,
        parameters: {
          temperature: params.temperature,
          max_new_tokens: params.max_tokens,
          top_p: params.top_p,
          return_full_text: false
        }
      });

      for await (const chunk of stream) {
        if (chunk.token.text) {
          yield chunk.token.text;
        }
      }
    } catch (error) {
        logger.error('Streaming text generation failed', error);
      throw error;
    }
  }

  /**
   * Generate embedding vector for text using Hugging Face API
   * @param text - Text to generate embedding for
   * @returns Embedding vector as number array
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    return huggingFaceCircuitBreaker.execute(async () => {
      const client = SharedHttpClient.getInstance();
      const response = await client.featureExtraction({
        model: this.embeddingModel,
        inputs: text,
      });

      // Convert to number array
      const embedding = Array.isArray(response) ? response : (response as any)[0];
      
      if (!Array.isArray(embedding)) {
        throw new Error('Invalid embedding response format');
      }

      logger.info('Service: generateEmbedding - Generated embedding', { 
        textLength: text.length 
      });
      return embedding as number[];
    }, 'embedding generation');
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to generate embeddings for
   * @returns Array of embedding vectors
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);

    if (validTexts.length === 0) {
      return [];
    }

    return huggingFaceCircuitBreaker.execute(async () => {
      const client = SharedHttpClient.getInstance();
      const response = await client.featureExtraction({
        model: this.embeddingModel,
        inputs: validTexts,
      });

      // Convert to number array
      const embeddings = Array.isArray(response) ? response : [response as any];
      
      logger.info('Service: generateEmbeddings - Generated embeddings in batch', { 
        count: embeddings.length 
      });
      return embeddings as number[][];
    }, 'batch embedding generation');
  }

  /**
   * Build RAG prompt with context chunks and chat history
   * @param query - User's question
   * @param contextChunks - Retrieved context chunks from PDFs
   * @param chatHistory - Previous chat messages for context
   * @returns Formatted prompt string
   */
  buildRAGPrompt(query: string, contextChunks: ContextChunk[], chatHistory: ChatMessage[] = []): string {
    let prompt = "You are a helpful AI assistant. Answer the user's question based on the provided context from PDF documents.\n\n";

    // Add context
    if (contextChunks && contextChunks.length > 0) {
      prompt += "Context from PDFs:\n";
      contextChunks.forEach((chunk, index) => {
        const pageNum = chunk.metadata?.pageNumber || 'unknown';
        prompt += `[Context ${index + 1}, Page ${pageNum}]\n${chunk.document}\n\n`;
      });
    }

    // Add chat history (limited to prevent context overflow)
    if (chatHistory.length > 0) {
      prompt += "Chat History:\n";
      const recentHistory = chatHistory.slice(-MAX_CHAT_HISTORY); // Limit history
      recentHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += "\n";
    }

    // Add current question
    prompt += `User Question: ${query}\n\n`;

    // Add instructions
    prompt += `Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain the answer, say so clearly
- Include page references when citing information (e.g., "According to page 5...")
- Be concise but comprehensive
- If asked about something not in the context, acknowledge the limitation

Answer:`;

    return prompt;
  }

  /**
   * Get current models being used
   */
  getModels(): { textModel: string; embeddingModel: string } {
    return {
      textModel: this.textModel,
      embeddingModel: this.embeddingModel
    };
  }

  /**
   * Generate multiple text responses in parallel
   * @param prompts - Array of prompts to generate text for
   * @param options - Generation parameters
   * @returns Array of generated text responses
   */
  async generateMultipleTexts(prompts: string[], options: GenerationOptions = {}): Promise<string[]> {
    if (!prompts || prompts.length === 0) {
      return [];
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = AI_LIMITS.MAX_BATCH_SIZE;
    const results: string[] = [];

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchPromises = batch.map(prompt => this.generateText(prompt, options));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        logger.error(`Batch ${Math.floor(i / batchSize) + 1} failed`, error);
        // Add empty strings for failed batch
        results.push(...new Array(batch.length).fill(''));
      }
    }

    return results;
  }

  /**
   * Test AI service with sample operations
   */
  async testService(): Promise<{
    textGeneration: boolean;
    embeddings: boolean;
    models: { textModel: string; embeddingModel: string };
    circuitBreakers: {
      huggingFace: any;
    };
    httpClient: any;
  }> {
    const results = {
      textGeneration: false,
      embeddings: false,
      models: this.getModels(),
      circuitBreakers: {
        huggingFace: huggingFaceCircuitBreaker.getState()
      },
      httpClient: SharedHttpClient.getHealthStatus()
    };

    try {
      // Test text generation
      await this.generateText('Hello, this is a test.');
      results.textGeneration = true;
    } catch (error) {
      logger.error('Text generation test failed', error);
    }

    try {
      // Test embeddings
      await this.generateEmbedding('This is a test sentence.');
      results.embeddings = true;
    } catch (error) {
      logger.error('Embedding test failed', error);
    }

    return results;
  }

  /**
   * Get comprehensive health status
   */
  getHealthStatus(): {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      httpClient: any;
      circuitBreakers: {
        huggingFace: any;
      };
      models: { textModel: string; embeddingModel: string };
    };
  } {
    const httpStatus = SharedHttpClient.getHealthStatus();
    const circuitBreaker = huggingFaceCircuitBreaker.getState();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!httpStatus.initialized || !httpStatus.hasApiKey) {
      status = 'unhealthy';
    } else if (circuitBreaker.state === 'OPEN') {
      status = 'degraded';
    }

    return {
      service: 'AIService',
      status,
      details: {
        httpClient: httpStatus,
        circuitBreakers: {
          huggingFace: circuitBreaker
        },
        models: this.getModels()
      }
    };
  }
}

export default new AIService();
