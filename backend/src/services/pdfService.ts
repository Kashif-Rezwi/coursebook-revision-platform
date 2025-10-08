import { PDF } from '../models';
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

class PDFService {

  /**
   * Upload PDF file and create processing job
   */
  async upload(file: Express.Multer.File, userId: string): Promise<{pdf: any, jobId: string}> {
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
   */
  async getUserPDFs(userId: string, filters: PDFFilters = {}): Promise<PDFListResult> {
    const { status, limit = 50, skip = 0, sortBy = '-createdAt', ...otherFilters } = filters;
    
    const queryFilters: any = { ...otherFilters };
    if (status) {
      queryFilters.status = status;
    }

    // Optimized field selection for list view
    const selectFields = 'filename originalName fileSize status pageCount createdAt updatedAt isSeeded';
    
    const [pdfs, total] = await Promise.all([
      PDF.find({ userId, ...queryFilters })
        .select(selectFields)
        .sort(sortBy)
        .limit(limit)
        .skip(skip)
        .lean(), // Use lean() for better performance
      PDF.countDocuments({ userId, ...queryFilters })
    ]);

    return {
      pdfs,
      total,
      limit,
      skip
    };
  }

  /**
   * Find PDF by ID with user ownership validation
   */
  async findById(pdfId: string, userId: string): Promise<any> {
    try {
      const pdf = await PDF.findOne({ _id: pdfId, userId });
      if (!pdf) {
        throw ApiError.notFound('PDF not found', 'PDF_NOT_FOUND');
      }
      return pdf;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest('Invalid PDF ID', 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Delete PDF and cleanup associated data
   */
  async remove(pdfId: string, userId: string): Promise<{message: string, id: string}> {
    try {
      const pdf = await this.findById(pdfId, userId);

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
      const updateData: any = { status };
      if (error) {
        updateData.processingError = error;
      }

      const pdf = await PDF.findByIdAndUpdate(
        pdfId,
        { $set: updateData },
        { new: true, runValidators: true }
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

  /**
   * Calculate file size in MB (moved from model virtual)
   */
  getFileSizeMB(fileSize: number): string {
    return (fileSize / (1024 * 1024)).toFixed(2);
  }
}

export default new PDFService();
