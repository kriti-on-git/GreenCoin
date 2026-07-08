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
