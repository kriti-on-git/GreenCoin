import { CollectionCenter, ICollectionCenter } from './pickup.model';
import { logger } from '../utils/logger';

export class CollectionCenterService {
  static async listCollectionCenters(): Promise<ICollectionCenter[]> {
    return CollectionCenter.find().exec();
  }

  static async createCollectionCenter(name: string, location: string): Promise<ICollectionCenter> {
    const center = new CollectionCenter({ name, location });
    await center.save();
    logger.info(`Collection center created: ${center._id} - ${name}`);
    return center;
  }
}
