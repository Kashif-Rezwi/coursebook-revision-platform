import { PDF } from '../models';
import { BaseService, DeleteResult } from './BaseService';
import pdfRepository from '../repositories/PDFRepository';
import { addPDFProcessingJob } from '../queues/pdfProcessingQueue';
import { deleteFile } from '../utils/fileStorage';
import chromaHelper from '../utils/chromaHelper';
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

class PDFService extends BaseService<any> {
  constructor() {
    super(PDF, 'PDF');
  }

  /**
   * Upload PDF file and create processing job
   */
  async upload(file: Express.Multer.File, userId: string): Promise<{pdf: any, jobId: string}> {
    try {
      // Create PDF document
      const pdf = await this.model.create({
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
   */
  async getUserPDFs(userId: string, filters: PDFFilters = {}): Promise<PDFListResult> {
    return pdfRepository.getUserPDFs(userId, filters);
  }

  /**
   * Delete PDF and cleanup associated data
   */
  override async remove(pdfId: string, userId: string): Promise<DeleteResult> {
    try {
      const pdf = await this.findById(pdfId, userId);

      // Delete file from filesystem
      if (pdf.filePath) {
        deleteFile(pdf.filePath);
      }

      // Delete embeddings from ChromaDB
      await chromaHelper.deleteEmbeddings(pdfId);

      // Delete PDF document
      await this.model.findByIdAndDelete(pdfId);

      logger.info(`PDF deleted: ${pdfId} by user ${userId}`);

      return {
        message: 'PDF deleted successfully',
        id: pdfId
      };
    } catch (error) {
      logger.error('PDF deletion failed:', error as any);
      throw error;
    }
  }

  /**
   * Update PDF processing status
   */
  async updateStatus(pdfId: string, status: string, error?: string): Promise<any> {
    try {
      const pdf = await pdfRepository.updateStatus(pdfId, status, error);
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
