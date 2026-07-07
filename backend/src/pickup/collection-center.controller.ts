import { Request, Response, NextFunction } from 'express';
import { CollectionCenterService } from './collection-center.service';

export class CollectionCenterController {
  static async listCollectionCenters(req: Request, res: Response, next: NextFunction) {
    try {
      const centers = await CollectionCenterService.listCollectionCenters();
      res.status(200).json({
        success: true,
        data: centers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCollectionCenter(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user?.role;
      
      // Admin only check
      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Only admins can create collection centers',
        });
      }

      const { name, location } = req.body;
      const center = await CollectionCenterService.createCollectionCenter(name, location);

      res.status(201).json({
        success: true,
        data: center,
      });
    } catch (error) {
      next(error);
    }
  }
}
