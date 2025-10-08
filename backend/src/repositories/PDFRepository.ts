import { PDF } from '../models';
import { BaseRepository } from './BaseRepository';

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

class PDFRepository extends BaseRepository<any> {
  constructor() {
    super(PDF, 'PDF');
  }

  /**
   * Get user's PDFs with filtering
   */
  async getUserPDFs(userId: string, filters: PDFFilters = {}): Promise<PDFListResult> {
    const { status, ...otherFilters } = filters;
    
    const queryFilters: any = { ...otherFilters };
    if (status) {
      queryFilters.status = status;
    }

    const result = await this.findMany(userId, {
      ...queryFilters,
      select: '-__v'
    });

    return {
      pdfs: result.items,
      total: result.total,
      limit: result.limit,
      skip: result.skip
    };
  }

  /**
   * Update PDF status
   */
  async updateStatus(pdfId: string, status: string, error?: string): Promise<any> {
    const updateData: any = { status };
    if (error) {
      updateData.processingError = error;
    }

    return this.updateById(pdfId, '', updateData); // No userId check for status updates
  }

  /**
   * Find PDF by ID without user check (for status updates)
   */
  async findByIdNoUser(pdfId: string): Promise<any> {
    try {
      return await this.model.findById(pdfId);
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw new Error('Invalid PDF ID');
      }
      throw error;
    }
  }
}

export default new PDFRepository();
