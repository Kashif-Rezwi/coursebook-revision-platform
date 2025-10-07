import NodeCache from 'node-cache';
import logger from './logger';

// Cache configuration
const cacheConfig = {
  stdTTL: 3600, // 1 hour default TTL
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Don't clone objects for better performance
};

// Create cache instances for different data types
const chatCache = new NodeCache({ ...cacheConfig, stdTTL: 1800 }); // 30 minutes for chats
const pdfCache = new NodeCache({ ...cacheConfig, stdTTL: 3600 }); // 1 hour for PDFs
const embeddingCache = new NodeCache({ ...cacheConfig, stdTTL: 7200 }); // 2 hours for embeddings

/**
 * Cache utility for managing different types of cached data
 */
class CacheManager {
  /**
   * Get cached chat data
   */
  getChat(key: string): any | undefined {
    return chatCache.get(key);
  }

  /**
   * Set cached chat data
   */
  setChat(key: string, data: any, ttl?: number): boolean {
    return chatCache.set(key, data, ttl || cacheConfig.stdTTL);
  }

  /**
   * Get cached PDF data
   */
  getPDF(key: string): any | undefined {
    return pdfCache.get(key);
  }

  /**
   * Set cached PDF data
   */
  setPDF(key: string, data: any, ttl?: number): boolean {
    return pdfCache.set(key, data, ttl || cacheConfig.stdTTL);
  }

  /**
   * Get cached embedding data
   */
  getEmbedding(key: string): any | undefined {
    return embeddingCache.get(key);
  }

  /**
   * Set cached embedding data
   */
  setEmbedding(key: string, data: any, ttl?: number): boolean {
    return embeddingCache.set(key, data, ttl || cacheConfig.stdTTL);
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    chatCache.del(key);
    pdfCache.del(key);
    embeddingCache.del(key);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    chatCache.flushAll();
    pdfCache.flushAll();
    embeddingCache.flushAll();
    logger.info('All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): any {
    return {
      chat: chatCache.getStats(),
      pdf: pdfCache.getStats(),
      embedding: embeddingCache.getStats()
    };
  }
}

export default new CacheManager();
