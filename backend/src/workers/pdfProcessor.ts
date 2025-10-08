import Queue from 'bull';
import { PDF } from '../models';
import { parsePDF } from '../utils/pdfParser';
import { chunkText } from '../utils/textChunker';
import embeddingService from '../services/embeddingService';
import { chromaHelper } from '../utils/chromaHelper';
import { logger } from '../utils/logger';

class PDFProcessor {
  async processPDF(job: Queue.Job) {
    const { pdfId, filePath } = job.data;

    try {
      // Update status to processing
      await PDF.findByIdAndUpdate(pdfId, {
        status: 'processing',
        processingError: null
      });

      job.progress(10);
      logger.info(`PDF ${pdfId}: Status updated to processing`);

      // Step 1: Parse PDF
      job.progress(20);
      logger.info(`PDF ${pdfId}: Parsing PDF`);
      const pdfData = await parsePDF(filePath);

      // Update page count and metadata
      await PDF.findByIdAndUpdate(pdfId, {
        pageCount: pdfData.numpages,
        'metadata.title': pdfData.info.Title,
        'metadata.author': pdfData.info.Author,
        'metadata.subject': pdfData.info.Subject,
        'metadata.keywords': pdfData.info.Keywords ? pdfData.info.Keywords.split(',').map((k: string) => k.trim()) : []
      });

      job.progress(30);

      // Step 2: Chunk text
      logger.info(`PDF ${pdfId}: Chunking text`);
      const chunks = chunkText(pdfData.text);

      if (chunks.length === 0) {
        throw new Error('No text content found in PDF');
      }

      job.progress(40);
      logger.info(`PDF ${pdfId}: Created ${chunks.length} chunks`);

      // Step 3: Generate embeddings
      logger.info(`PDF ${pdfId}: Generating embeddings using ${embeddingService.getCurrentMethod()}`);
      const chunkTexts = chunks.map(chunk => chunk.text);
      const embeddings = await embeddingService.generateBatchEmbeddings(chunkTexts);

      job.progress(70);
      logger.info(`PDF ${pdfId}: Generated ${embeddings.length} embeddings`);

      // Step 4: Store in ChromaDB
      logger.info(`PDF ${pdfId}: Storing embeddings in ChromaDB`);
      await chromaHelper.addEmbeddings(pdfId, chunks, embeddings);

      job.progress(90);

      // Step 5: Update PDF status to ready
      await PDF.findByIdAndUpdate(
        pdfId,
        {
          status: 'ready',
          'embeddingStats.totalChunks': chunks.length,
          'embeddingStats.embeddedChunks': embeddings.length,
          'embeddingStats.lastProcessedAt': new Date()
        },
        { new: true }
      );

      job.progress(100);
      logger.info(`PDF ${pdfId}: Processing completed successfully`);

      return {
        success: true,
        pdfId,
        chunksProcessed: chunks.length,
        pageCount: pdfData.numpages
      };

    } catch (error) {
      logger.error(`PDF ${pdfId}: Processing failed`, error);

      // Update PDF status to failed
      await PDF.findByIdAndUpdate(pdfId, {
        status: 'failed',
        processingError: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }
}

export default new PDFProcessor();
