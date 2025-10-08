import config from '../config/env';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { ContextChunk, ChatMessage, GenerationOptions, MAX_CHAT_HISTORY } from '../types/chat';
import { HfInference } from '@huggingface/inference';

/**
 * LLM Service for handling Hugging Face API calls
 * Provides text generation and streaming capabilities for RAG pipeline
 */
class LLMService {
  private client: HfInference | null = null;
  private model: string = '';
  private defaultParams: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };

  constructor() {
    this.model = config.huggingface.model;
    this.defaultParams = {
      temperature: config.huggingface.temperature,
      max_tokens: config.huggingface.maxTokens,
      top_p: config.huggingface.topP
    };

    if (!config.huggingface.apiKey) {
      logger.warn('Hugging Face API key not configured');
      this.client = null;
      return;
    }

    try {
      this.client = new HfInference(config.huggingface.apiKey);
      logger.info(`LLM configured with model: ${this.model}`);
    } catch (error) {
      logger.warn('LLM service initialized without client');
      this.client = null;
    }
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
   * Generate text response using Hugging Face API
   * @param prompt - Input prompt for generation
   * @param options - Generation parameters
   * @returns Generated text response
   */
  async generateResponse(prompt: string, options: GenerationOptions = {}): Promise<string> {
    try {
      if (!this.client) {
        throw new Error('LLM client not initialized');
      }

      const params = {
        ...this.defaultParams,
        ...options
      };

      const response = await this.client.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          temperature: params.temperature,
          max_new_tokens: params.max_tokens,
          top_p: params.top_p,
          return_full_text: false
        }
      });

      logger.debug(`LLM response generated (${response.generated_text.length} chars)`);

      return response.generated_text.trim();
    } catch (error) {
      logger.error('LLM generation failed:', error);
      throw ApiError.internal('Failed to generate response', 'LLM_GENERATION_ERROR');
    }
  }

  /**
   * Generate streaming text response using Hugging Face API
   * @param prompt - Input prompt for generation
   * @param options - Generation parameters
   * @returns Async generator yielding text chunks
   */
  async *generateStreamingResponse(prompt: string, options: GenerationOptions = {}): AsyncGenerator<string, void, unknown> {
    try {
      if (!this.client) {
        throw new Error('LLM client not initialized');
      }

      const params = {
        ...this.defaultParams,
        ...options
      };

      const stream = await this.client.textGenerationStream({
        model: this.model,
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
      logger.error('LLM streaming failed:', error);
      throw ApiError.internal('Failed to stream response', 'LLM_STREAMING_ERROR');
    }
  }
}

export default new LLMService();
