import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from './auth.service';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Admin check: prevent self-assigning admin through registration
    if (role === 'admin') {
      return next({ statusCode: 403, errorCode: 'CANNOT_SELF_ASSIGN_ADMIN', message: 'Users cannot self-assign admin role' });
    }

    const { user, token } = await registerUser(name, email, password, role);
    
    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (error: any) {
    if (error.error === 'EMAIL_ALREADY_EXISTS') {
      return next({ statusCode: 409, errorCode: error.error, message: 'This email is already in use' });
    }
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginUser(email, password);
    
    res.status(200).json({
      success: true,
      data: { user, token },
    });
  } catch (error: any) {
    if (error.error === 'INVALID_CREDENTIALS') {
      return next({ statusCode: 401, errorCode: error.error, message: 'Invalid credentials' });
    }
    next(error);
  }
};
