import { logger } from './logger';
import { ContextChunk, ICitation } from '../types/chat';

/**
 * Extract citations from LLM response by matching page references with context chunks
 * @param response - LLM generated response text
 * @param contextChunks - Context chunks used for generation
 * @returns Array of citation objects
 */
const extractCitations = (response: string, contextChunks: ContextChunk[]): ICitation[] => {
  const citations: ICitation[] = [];

  if (!response || !contextChunks || contextChunks.length === 0) {
    return citations;
  }

  // Pattern to match page references: "page X", "Page X", "p. X", "pg. X"
  const pagePattern = /(?:page|Page|p\.|pg\.)\s*(\d+)/g;
  const matches = [...response.matchAll(pagePattern)];

  const referencedPages = new Set(matches.map(m => parseInt(m[1] || '0')));

  // Create citations from context chunks that match referenced pages
  contextChunks.forEach((chunk) => {
    const pageNum = chunk.metadata?.pageNumber;
    
    if (pageNum && referencedPages.has(pageNum)) {
      // Extract a snippet (first 150 chars)
      const snippet = (chunk.document || '').substring(0, 150).trim() + '...';

      citations.push({
        pdfId: chunk.metadata.pdfId,
        pageNumber: pageNum,
        snippet,
        ...(chunk.metadata.chunkIndex !== undefined && { chunkIndex: chunk.metadata.chunkIndex })
      });
    }
  });

  // If no specific page references found, include first chunk as general citation
  if (citations.length === 0 && contextChunks.length > 0) {
    const firstChunk = contextChunks[0];
    if (firstChunk) {
      const snippet = (firstChunk.document || '').substring(0, 150).trim() + '...';

      citations.push({
        pdfId: firstChunk.metadata.pdfId,
        pageNumber: firstChunk.metadata?.pageNumber || 1,
        snippet,
        ...(firstChunk.metadata.chunkIndex !== undefined && { chunkIndex: firstChunk.metadata.chunkIndex })
      });
    }
  }

  logger.debug(`Extracted ${citations.length} citations from response`);

  return citations;
};

export {
  extractCitations
};