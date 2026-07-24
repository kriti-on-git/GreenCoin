import { Router, Request, Response } from 'express';
import { Leaderboard } from '../leaderboard/leaderboard.model';
import { requireAuth } from '../../middlewares/auth.middleware';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/v1/gamification/leaderboard
 * Fetches the ranked list for a given scope.
 * Query Params:
 *  - scope: string (default: 'global')
 *  - limit: number (default: 100)
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as string) || 'global';
    const limit = parseInt(req.query.limit as string, 10) || 100;

    // Validate scope
    const validScopes = ['global', 'city', 'college', 'company', 'campaign', 'friends'];
    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SCOPE',
        message: 'The provided scope is not valid.'
      });
    }

    const leaderboard = await Leaderboard.find({ scope: scope as any })
      .sort({ rank: 1, score: -1 }) // Sort by rank ascending, and score descending as fallback
      .limit(limit)
      .populate('userId', 'name avatar username') // Assuming User model has these fields
      .exec();

    return res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch leaderboard.'
    });
  }
});

export default router;
