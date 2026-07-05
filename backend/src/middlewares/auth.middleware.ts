import { Request, Response, NextFunction } from 'express';

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

/**
 * TODO: This is a stub for the Authentication module middleware.
 * The Authentication module is being built by another developer.
 * Replace this stub once the actual JWT authentication middleware is available.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Authorization header'
    });
  }

  // Extract token for stub behavior (token = <role>_<userId>)
  const token = authHeader.split(' ')[1];
  
  if (token === 'valid_user_token') {
    req.user = { id: '60d5ecb54cb7c1a361c8d8b1', role: 'user' };
    return next();
  } else if (token === 'valid_collector_token') {
    req.user = { id: '60d5ecb54cb7c1a361c8d8b2', role: 'collector' };
    return next();
  } else if (token === 'valid_admin_token') {
    req.user = { id: '60d5ecb54cb7c1a361c8d8b3', role: 'admin' };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'INVALID_TOKEN',
    message: 'The provided token is invalid or expired.'
  });
};
