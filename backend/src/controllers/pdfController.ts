import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import pdfService from '../services/pdfService';
import { successResponse } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/apiError';

class PDFController {
  /**
   * Upload PDF file
   */
  uploadPDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!(req as any).file) {
      throw ApiError.badRequest('No file uploaded', 'NO_FILE');
    }

    const result = await pdfService.uploadPDF((req as any).file, req.user!.userId);

    return successResponse(
      res,
      201,
      'PDF uploaded successfully and processing started',
      result
    );
  });

  /**
   * Get user's PDFs with filtering and pagination
   */
  getUserPDFs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = {
      status: (req.query as any)['status'] as string,
      limit: req.query?.['limit'] ? parseInt((req.query as any)['limit'] as string) : undefined,
      skip: req.query?.['skip'] ? parseInt((req.query as any)['skip'] as string) : undefined,
      sortBy: (req.query as any)['sortBy'] as string
    } as any;

    const result = await pdfService.getUserPDFs(req.user!.userId, filters);

    return successResponse(
      res,
      200,
      'PDFs retrieved successfully',
      result
    );
  });

  /**
   * Get single PDF by ID
   */
  getPDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pdfId = (req.params as any)['pdfId'] as string;
    const pdf = await pdfService.getPDFById(pdfId, req.user!.userId);

    return successResponse(
      res,
      200,
      'PDF retrieved successfully',
      { pdf }
    );
  });

  /**
   * Delete PDF
   */
  deletePDF = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pdfId = (req.params as any)['pdfId'] as string;
    const result = await pdfService.deletePDF(pdfId, req.user!.userId);

    return successResponse(
      res,
      200,
      'PDF deleted successfully',
      result
    );
  });
}

export default new PDFController();
