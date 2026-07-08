import { Router } from 'express';
import { CollectionCenterController } from './collection-center.controller';
import { validate } from './pickup.validation';
import { createCollectionCenterSchema } from './collection-center.validation';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

// GET /api/v1/collection-centers
router.get(
  '/',
  requireAuth,
  CollectionCenterController.listCollectionCenters
);

// POST /api/v1/collection-centers
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(createCollectionCenterSchema),
  CollectionCenterController.createCollectionCenter
);

export default router;
