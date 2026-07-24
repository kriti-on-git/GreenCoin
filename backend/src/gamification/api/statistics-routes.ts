import { Router, Request, Response, NextFunction } from 'express';
import { UserStats } from '../models/user-stats.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User context missing' });
    }

    let stats = await UserStats.findOne({ userId: userId as any });

    if (!stats) {
      // If they haven't done anything yet, they might not have stats
      stats = new UserStats({
        userId,
        totalDevicesRecycled: 0,
        totalWeightRecycled: 0,
        currentStreak: 0,
        longestStreak: 0
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Could not fetch statistics'
    });
  }
});

export default router;
