import express from 'express';
import embeddingController from '../controllers/embeddingController';
import authenticate from '../middlewares/authenticate';
import validate from '../middlewares/requestValidator';
import Joi from 'joi';

const router = express.Router();

// All embedding routes require authentication
router.use(authenticate);

// Get service status
router.get('/embedding/status', embeddingController.getStatus);

// Test embedding
const testEmbeddingSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().optional()
  })
});

router.post('/embedding/test', validate(testEmbeddingSchema), embeddingController.testEmbedding);

// Get embedding count for a PDF
const embeddingCountSchema = Joi.object({
  params: Joi.object({
    pdfId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
  })
});

router.get('/embeddings/count/:pdfId', validate(embeddingCountSchema), embeddingController.getEmbeddingCount);

export default router;
