// Base interfaces for chat system
export interface PopulatedPDF {
  _id: string;
  originalName: string;
  pageCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ICitation[];
  timestamp: Date;
}

export interface ICitation {
  pdfId: string;
  pageNumber?: number;
  snippet?: string;
  chunkIndex?: number;
}

export interface ContextChunk {
  document: string;
  metadata: {
    pdfId: string;
    pageNumber?: number;
    chunkIndex?: number;
    startChar?: number;
  };
}

export interface ChatFilters {
  limit?: number;
  skip?: number;
  sortBy?: string;
}

export interface ChatListResult {
  chats: any[]; // Will be populated with IChat from models
  total: number;
  limit: number;
  skip: number;
}

export interface RAGOptions {
  streaming?: boolean;
  contextLimit?: number;
}

export interface RAGResult {
  answer?: string;
  citations: ICitation[];
  contextChunks: ContextChunk[];
  stream?: AsyncGenerator<string, void, unknown>;
}

export interface GenerationOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// Constants
export const MAX_CHAT_HISTORY = 20; // Maximum messages to keep in context
export const MAX_PDFS_PER_CHAT = 10; // Maximum PDFs per chat
export const MIN_MESSAGE_LENGTH = 3; // Minimum meaningful message length
export const MAX_MESSAGE_LENGTH = 5000; // Maximum message length
