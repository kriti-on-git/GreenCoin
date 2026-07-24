import { Router, Request, Response } from 'express';
import { ChallengeModel } from '../models/challenge.model';
import { UserChallenge } from '../models/user-challenge.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Fetch active challenges from DB
    const activeChallengesFromDb = await ChallengeModel.find({ isActive: true });
    
    // Fetch user's active/completed challenges
    const userChallenges = await UserChallenge.find({ userId });
    
    // Map rules to their progress
    const activeChallenges = activeChallengesFromDb.map(ruleDb => {
      const rule = ruleDb.toObject();
      const userProg = userChallenges.find(uc => uc.challengeId === rule.challengeId);
      return {
        id: rule.challengeId,
        name: rule.name,
        description: rule.description,
        criteria: rule.criteria,
        rewardCoins: rule.rewardCoins,
        rewardBadgeId: rule.rewardBadgeId,
        startDate: rule.startDate,
        endDate: rule.endDate,
        progress: userProg ? userProg.progress : 0,
        status: userProg ? userProg.status : 'AVAILABLE'
      };
    });

    res.json({ success: true, data: activeChallenges });
  } catch (error) {
    logger.error('Fetch Challenges Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
