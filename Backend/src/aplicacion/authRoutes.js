import { Router } from 'express';
import { AuthController } from './authController.js';

const router = Router();
const authController = new AuthController();

// POST /api/auth/login
router.post('/login', (req, res) => authController.login(req, res));

export default router;
