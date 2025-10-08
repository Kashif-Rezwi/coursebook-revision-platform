import { ChromaClient } from 'chromadb';
import { logger } from '../utils/logger';
import config from './env';

// Define minimal interface for ChromaDB collection operations
// This provides type safety while avoiding brittle external library types
interface ChromaCollection {
  add(params: {
    ids: string[];
    embeddings: number[][];
    documents: string[];
    metadatas: Array<{
      pdfId: string;
      chunkIndex: number;
      startChar: number;
      endChar: number;
    }>;
  }): Promise<void>;
  
  query(params: {
    queryEmbeddings: number[][];
    nResults: number;
    where?: {
      pdfId: { $in: string[] };
    };
  }): Promise<{
    ids: string[][];
    documents: string[][];
    metadatas: Array<Array<{
      pdfId: string;
      chunkIndex: number;
      startChar: number;
      endChar: number;
    }>>;
    distances: number[][];
  }>;
  
  delete(params: {
    where: {
      pdfId: string;
    };
  }): Promise<void>;
  
  get(params: {
    where: { pdfId: string };
    limit: number;
  }): Promise<{
    ids: string[];
    documents: string[];
    metadatas: Array<{
      pdfId: string;
      chunkIndex: number;
      startChar: number;
      endChar: number;
    }>;
  }>;
}

let client: ChromaClient | null = null;
let collection: ChromaCollection | null = null;

/**
 * Initialize ChromaDB client and collection
 */
const initChromaDB = async (): Promise<ChromaCollection | null> => {
  try {
    client = new ChromaClient({
      path: `http://${config.chromadbHost}:${config.chromadbPort}`
    });
    
    // Get or create collection - cast to our interface for type safety
    const rawCollection = await client.getOrCreateCollection({
      name: config.chromadbCollection,
      metadata: { description: 'PDF chunk embeddings for RAG' }
    });
    
    // Cast to our interface to ensure type safety
    collection = rawCollection as unknown as ChromaCollection;
    
    logger.info('ChromaDB initialized successfully');
    return collection;
  } catch (error) {
    logger.error('ChromaDB initialization failed:', error);
    // Don't exit process - allow app to run without ChromaDB for now
    return null;
  }
};

/**
 * Get ChromaDB collection (lazy initialization)
 */
const getCollection = async (): Promise<ChromaCollection | null> => {
  if (!collection) {
    await initChromaDB();
  }
  return collection;
};

export { initChromaDB, getCollection };
