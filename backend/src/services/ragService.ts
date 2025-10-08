import aiService from './aiService';
import { chromaHelper } from '../utils/chromaHelper';
import { extractCitations } from '../utils/citationExtractor';
import { PDF } from '../models';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';
import { ContextChunk, ChatMessage, RAGOptions, RAGResult } from '../types/chat';
import CacheService from './CacheService';
import { AI_LIMITS, CACHE_TTL } from '../utils/constants';

/**
 * RAG Service for implementing Retrieval-Augmented Generation pipeline
 * Handles query processing, context retrieval, and response generation
 */
class RAGService {
  /**
   * Process a query through the complete RAG pipeline
   * @param query - User's question
   * @param pdfIds - Array of PDF IDs to search in (optional)
   * @param chatHistory - Previous chat messages for context
   * @param options - RAG processing options
   * @returns RAG result with answer, citations, and context
   */
  async processQuery(
    query: string, 
    pdfIds: string[] | null = null, 
    chatHistory: ChatMessage[] = [], 
    options: RAGOptions = {}
  ): Promise<RAGResult> {
    try {
      const { streaming = false, contextLimit = AI_LIMITS.DEFAULT_CONTEXT_LIMIT } = options;

      logger.info('Service: processQuery - Processing RAG query', { 
        queryLength: query.length,
        pdfIds: pdfIds?.length || 0,
        contextLimit 
      });

      // Step 1: Retrieve context
      const contextChunks = await this.retrieveContext(query, pdfIds, contextLimit);

      if (contextChunks.length === 0) {
        logger.warn('Service: processQuery - No relevant context found', { 
          queryLength: query.length,
          pdfIds: pdfIds?.length || 0 
        });
        return {
          answer: "I couldn't find relevant information in the uploaded PDFs to answer your question. Please make sure the PDFs contain information related to your query.",
          citations: [],
          contextChunks: []
        };
      }

      logger.info('Service: processQuery - Context chunks retrieved', { 
        contextChunksCount: contextChunks.length 
      });

      // Step 2: Enrich context with page numbers
      const enrichedContext = await this.enrichContextWithPageNumbers(contextChunks, pdfIds);

      // Step 3: Build prompt
      const prompt = aiService.buildRAGPrompt(query, enrichedContext, chatHistory);

      // Step 4: Generate response
      if (streaming) {
        // Return generator for streaming
        return {
          stream: aiService.generateStreamingText(prompt),
          contextChunks: enrichedContext,
          citations: []
        };
      } else {
        const answer = await aiService.generateText(prompt);
        
        // Step 5: Extract citations
        const citations = extractCitations(answer, enrichedContext);

        logger.info('Service: processQuery - RAG query processed successfully', { 
          citationsCount: citations.length,
          answerLength: answer.length 
        });

        return {
          answer,
          citations,
          contextChunks: enrichedContext
        };
      }
    } catch (error) {
      logger.error('Service error in processQuery', error);
      throw ApiError.internal('Failed to process query', 'RAG_PROCESS_ERROR');
    }
  }

  /**
   * Retrieve relevant context chunks from ChromaDB
   * @param query - User's question
   * @param pdfIds - Array of PDF IDs to search in (optional)
   * @param limit - Maximum number of chunks to retrieve
   * @returns Array of context chunks
   */
  async retrieveContext(query: string, pdfIds: string[] | null, limit: number = AI_LIMITS.DEFAULT_CONTEXT_LIMIT): Promise<ContextChunk[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await aiService.generateEmbedding(query);

      // Search ChromaDB with the embedding
      const results = await chromaHelper.queryEmbeddings(queryEmbedding, pdfIds, limit);

      return this.convertToContextChunks(results);
    } catch (error) {
      logger.error('Service error in retrieveContext', error);
      throw ApiError.internal('Failed to retrieve context', 'RAG_CONTEXT_ERROR');
    }
  }

  /**
   * Convert ChromaDB results to context chunks
   */
  private convertToContextChunks(results: any[]): ContextChunk[] {
    return results.map(result => ({
      document: result.document,
      metadata: {
        pdfId: result.metadata.pdfId,
        chunkIndex: result.metadata.chunkIndex,
        startChar: result.metadata.startChar
      }
    }));
  }

  /**
   * Enrich context chunks with estimated page numbers
   * @param chunks - Context chunks to enrich
   * @param pdfIds - Array of PDF IDs for page count lookup
   * @returns Enriched context chunks with page numbers
   */
  async enrichContextWithPageNumbers(chunks: ContextChunk[], pdfIds: string[] | null): Promise<ContextChunk[]> {
    try {
      // Get PDF documents to calculate page numbers
      const pdfMap: { [key: string]: any } = {};
      
      if (pdfIds && pdfIds.length > 0) {
        // Check cache for PDF data first
        const uncachedPdfIds: string[] = [];
        for (const pdfId of pdfIds) {
          const cacheKey = `pdf:${pdfId}`;
          const cachedPdf = CacheService.get<any>(cacheKey);
          if (cachedPdf) {
            pdfMap[pdfId] = cachedPdf;
          } else {
            uncachedPdfIds.push(pdfId);
          }
        }

        // Fetch uncached PDFs from database
        if (uncachedPdfIds.length > 0) {
          const pdfs = await PDF.find({ _id: { $in: uncachedPdfIds } }).select('_id pageCount');
          pdfs.forEach(pdf => {
            const pdfId = (pdf._id as any).toString();
            pdfMap[pdfId] = pdf;
            // Cache for 1 hour
            CacheService.set(`pdf:${pdfId}`, pdf, CACHE_TTL.VERY_LONG);
          });
        }
      }

      // Enrich each chunk with estimated page number
      const enrichedChunks = chunks.map(chunk => {
        const pdfId = chunk.metadata.pdfId;
        const pdf = pdfMap[pdfId];
        
        let pageNumber = 1;
        if (pdf && chunk.metadata.startChar) {
          // Estimate page based on character position
          // This is approximate - real page numbers would need PDF parsing
          const charsPerPage = 2000; // Average characters per page
          pageNumber = Math.ceil(chunk.metadata.startChar / charsPerPage);
          pageNumber = Math.min(pageNumber, pdf.pageCount);
        }

        return {
          ...chunk,
          metadata: {
            ...chunk.metadata,
            pageNumber
          }
        };
      });

      return enrichedChunks;
    } catch (error) {
      logger.error('Context enrichment failed', error);
      // Return chunks without page numbers if enrichment fails
      return chunks;
    }
  }
}

export default new RAGService();
