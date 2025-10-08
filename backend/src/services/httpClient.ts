import { HfInference } from '@huggingface/inference';
import config from '../config/env';
import { TIMEOUTS } from '../config/timeouts';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

/**
 * Shared HTTP client for all AI service integrations
 * Provides singleton pattern to avoid multiple client instances
 */
class SharedHttpClient {
  private static instance: HfInference | null = null;

  /**
   * Get singleton instance of HuggingFace client
   * @returns HfInference client instance
   */
  static getInstance(): HfInference {
    if (!this.instance) {
      if (!config.ai.apiKey) {
        throw ApiError.internal('AI API key not configured. Please set HUGGINGFACE_API_KEY or LLM_API_KEY environment variable.', 'MISSING_API_KEY');
      }

      try {
        this.instance = new HfInference(config.ai.apiKey, {
          use_cache: true,
          retry_on_error: true,
          // Custom fetch with standardized timeout and error handling
          fetch: (url, options) => {
            return fetch(url, {
              ...options,
              // Use centralized timeout configuration
              signal: AbortSignal.timeout(TIMEOUTS.HTTP_REQUEST)
            });
          }
        });
        logger.info('Service: initialize - Shared HTTP client initialized with optimizations');
      } catch (error) {
        logger.error('Failed to initialize shared HTTP client', error);
        throw ApiError.internal('Failed to initialize AI client', 'CLIENT_INIT_ERROR');
      }
    }
    return this.instance;
  }

  /**
   * Reset client instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Check if client is initialized
   */
  static isInitialized(): boolean {
    return this.instance !== null;
  }

  /**
   * Cleanup client instance (useful for graceful shutdown)
   */
  static cleanup(): void {
    if (this.instance) {
      // Close any open connections if the client supports it
      try {
        // Note: HfInference doesn't expose connection cleanup methods
        // but we can reset the instance to free memory
        this.instance = null;
        logger.info('Service: cleanup - HTTP client cleaned up successfully');
      } catch (error) {
        logger.error('Error during HTTP client cleanup', error);
      }
    }
  }

  /**
   * Get client health status
   */
  static getHealthStatus(): {
    initialized: boolean;
    hasApiKey: boolean;
    lastError?: string;
  } {
    return {
      initialized: this.instance !== null,
      hasApiKey: !!config.ai.apiKey,
      ...(this.instance ? {} : { lastError: 'Client not initialized' })
    };
  }
}

export default SharedHttpClient;
