import { Router, Request, Response } from 'express';
import { LEVEL_THRESHOLDS } from '../rules/level-rules';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: LEVEL_THRESHOLDS
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Could not fetch levels'
    });
  }
});

export default router;
