import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
  }).strict(),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    role: z.enum(['user', 'collector', 'admin']).optional(),
  }),
});

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const isFieldNotEditable = error.issues.some((e: any) => e.code === 'unrecognized_keys');
        return res.status(400).json({
          success: false,
          error: isFieldNotEditable ? 'FIELD_NOT_EDITABLE' : 'VALIDATION_ERROR',
          message: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
      }
      return next(error);
    }
  };
};
