import app from './app';
import config from './config/env';
import { logger } from './utils/logger';
import { connectDB, disconnectDB } from './config/database';
import { initChromaDB } from './config/chromadb';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Connect to databases and start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize ChromaDB (non-blocking)
    try {
      await initChromaDB();
    } catch (error) {
      logger.warn('ChromaDB not available, continuing without vector storage');
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error: Error) => {
      logger.error('Unhandled Rejection:', error);
      server.close(async () => {
        await disconnectDB();
        process.exit(1);
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();


