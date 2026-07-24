import { Request, Response, NextFunction } from 'express';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // Developer mistake: auth.middleware.ts wasn't applied before requireRole
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'User context is missing. Ensure requireAuth middleware is applied before requireRole.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_ROLE',
        message: 'You do not have the required role to access this resource.',
      });
    }

    next();
  };
};
