import express from 'express';
import quizController from '../controllers/quizController';
import authenticate from '../middlewares/authenticate';
import validate from '../middlewares/requestValidator';
import { createQuizSchema, submitQuizSchema, getQuizzesSchema, quizIdSchema } from '../validators/quizValidator';

const router = express.Router();

router.use(authenticate);

router.post('/quizzes', validate(createQuizSchema), quizController.createQuiz);
router.get('/quizzes', validate(getQuizzesSchema), quizController.getUserQuizzes);
router.get('/quizzes/:quizId', validate(quizIdSchema), quizController.getQuiz);
router.delete('/quizzes/:quizId', validate(quizIdSchema), quizController.deleteQuiz);

router.post('/quizzes/:quizId/submit', validate(submitQuizSchema), quizController.submitQuiz);
router.get('/quizzes/:quizId/attempts', validate(quizIdSchema), quizController.getQuizAttempts);

export default router;
