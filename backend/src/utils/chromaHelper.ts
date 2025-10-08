import { getCollection } from '../config/chromadb';
import { logger } from './logger';
import { ApiError } from './apiError';
import { TextChunk } from './textChunker';

export interface ChromaResult {
  id: string;
  document: string;
  metadata: {
    pdfId: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
  distance: number;
}

class ChromaHelper {
  /**
   * Add embeddings to ChromaDB collection
   * @param pdfId - PDF document ID
   * @param chunks - Array of text chunks
   * @param embeddings - Array of embedding vectors
   * @returns Promise<{count: number, pdfId: string}>
   */
  async addEmbeddings(pdfId: string, chunks: TextChunk[], embeddings: number[][]): Promise<{count: number, pdfId: string}> {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      // Prepare data for ChromaDB
      const ids = chunks.map(chunk => `${pdfId}_chunk_${chunk.index}`);
      const documents = chunks.map(chunk => chunk.text);
      const metadatas = chunks.map(chunk => ({
        pdfId: pdfId.toString(),
        chunkIndex: chunk.index,
        startChar: chunk.startChar,
        endChar: chunk.endChar
      }));

      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      logger.info(`Added ${chunks.length} embeddings for PDF ${pdfId}`);
      
      return {
        count: chunks.length,
        pdfId
      };
    } catch (error) {
      logger.error('Failed to add embeddings to ChromaDB:', error);
      throw ApiError.internal('Failed to store embeddings', 'CHROMA_ADD_ERROR');
    }
  }

  /**
   * Query similar embeddings from ChromaDB
   * @param queryEmbedding - Query embedding vector
   * @param pdfIds - Optional array of PDF IDs to filter by
   * @param limit - Maximum number of results to return
   * @returns Promise<ChromaResult[]>
   */
  async queryEmbeddings(queryEmbedding: number[], pdfIds: string[] | null = null, limit: number = 5): Promise<ChromaResult[]> {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      const queryParams: any = {
        queryEmbeddings: [queryEmbedding],
        nResults: limit
      };

      // Filter by pdfIds if provided
      if (pdfIds && pdfIds.length > 0) {
        queryParams.where = {
          pdfId: { $in: pdfIds.map(id => id.toString()) }
        };
      }

      const results = await collection.query(queryParams);

      logger.debug(`Queried ChromaDB, found ${results.ids[0].length} results`);

      // Format results
      const formattedResults: ChromaResult[] = results.ids[0].map((id: string, index: number) => ({
        id,
        document: results.documents[0][index],
        metadata: results.metadatas[0][index],
        distance: results.distances[0][index]
      }));

      return formattedResults;
    } catch (error) {
      logger.error('Failed to query ChromaDB:', error);
      throw ApiError.internal('Failed to query embeddings', 'CHROMA_QUERY_ERROR');
    }
  }

  /**
   * Delete all embeddings for a specific PDF
   * @param pdfId - PDF document ID
   * @returns Promise<{success: boolean, pdfId: string}>
   */
  async deleteEmbeddings(pdfId: string): Promise<{success: boolean, pdfId: string}> {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        throw new Error('ChromaDB collection not initialized');
      }

      await collection.delete({
        where: { pdfId: pdfId.toString() }
      });

      logger.info(`Deleted embeddings for PDF ${pdfId}`);
      
      return { success: true, pdfId };
    } catch (error) {
      logger.error('Failed to delete embeddings from ChromaDB:', error);
      throw ApiError.internal('Failed to delete embeddings', 'CHROMA_DELETE_ERROR');
    }
  }

  /**
   * Get count of embeddings for a specific PDF
   * @param pdfId - PDF document ID
   * @returns Promise<number>
   */
  async getEmbeddingCount(pdfId: string): Promise<number> {
    try {
      const collection = await getCollection();
      
      if (!collection) {
        return 0;
      }

      const results = await collection.get({
        where: { pdfId: pdfId.toString() }
      });

      return results.ids.length;
    } catch (error) {
      logger.error('Failed to get embedding count:', error);
      return 0;
    }
  }
}

const chromaHelper = new ChromaHelper();
export { chromaHelper };
