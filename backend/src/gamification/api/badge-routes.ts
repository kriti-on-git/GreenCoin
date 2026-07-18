import { Router, Request, Response } from 'express';
import { UserBadge } from '../badges/user-badge.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const badges = await UserBadge.find({ userId: userId as any }).lean();
    res.json({ success: true, data: badges });
  } catch (error) {
    logger.error('Fetch Badges Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
