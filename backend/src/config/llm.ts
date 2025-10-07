import { HfInference } from '@huggingface/inference';
import config from './env';
import logger from '../utils/logger';

/**
 * LLM Configuration class for Hugging Face API
 * Handles initialization and configuration of the Hugging Face inference client
 */
class LLMConfig {
  private client: HfInference | null = null;
  private model: string = '';
  private defaultParams: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  } = {
    temperature: config.huggingface.temperature ?? 0.7,
    max_tokens: config.huggingface.maxTokens ?? 1024,
    top_p: config.huggingface.topP ?? 0.9
  };

  constructor() {
    if (!config.huggingface.apiKey) {
      logger.warn('Hugging Face API key not configured');
      this.client = null;
      // Still set model from env for transparency
      this.model = config.huggingface.model;
      return;
    }

    this.client = new HfInference(config.huggingface.apiKey);
    this.model = config.huggingface.model;

    logger.info(`LLM configured with model: ${this.model}`);
  }

  /**
   * Get the Hugging Face inference client
   * @returns HfInference client instance
   * @throws Error if client is not initialized
   */
  getClient(): HfInference {
    if (!this.client) {
      throw new Error('Hugging Face client not initialized');
    }
    return this.client;
  }

  /**
   * Get the configured model name
   * @returns Model name string
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get default parameters for text generation
   * @returns Default parameters object
   */
  getDefaultParams() {
    return { ...this.defaultParams };
  }
}

export default new LLMConfig();
