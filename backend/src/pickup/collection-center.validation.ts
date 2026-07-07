import { z } from 'zod';

export const createCollectionCenterSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
  }),
});
