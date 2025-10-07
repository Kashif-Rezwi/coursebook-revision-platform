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

export default router;
