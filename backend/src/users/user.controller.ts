import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User context missing' });
      }

      const user = await UserService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User context missing' });
      }

      // Check for restricted fields explicitly for a clearer error message
      if ('email' in req.body || 'role' in req.body) {
        return res.status(400).json({
          success: false,
          error: 'FIELD_NOT_EDITABLE',
          message: 'Cannot update email or role through this endpoint',
        });
      }

      const { name } = req.body;
      const updatedUser = await UserService.updateUser(userId, { name });

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await UserService.getUserById(id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as string | undefined;
      const users = await UserService.listUsers({ role });

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }
}
