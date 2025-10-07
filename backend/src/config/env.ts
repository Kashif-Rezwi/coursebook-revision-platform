import dotenv from 'dotenv';
import { Config } from '../types';

// Load .env file
dotenv.config();

// Validate required variables
const requiredEnvVars: (keyof NodeJS.ProcessEnv)[] = ['MONGODB_URI', 'JWT_SECRET', 'REDIS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Redis configuration
const redisHost = process.env['REDIS_HOST'] || 'localhost';
const redisPort = Number.parseInt(process.env['REDIS_PORT'] || '6379', 10);
const redisPassword = process.env['REDIS_PASSWORD'] || undefined;

// Validate ChromaDB configuration
const chromadbHost = process.env['CHROMADB_HOST'] || 'localhost';
const chromadbPort = Number.parseInt(process.env['CHROMADB_PORT'] || '8000', 10);

if (chromadbPort < 1 || chromadbPort > 65535) {
  throw new Error('CHROMADB_PORT must be a valid port number (1-65535)');
}

// Resolve HF text generation model from env with priority
const resolveHuggingFaceModel = (): string => {
  const direct = process.env['HUGGINGFACE_MODEL'];
  if (direct && direct.trim()) return direct.trim();
  const defaultGen = process.env['DEFAULT_TEXT_GEN_MODEL'];
  if (defaultGen && defaultGen.trim()) return defaultGen.trim();
  // fallbacks by size preferences if provided
  const large = process.env['TEXT_GEN_MODEL_LARGE'];
  if (large && large.trim()) return large.trim();
  const medium = process.env['TEXT_GEN_MODEL_MEDIUM'];
  if (medium && medium.trim()) return medium.trim();
  const small = process.env['TEXT_GEN_MODEL_SMALL'];
  if (small && small.trim()) return small.trim();
  const edu = process.env['CHAT_MODEL_EDUCATION'];
  if (edu && edu.trim()) return edu.trim();
  // final default sensible for RAG chat
  return 'mistralai/Mistral-7B-Instruct-v0.2';
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const n = Number.parseFloat(value || '');
  return Number.isFinite(n) ? n : fallback;
};

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
  redis: {
    host: redisHost,
    port: redisPort,
    ...(redisPassword && { password: redisPassword })
  },
  chromadbHost,
  chromadbPort,
  llm: {
    apiKey: process.env['LLM_API_KEY'] || '',
    model: process.env['LLM_MODEL'] || 'sentence-transformers/all-MiniLM-L6-v2'
  },
  huggingface: {
    apiKey: process.env['HUGGINGFACE_API_KEY'] || '',
    model: resolveHuggingFaceModel(),
    temperature: parseNumber(process.env['HUGGINGFACE_TEMPERATURE'], 0.7),
    maxTokens: parseNumber(process.env['HUGGINGFACE_MAX_TOKENS'], 1024),
    topP: parseNumber(process.env['HUGGINGFACE_TOP_P'], 0.9)
  },
  upload: {
    path: process.env['FILE_UPLOAD_PATH'] || './uploads',
    maxFileSize: Number.parseInt(process.env['MAX_FILE_SIZE'] || '52428800', 10)
  },
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  logLevel: process.env['LOG_LEVEL'] || 'info'
};

export default Object.freeze(config);


