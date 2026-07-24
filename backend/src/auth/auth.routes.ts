import { Router } from 'express';
import { register, login, logout } from './auth.controller';
import { validate, registerSchema, loginSchema } from './auth.validation';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', requireAuth, logout);

export default router;
