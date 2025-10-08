import dotenv from 'dotenv';
import { Config } from '../types';

// Load .env file
dotenv.config();

// Helper function for consistent number parsing
const parseInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloat = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Validate required environment variables
const requiredEnvVars: (keyof NodeJS.ProcessEnv)[] = [
  'MONGODB_URI', 
  'JWT_SECRET', 
  'REDIS_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate ChromaDB port
const chromadbPort = parseInt(process.env['CHROMADB_PORT'], 8000);
if (chromadbPort < 1 || chromadbPort > 65535) {
  throw new Error('CHROMADB_PORT must be a valid port number (1-65535)');
}

/**
 * Application configuration derived from environment variables.
 * The object is frozen to prevent runtime mutation.
 */
const config: Config = {
  // Server Configuration
  env: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'], 3001),
  
  // Database Configuration
  mongodbUri: process.env['MONGODB_URI']!,
  
  // JWT Configuration
  jwt: {
    secret: process.env['JWT_SECRET']!,
    expire: process.env['JWT_EXPIRE'] || '7d'
  },
  
  // Redis Configuration
  redisUrl: process.env['REDIS_URL']!,
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'], 6379),
    ...(process.env['REDIS_PASSWORD'] && { password: process.env['REDIS_PASSWORD'] })
  },
  
  // ChromaDB Configuration
  chromadbHost: process.env['CHROMADB_HOST'] || 'localhost',
  chromadbPort,
  chromadbCollection: process.env['CHROMADB_COLLECTION'] || 'pdf_embeddings',
  
  // AI Services Configuration (Hugging Face)
  ai: {
    apiKey: process.env['HUGGINGFACE_API_KEY'] || process.env['LLM_API_KEY'] || '',
    textGeneration: {
      model: process.env['HUGGINGFACE_MODEL'] || 'mistralai/Mistral-7B-Instruct-v0.2',
      temperature: parseFloat(process.env['HUGGINGFACE_TEMPERATURE'], 0.7),
      maxTokens: parseInt(process.env['HUGGINGFACE_MAX_TOKENS'], 1024),
      topP: parseFloat(process.env['HUGGINGFACE_TOP_P'], 0.9)
    },
    embeddings: {
      model: process.env['EMBEDDING_MODEL'] || 'sentence-transformers/all-MiniLM-L6-v2'
    }
  },
  
  // File Upload Configuration
  upload: {
    path: process.env['UPLOAD_PATH'] || './uploads',
    maxFileSize: parseInt(process.env['MAX_FILE_SIZE'], 52428800)
  },
  
  // CORS Configuration
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  
  // Logging Configuration
  logLevel: process.env['LOG_LEVEL'] || 'info',
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW'], 900000), // 15 minutes
    authMax: parseInt(process.env['RATE_LIMIT_AUTH'], 5),
    standardMax: parseInt(process.env['RATE_LIMIT_STANDARD'], 100),
    readMax: parseInt(process.env['RATE_LIMIT_READ'], 200),
    uploadWindowMs: parseInt(process.env['UPLOAD_WINDOW_MS'], 3600000), // 1 hour
    uploadMax: parseInt(process.env['UPLOAD_MAX_REQUESTS'], 10)
  },
  
  // Application Metadata
  app: {
    name: process.env['APP_NAME'] || 'Learning Platform API',
    version: process.env['APP_VERSION'] || '1.0.0'
  }
};

export default Object.freeze(config);