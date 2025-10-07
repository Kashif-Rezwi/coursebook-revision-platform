import express from 'express';
import pdfController from '../controllers/pdfController';
import authenticate from '../middlewares/authenticate';
import upload from '../config/multer';
import validate from '../middlewares/requestValidator';
import { getPDFsSchema, pdfIdSchema } from '../validators/pdfValidator';

const router = express.Router();

// All PDF routes require authentication
router.use(authenticate);

// Upload PDF
router.post('/pdfs/upload', upload.single('file'), pdfController.uploadPDF);

// Get user's PDFs
router.get('/pdfs', validate(getPDFsSchema), pdfController.getUserPDFs);

// Get single PDF
router.get('/pdfs/:pdfId', validate(pdfIdSchema), pdfController.getPDF);

// Delete PDF
router.delete('/pdfs/:pdfId', validate(pdfIdSchema), pdfController.deletePDF);

export default router;
