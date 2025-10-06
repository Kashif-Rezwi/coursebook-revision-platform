import mongoose from 'mongoose';
import config from './env';
import logger from '../utils/logger';

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.mongodbUri);
        logger.info('MongoDB connected successfully.');
    } catch (error: any) {
        logger.error('MongoDB connection failed:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

export default connectDB;
