const dotenv = require('dotenv');

// Load .env file
dotenv.config();

// Validate required variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'REDIS_URL', 'LLM_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

/**
 * Application configuration derived from environment variables.
 * The object is frozen to prevent runtime mutation.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT, 10) || 3001,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '7d'
  },
  redisUrl: process.env.REDIS_URL,
  chroma: {
    host: process.env.CHROMADB_HOST || 'localhost',
    port: Number.parseInt(process.env.CHROMADB_PORT, 10) || 8000
  },
  llm: {
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-4'
  },
  upload: {
    path: process.env.FILE_UPLOAD_PATH || './uploads',
    maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info'
};

module.exports = Object.freeze(config);


