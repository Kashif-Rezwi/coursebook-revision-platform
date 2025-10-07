import { PDF } from '../models';
import { addPDFProcessingJob } from '../queues/pdfProcessingQueue';
import { deleteFile } from '../utils/fileStorage';
import chromaHelper from '../utils/chromaHelper';
// embeddingService is used in worker, not directly here
import ApiError from '../utils/apiError';
import logger from '../utils/logger';

export interface PDFFilters {
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
}

export interface PDFListResult {
  pdfs: any[];
  total: number;
  limit: number;
  skip: number;
}

class PDFService {
  /**
   * Upload PDF file and create processing job
   * @param file - Multer file object
   * @param userId - User ID who uploaded the file
   * @returns Promise<{pdf: any, jobId: string}>
   */
  async uploadPDF(file: Express.Multer.File, userId: string): Promise<{pdf: any, jobId: string}> {
    try {
      // Create PDF document
      const pdf = await PDF.create({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'uploading'
      });

      logger.info(`PDF uploaded: ${pdf._id} by user ${userId}`);

      // Add to processing queue
      const job = await addPDFProcessingJob({
        pdfId: (pdf._id as any).toString(),
        userId: userId.toString(),
        filePath: file.path,
        fileSize: file.size
      });

      // Update PDF with job ID
      pdf.status = 'processing';
      await pdf.save();

      logger.info(`PDF processing job created: ${job.id} for PDF ${pdf._id}`);

      return {
        pdf,
        jobId: String(job.id)
      };
    } catch (error) {
      logger.error('PDF upload failed:', error as any);
      
      // Cleanup file if PDF creation failed
      if (file && file.path) {
        deleteFile(file.path);
      }
      
      throw ApiError.internal('Failed to upload PDF', 'PDF_UPLOAD_ERROR');
    }
  }

  /**
   * Get user's PDFs with filtering and pagination
   * @param userId - User ID
   * @param filters - Filter options
   * @returns Promise<PDFListResult>
   */
  async getUserPDFs(userId: string, filters: PDFFilters = {}): Promise<PDFListResult> {
    try {
      const { status, sortBy = '-createdAt' } = filters;
      const limit = (filters as any).limit ?? 50;
      const skip = (filters as any).skip ?? 0;

      const query: any = { userId };
      
      if (status) {
        query.status = status;
      }

      const pdfs = await PDF.find(query)
        .sort(sortBy)
        .limit(parseInt(limit.toString()))
        .skip(parseInt(skip.toString()))
        .select('-__v');

      const total = await PDF.countDocuments(query);

      return {
        pdfs,
        total,
        limit: parseInt(limit.toString()),
        skip: parseInt(skip.toString())
      };
    } catch (error) {
      logger.error('Failed to get user PDFs:', error as any);
      throw ApiError.internal('Failed to retrieve PDFs', 'PDF_RETRIEVAL_ERROR');
    }
  }

  /**
   * Get single PDF by ID
   * @param pdfId - PDF document ID
   * @param userId - User ID
   * @returns Promise<any>
   */
  async getPDFById(pdfId: string, userId: string): Promise<any> {
    try {
      const pdf = await PDF.findOne({ _id: pdfId, userId });

      if (!pdf) {
        throw ApiError.notFound('PDF not found', 'PDF_NOT_FOUND');
      }

      return pdf;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid PDF ID', 'INVALID_PDF_ID');
      }
      throw error;
    }
  }

  /**
   * Delete PDF and cleanup associated data
   * @param pdfId - PDF document ID
   * @param userId - User ID
   * @returns Promise<{message: string, pdfId: string}>
   */
  async deletePDF(pdfId: string, userId: string): Promise<{message: string, pdfId: string}> {
    try {
      const pdf = await this.getPDFById(pdfId, userId);

      // Delete file from filesystem
      if (pdf.filePath) {
        deleteFile(pdf.filePath);
      }

      // Delete embeddings from ChromaDB
      await chromaHelper.deleteEmbeddings(pdfId);

      // Delete PDF document
      await PDF.findByIdAndDelete(pdfId);

      logger.info(`PDF deleted: ${pdfId} by user ${userId}`);

      return {
        message: 'PDF deleted successfully',
        pdfId
      };
    } catch (error) {
      logger.error('PDF deletion failed:', error as any);
      throw error;
    }
  }

  /**
   * Update PDF processing status
   * @param pdfId - PDF document ID
   * @param status - New status
   * @param error - Error message if status is failed
   * @returns Promise<any>
   */
  async updatePDFStatus(pdfId: string, status: string, error?: string): Promise<any> {
    try {
      const updateData: any = { status };
      
      if (error) {
        updateData.processingError = error;
      }

      const pdf = await PDF.findByIdAndUpdate(
        pdfId,
        updateData,
        { new: true }
      );

      if (!pdf) {
        throw ApiError.notFound('PDF not found', 'PDF_NOT_FOUND');
      }

      logger.info(`PDF ${pdfId} status updated to ${status}`);

      return pdf;
    } catch (error) {
      logger.error('PDF status update failed:', error as any);
      throw error;
    }
  }
}

export default new PDFService();
