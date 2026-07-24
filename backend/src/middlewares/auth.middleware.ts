import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt.util';

// Extend Express Request object to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'MISSING_TOKEN',
      message: 'Missing or invalid Authorization header'
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'The provided token is invalid or expired.'
    });
  }
};
