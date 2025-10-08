import { ChromaClient } from 'chromadb';
import { logger } from '../utils/logger';
import config from './env';

// Use any type for ChromaDB collection to avoid complex type definitions
type ChromaCollection = any;

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
    
    // Get or create collection
    collection = await client.getOrCreateCollection({
      name: config.chromadbCollection,
      metadata: { description: 'PDF chunk embeddings for RAG' }
    });
    
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
