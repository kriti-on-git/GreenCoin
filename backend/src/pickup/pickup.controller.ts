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
      
      // Check if collector is authorized to view this pickup
      if (role === 'collector') {
        const isRequested = pickup.status === 'Requested';
        const isAssignedToMe = pickup.collectorId?.toString() === userId;

        if (!isRequested && !isAssignedToMe) {
          return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'You are not authorized to view this pickup',
          });
        }
      }

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

  // TODO: Confirm with team — should the allowed role be 'admin' only, or also
  // 'recycler' / 'collection-center-staff'? Defaulting to 'admin' for now.
  static async verifyPickup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const role = req.user?.role;

      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only admins can verify pickups',
        });
      }

      const pickup = await PickupService.verifyPickup(id);

      res.status(200).json({
        success: true,
        data: pickup,
      });
    } catch (error) {
      next(error);
    }
  }
}
