import { Router } from 'express';
import { CollectionCenterController } from './collection-center.controller';
import { validate } from './pickup.validation';
import { createCollectionCenterSchema } from './collection-center.validation';
import { requireAuth } from '../middlewares/auth.middleware';

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
  validate(createCollectionCenterSchema),
  CollectionCenterController.createCollectionCenter
);

export default router;
