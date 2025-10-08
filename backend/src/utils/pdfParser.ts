import fs from 'fs';
import pdf from 'pdf-parse';
import { logger } from './logger';
import { ApiError } from './apiError';

export interface PDFParseResult {
  text: string;
  numpages: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
  };
}

/**
 * Parse PDF file and extract text content and metadata
 * @param filePath - Path to the PDF file
 * @returns Promise<PDFParseResult> - Parsed PDF data
 */
export const parsePDF = async (filePath: string): Promise<PDFParseResult> => {
  try {
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF
    const data = await pdf(dataBuffer);
    
    logger.info(`PDF parsed successfully: ${data.numpages} pages`);
    
    return {
      text: data.text,
      numpages: data.numpages,
      info: data.info || {}
    };
  } catch (error) {
    logger.error('PDF parsing failed:', error);
    throw ApiError.internal('Failed to parse PDF', 'PDF_PARSE_ERROR');
  }
};
