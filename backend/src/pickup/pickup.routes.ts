import { Router } from 'express';
import { PickupController } from './pickup.controller';
import { validate, createPickupSchema, getPickupsQuerySchema, updatePickupStatusSchema } from './pickup.validation';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/v1/pickups
router.post(
  '/',
  requireAuth,
  validate(createPickupSchema),
  PickupController.createPickup
);

// GET /api/v1/pickups
router.get(
  '/',
  requireAuth,
  validate(getPickupsQuerySchema),
  PickupController.listPickups
);

// GET /api/v1/pickups/:id
router.get(
  '/:id',
  requireAuth,
  PickupController.getPickupById
);

// PATCH /api/v1/pickups/:id/accept
router.patch(
  '/:id/accept',
  requireAuth,
  PickupController.acceptPickup
);

// PATCH /api/v1/pickups/:id/status
router.patch(
  '/:id/status',
  requireAuth,
  validate(updatePickupStatusSchema),
  PickupController.updatePickupStatus
);

// PATCH /api/v1/pickups/:id/verify
router.patch(
  '/:id/verify',
  requireAuth,
  PickupController.verifyPickupStub
);

export default router;
