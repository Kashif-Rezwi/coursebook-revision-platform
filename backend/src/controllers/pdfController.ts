import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import pdfService from '../services/pdfService';
import { respondCreated, respondData } from '../utils/apiResponse';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/apiError';
import { getUserId, createFilters, getParam } from '../utils/requestHelpers';

export const pdfController = {
  /**
   * Upload PDF file
   */
  uploadPDF: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!(req as any).file) {
      throw ApiError.badRequest('No file uploaded', 'NO_FILE');
    }

    const result = await pdfService.upload((req as any).file, getUserId(req));

    return respondCreated(res, result, 'PDF uploaded successfully and processing started');
  }),

  /**
   * Get user's PDFs with filtering and pagination
   */
  getUserPDFs: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const filters = createFilters(req);
    const result = await pdfService.getUserPDFs(getUserId(req), filters);

    return respondData(res, result, 'PDFs retrieved successfully');
  }),

  /**
   * Get single PDF by ID
   */
  getPDF: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pdfId = getParam(req, 'pdfId');
    const pdf = await pdfService.findById(pdfId, getUserId(req));

    return respondData(res, { pdf }, 'PDF retrieved successfully');
  }),

  /**
   * Delete PDF
   */
  deletePDF: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pdfId = getParam(req, 'pdfId');
    const result = await pdfService.remove(pdfId, getUserId(req));

    return respondData(res, result, 'PDF deleted successfully');
  })
};

export default pdfController;
