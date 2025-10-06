import dotenv from 'dotenv';
import { Config } from '../types';

// Load .env file
dotenv.config();

// Validate required variables
const requiredEnvVars: (keyof NodeJS.ProcessEnv)[] = ['MONGODB_URI', 'JWT_SECRET', 'REDIS_URL', 'LLM_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate ChromaDB configuration
const chromadbHost = process.env['CHROMADB_HOST'] || 'localhost';
const chromadbPort = Number.parseInt(process.env['CHROMADB_PORT'] || '8000', 10);

if (chromadbPort < 1 || chromadbPort > 65535) {
  throw new Error('CHROMADB_PORT must be a valid port number (1-65535)');
}

/**
 * Application configuration derived from environment variables.
 * The object is frozen to prevent runtime mutation.
 */
const config: Config = {
  env: process.env['NODE_ENV'] || 'development',
  port: Number.parseInt(process.env['PORT'] || '3001', 10),
  mongodbUri: process.env['MONGODB_URI']!,
  jwt: {
    secret: process.env['JWT_SECRET']!,
    expire: process.env['JWT_EXPIRE'] || '7d'
  },
  redisUrl: process.env['REDIS_URL']!,
  chromadbHost,
  chromadbPort,
  llm: {
    apiKey: process.env['LLM_API_KEY']!,
    model: process.env['LLM_MODEL'] || 'gpt-4'
  },
  upload: {
    path: process.env['FILE_UPLOAD_PATH'] || './uploads',
    maxFileSize: Number.parseInt(process.env['MAX_FILE_SIZE'] || '52428800', 10)
  },
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  logLevel: process.env['LOG_LEVEL'] || 'info'
};

export default Object.freeze(config);


