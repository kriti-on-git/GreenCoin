import { Request, Response, NextFunction } from 'express';
import { PickupService } from './pickup.service';
import { logger } from '../utils/logger';

export class PickupController {
  static async createPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const { pickupTime, device } = req.body;
      
      // We assume req.user is set by the auth middleware
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User context missing' });
      }

      const pickup = await PickupService.createPickup(userId, pickupTime, device);
      logger.info(`Pickup ${pickup._id} created by user ${userId}`);

      res.status(201).json({
        success: true,
        data: pickup,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPickupById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const pickup = await PickupService.getPickupById(id);

      if (!pickup) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Pickup not found',
        });
      }

      // Check if the user is authorized to view this pickup
      const userId = req.user?.id;
      const role = req.user?.role;
      
      if (role === 'user' && pickup.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You are not authorized to view this pickup',
        });
      }
      
      // Additional check for collectors if needed (they should only see accepted pickups assigned to them, or maybe all requested)
      // We'll enforce stricter collector checks in Task 2.

      res.status(200).json({
        success: true,
        data: pickup,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listPickups(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      
      // Role-based filtering constraints
      const userId = req.user?.id;
      const role = req.user?.role;

      if (role === 'user') {
        // Users can only list their own pickups
        filters.userId = userId;
      } else if (role === 'collector') {
        // For now, collectors might see all or filter by their own id.
        // We will respect query filters if provided.
      }

      if (req.query.userId && role !== 'user') filters.userId = req.query.userId as string;
      if (req.query.collectorId) filters.collectorId = req.query.collectorId as string;
      if (req.query.status) filters.status = req.query.status as any;

      const pickups = await PickupService.listPickups(filters);

      res.status(200).json({
        success: true,
        data: pickups,
      });
    } catch (error) {
      next(error);
    }
  }

  static async acceptPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const collectorId = req.user?.id;
      const role = req.user?.role;

      if (role !== 'collector' || !collectorId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only collectors can accept pickups',
        });
      }

      const pickup = await PickupService.acceptPickup(id, collectorId);

      res.status(200).json({
        success: true,
        data: pickup,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePickupStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const collectorId = req.user?.id;
      const role = req.user?.role;

      if (role !== 'collector' || !collectorId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only collectors can update pickup status',
        });
      }

      const pickup = await PickupService.updatePickupStatus(id, collectorId, status);

      res.status(200).json({
        success: true,
        data: pickup,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyPickupStub(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement verification logic and trigger Rewards module
      /* 
       * Expected Payload to send to Rewards Module:
       * {
       *   pickupId: req.params.id,
       *   userId: '<pickup.userId>',
       *   deviceId: '<pickup.deviceId>',
       *   category: '<device.category>',
       *   weight: <device.weight>
       * }
       */
      res.status(501).json({
        success: false,
        error: 'NOT_IMPLEMENTED',
        message: 'Verify endpoint is stubbed and not yet implemented',
      });
    } catch (error) {
      next(error);
    }
  }
}
