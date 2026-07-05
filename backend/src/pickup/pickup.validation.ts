import { z } from 'zod';
import { PickupStatus } from './pickup.model';
import mongoose from 'mongoose';

const objectIdValidator = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const createPickupSchema = z.object({
  body: z.object({
    pickupTime: z.string().datetime({ message: 'pickupTime must be a valid ISO 8601 datetime' }),
    device: z.object({
      category: z.string().min(1, 'Device category is required'),
      weight: z.number().positive('Device weight must be a positive number'),
    }),
  }),
});

export const getPickupsQuerySchema = z.object({
  query: z.object({
    userId: objectIdValidator.optional(),
    collectorId: objectIdValidator.optional(),
    status: z.nativeEnum(PickupStatus).optional(),
  }),
});

export const updatePickupStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(PickupStatus, { message: 'Invalid status provided' }),
  }),
});

// Utility middleware for validation
import { Request, Response, NextFunction } from 'express';

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
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        });
      }
      return next(error);
    }
  };
};
