import { logger } from './logger';
import SharedHttpClient from '../services/httpClient';
import { huggingFaceCircuitBreaker } from './circuitBreaker';

/**
 * Graceful shutdown utility for external services
 * Ensures proper cleanup of resources when the application shuts down
 */
export class GracefulShutdown {
  private static shutdownHandlers: (() => Promise<void> | void)[] = [];
  private static isShuttingDown = false;

  /**
   * Register a shutdown handler
   * @param handler - Function to execute during shutdown
   */
  static register(handler: () => Promise<void> | void): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Execute all registered shutdown handlers
   */
  static async execute(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown...');

    // Execute all registered handlers
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error('Error during shutdown handler execution:', error);
      }
    }

    // Cleanup external services
    await this.cleanupExternalServices();

    logger.info('Graceful shutdown completed');
  }

  /**
   * Cleanup external services
   */
  private static async cleanupExternalServices(): Promise<void> {
    try {
      // Reset circuit breaker
      huggingFaceCircuitBreaker.reset();
      logger.info('Circuit breaker reset');

      // Cleanup HTTP client
      SharedHttpClient.cleanup();
      logger.info('HTTP client cleaned up');

    } catch (error) {
      logger.error('Error during external services cleanup:', error);
    }
  }

  /**
   * Setup process signal handlers
   */
  static setupSignalHandlers(): void {
    // Handle SIGTERM (termination signal)
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown...');
      await this.execute();
      process.exit(0);
    });

    // Handle SIGINT (interrupt signal - Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, starting graceful shutdown...');
      await this.execute();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error);
      await this.execute();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled promise rejection:', reason);
      await this.execute();
      process.exit(1);
    });

    logger.info('Signal handlers registered for graceful shutdown');
  }

  /**
   * Get shutdown status
   */
  static getStatus(): {
    isShuttingDown: boolean;
    registeredHandlers: number;
  } {
    return {
      isShuttingDown: this.isShuttingDown,
      registeredHandlers: this.shutdownHandlers.length
    };
  }
}
