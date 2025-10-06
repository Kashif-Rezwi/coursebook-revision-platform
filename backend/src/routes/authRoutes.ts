import express from 'express';
import authController from '../controllers/authController';
import authenticate from '../middlewares/authenticate';
import validate from '../middlewares/requestValidator';
import { registerSchema, loginSchema } from '../validators/authValidator';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

export default router;