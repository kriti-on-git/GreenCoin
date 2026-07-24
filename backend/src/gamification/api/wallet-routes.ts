import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { WalletService } from '../wallet/wallet.service';
import { z } from 'zod';

const router = Router();

const historyQuerySchema = z.object({
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 50),
  skip: z.string().optional().transform(v => v ? parseInt(v, 10) : 0),
});

// GET /api/v1/gamification/wallet
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const wallet = await WalletService.getWallet(userId);
    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/gamification/wallet/history
router.get('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const parsedQuery = historyQuerySchema.parse(req.query);
    
    const history = await WalletService.getTransactionHistory(userId, parsedQuery);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

export default router;
