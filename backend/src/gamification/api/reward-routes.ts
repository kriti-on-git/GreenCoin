import { Router } from 'express';
import { z } from 'zod';
import { RedemptionService } from '../rewards/redemption-service';
import { RewardCatalogModel } from '../models/reward-catalog.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

const redeemSchema = z.object({
  rewardId: z.string().min(1)
});

router.get('/', async (req, res) => {
  try {
    const rewards = await RewardCatalogModel.find({ isActive: true }).select('-_id -__v -createdAt -updatedAt');
    
    // Map rewardId back to id for frontend compatibility
    const mappedRewards = rewards.map(r => {
      const obj = r.toObject();
      return {
        id: obj.rewardId,
        name: obj.name,
        description: obj.description,
        coinCost: obj.coinCost,
        stock: obj.stock,
        type: obj.type
      };
    });

    res.json({ success: true, data: mappedRewards });
  } catch (error) {
    logger.error('Fetch Rewards Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.post('/redeem', requireAuth, async (req, res) => {
  try {
    const { rewardId } = redeemSchema.parse(req.body);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const result = await RedemptionService.redeemReward(userId, rewardId);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: (error as any).errors });
    }
    if (error.message === 'REWARD_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'Reward not found' });
    }
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(400).json({ success: false, error: 'Insufficient GreenCoins balance' });
    }
    logger.error('Redeem Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
