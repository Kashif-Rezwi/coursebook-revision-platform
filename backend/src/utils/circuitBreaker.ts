import { logger } from './logger';
import { TIMEOUTS } from '../config/timeouts';

/**
 * Circuit Breaker pattern implementation for external API calls
 * Prevents cascading failures by temporarily stopping calls to failing services
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeout: number = TIMEOUTS.CIRCUIT_BREAKER
  ) {}

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Function to execute
   * @param operation - Operation name for logging
   * @returns Promise with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, operation: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker for ${operation} moved to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${operation}. Service temporarily unavailable.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(operation);
      return result;
    } catch (error) {
      this.onFailure(operation);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(operation: string): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      logger.info(`Circuit breaker for ${operation} moved to CLOSED state`);
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(operation: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker for ${operation} moved to OPEN state after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker reset to CLOSED state');
  }

  /**
   * Check if circuit breaker allows execution
   */
  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      return Date.now() - this.lastFailureTime > this.timeout;
    }
    
    return true; // HALF_OPEN
  }
}

// Global circuit breaker instance for HuggingFace API
// Single circuit breaker for all HuggingFace operations (text generation + embeddings)
export const huggingFaceCircuitBreaker = new CircuitBreaker(5, TIMEOUTS.CIRCUIT_BREAKER);
