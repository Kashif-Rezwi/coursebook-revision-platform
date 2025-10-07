import logger from './logger';

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  minChunkSize: number;
}

export interface TextChunk {
  text: string;
  index: number;
  startChar: number;
  endChar: number;
}

export const DEFAULT_OPTIONS: ChunkOptions = {
  chunkSize: 800,
  chunkOverlap: 200,
  minChunkSize: 100
};

/**
 * Split text into chunks with overlap for better context preservation
 * @param text - Text to chunk
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export const chunkText = (text: string, options: Partial<ChunkOptions> = {}): TextChunk[] => {
  const { chunkSize, chunkOverlap, minChunkSize } = { ...DEFAULT_OPTIONS, ...options };
  
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // Try to find sentence boundary near the end
    if (endIndex < text.length) {
      const sentenceEnd = text.lastIndexOf('.', endIndex);
      const questionEnd = text.lastIndexOf('?', endIndex);
      const exclamationEnd = text.lastIndexOf('!', endIndex);
      
      const boundary = Math.max(sentenceEnd, questionEnd, exclamationEnd);
      
      // Use sentence boundary if it's not too far back
      if (boundary > startIndex + minChunkSize) {
        endIndex = boundary + 1;
      }
    }
    
    const chunkText = text.substring(startIndex, endIndex).trim();
    
    if (chunkText.length >= minChunkSize) {
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        startChar: startIndex,
        endChar: endIndex
      });
      chunkIndex++;
    }
    
    // Move to next chunk with overlap
    startIndex = endIndex - chunkOverlap;
    
    // Avoid infinite loop
    if (startIndex >= text.length) break;
  }
  
  logger.info(`Text chunked into ${chunks.length} segments`);
  
  return chunks;
};

/**
 * Estimate page number for a chunk based on character position
 * @param chunkStartChar - Starting character position of the chunk
 * @param totalChars - Total characters in the document
 * @param totalPages - Total pages in the document
 * @returns Estimated page number
 */
export const estimatePageNumber = (chunkStartChar: number, totalChars: number, totalPages: number): number => {
  if (totalPages === 0 || totalChars === 0) return 1;
  const ratio = chunkStartChar / totalChars;
  return Math.max(1, Math.ceil(ratio * totalPages));
};
