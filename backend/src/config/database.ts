import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import config from './env';
import { TIMEOUTS } from './timeouts';

const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: TIMEOUTS.DATABASE_SELECTION,
  socketTimeoutMS: TIMEOUTS.DATABASE_SOCKET,
  connectTimeoutMS: 10000,
  bufferMaxEntries: 0,
  bufferCommands: false,
  retryWrites: true,
  retryReads: true,
};

/**
 * Connect to MongoDB database
 */
const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri, options);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Event listeners
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB');
});

/**
 * Disconnect from MongoDB database
 */
const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

export { connectDB, disconnectDB };
