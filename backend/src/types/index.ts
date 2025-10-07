import { Request, Response, NextFunction } from 'express';

// Environment configuration interface
export interface Config {
  env: string;
  port: number;
  mongodbUri: string;
  jwt: {
    secret: string;
    expire: string;
  };
  redisUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  chromadbHost: string;
  chromadbPort: number;
  llm: {
    apiKey: string;
    model: string;
  };
  huggingface: {
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  upload: {
    path: string;
    maxFileSize: number;
  };
  corsOrigin: string;
  logLevel: string;
}

// API Response interfaces
export interface SuccessResponse {
  success: true;
  message: string;
  data?: any;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: ValidationErrorDetail[];
  };
  timestamp: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// Custom Error interface
export interface ApiErrorInterface extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  timestamp: string;
  details?: ValidationErrorDetail[] | undefined;
}

// Express middleware types
export type AsyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;

export type RequestValidator = (schema: any) => (req: Request, res: Response, next: NextFunction) => void;

export type ErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => void;

export type NotFoundHandler = (req: Request, res: Response, next: NextFunction) => void;

export type RequestLogger = (req: Request, res: Response, next: NextFunction) => void;

// Joi validation schema type
export interface ValidationSchema {
  body?: any;
  query?: any;
  params?: any;
}

// Multer error types
export interface MulterError extends Error {
  code: string;
  field?: string;
  storageErrors?: Error[];
}

// Log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

// Environment variables
export interface EnvVars {
  NODE_ENV?: string;
  PORT?: string;
  MONGODB_URI?: string;
  JWT_SECRET?: string;
  JWT_EXPIRE?: string;
  REDIS_URL?: string;
  CHROMADB_HOST?: string;
  CHROMADB_PORT?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  HUGGINGFACE_API_KEY?: string;
  HUGGINGFACE_MODEL?: string;
  DEFAULT_TEXT_GEN_MODEL?: string;
  TEXT_GEN_MODEL_SMALL?: string;
  TEXT_GEN_MODEL_MEDIUM?: string;
  TEXT_GEN_MODEL_LARGE?: string;
  CHAT_MODEL_EDUCATION?: string;
  HUGGINGFACE_TEMPERATURE?: string;
  HUGGINGFACE_MAX_TOKENS?: string;
  HUGGINGFACE_TOP_P?: string;
  FILE_UPLOAD_PATH?: string;
  MAX_FILE_SIZE?: string;
  CORS_ORIGIN?: string;
  LOG_LEVEL?: string;
}
