import { Router } from 'express';
import { UserController } from './user.controller';
import { validate, updateUserSchema, listUsersQuerySchema } from './user.validation';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

// GET /api/v1/users/me
router.get(
  '/me',
  requireAuth,
  UserController.getMe
);

// PATCH /api/v1/users/me
router.patch(
  '/me',
  requireAuth,
  validate(updateUserSchema),
  UserController.updateMe
);

// GET /api/v1/users/:id
router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  UserController.getUser
);

// GET /api/v1/users
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listUsersQuerySchema),
  UserController.listUsers
);

export default router;
