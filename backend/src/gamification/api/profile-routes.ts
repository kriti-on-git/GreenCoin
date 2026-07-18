import { Router, Request, Response } from 'express';
import { GamificationProfile } from '../models/gamification-profile.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let profile = await GamificationProfile.findOne({ userId: userId as any });
    if (!profile) {
      profile = await GamificationProfile.create({ userId: userId as any });
    }

    const badgeCount = profile.badgeCount || 0;

    const aggregatedProfile = {
      level: profile.level,
      xp: profile.xp,
      badgeCount
    };

    res.json({ success: true, data: aggregatedProfile });
  } catch (error) {
    logger.error('Fetch Profile Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
